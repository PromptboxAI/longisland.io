"use server";

import { revalidatePath } from "next/cache";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/media/limits";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { fetchRemoteImage, MIME_EXTENSION } from "@/lib/media/fetch-remote";
import type { MediaAsset, MediaSource, UploadTicket } from "@/types/media";

/**
 * Media library mutations.
 *
 * Uploads never pass through this server. A browser posting a large photo to a
 * Server Action would fail — Next caps action bodies at 1 MB by default and
 * Vercel caps request bodies at 4.5 MB — so instead `createUploadTicket` mints
 * a signed upload URL and the browser PUTs the bytes straight to Storage.
 *
 * That makes the browser the one choosing what to send, so the guards that
 * matter are not here: the path is chosen by this server and never accepted
 * from the client, and the bucket itself refuses anything that is not an image
 * under the size limit regardless of what the upload claimed. No privileged
 * credential is ever handed to the browser — a signed URL is scoped to one path
 * and expires.
 *
 * Every action re-checks the session through requireAdmin(): a Server Action is
 * a public HTTP endpoint and cannot rely on the page around it.
 */

export type MediaActionState = { ok?: boolean; error?: string };

const BUCKET = "media";

const MAX_BYTES = MAX_UPLOAD_BYTES;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};


function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(formData: FormData, key: string): string | null {
  const value = readString(formData, key);
  return value.length > 0 ? value : null;
}

/* -------------------------------------------------------------------------- */
/* Upload                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Mints a one-path, short-lived upload URL.
 *
 * The path is built here from the date and a fresh uuid — never from the
 * filename, which would let a client aim at another object or smuggle a path
 * traversal through a crafted name. Dated folders keep the bucket browsable in
 * the Supabase dashboard; the asset is deliberately not filed under the record
 * that first used it, because the whole point of the library is that the same
 * file can belong to several.
 */
export async function createUploadTicket(
  mimeType: string,
  sizeBytes: number,
): Promise<UploadTicket> {
  const { supabase } = await requireAdmin();

  if (!ALLOWED_MIME.has(mimeType)) {
    return { path: "", token: "", error: "Images only — JPEG, PNG, WebP or AVIF." };
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_BYTES) {
    return {
      path: "",
      token: "",
      error: `Images must be ${MAX_UPLOAD_LABEL} or smaller.`,
    };
  }

  const now = new Date();
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const path = `${folder}/${crypto.randomUUID()}.${EXTENSION[mimeType]}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return { path: "", token: "", error: "Could not start the upload." };
  }

  return { path: data.path, token: data.token };
}

const registerSchema = z.object({
  storagePath: z.string().trim().min(1).max(400),
  filename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  sizeBytes: z.number().int().nonnegative().nullable(),
  altText: z.string().trim().max(300).nullable(),
});

/**
 * Records an uploaded object in the library.
 *
 * Called after the browser's PUT succeeds. The row is what makes the file
 * findable and reusable; an object with no row is orphaned rather than
 * dangerous, and shows up in the bucket rather than the picker.
 */
export async function registerUploadedAsset(input: {
  storagePath: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  altText: string | null;
}): Promise<{ asset?: MediaAsset; error?: string }> {
  const { supabase, user } = await requireAdmin();

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { error: "That upload could not be recorded." };

  const d = parsed.data;
  if (!ALLOWED_MIME.has(d.mimeType)) return { error: "Images only." };

  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      storage_path: d.storagePath,
      filename: d.filename,
      mime_type: d.mimeType,
      width: d.width,
      height: d.height,
      size_bytes: d.sizeBytes,
      alt_text: d.altText,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error || !data) return { error: "Could not save the image details." };

  revalidatePath("/admin/media");
  return { asset: data as MediaAsset };
}

/* -------------------------------------------------------------------------- */
/* Import from a URL                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Sources whose images land needing a human look before they publish.
 *
 * Only one entry today, and that is the point: everything we can name a
 * provenance story for is cleared on arrival, and the catch-all is not.
 */
const REVIEW_ON_ARRIVAL = new Set<MediaSource>(["other_editorial_source"]);

const IMPORTABLE_SOURCES = new Set<MediaSource>([
  "original",
  "business_provided",
  "licensed",
  "official_website",
  "official_instagram",
  "official_facebook",
  "other_editorial_source",
]);

const importSchema = z.object({
  imageUrl: z.string().trim().min(1).max(2000),
  sourcePageUrl: z.string().trim().max(2000).nullable(),
  sourceType: z.string().trim().min(1),
  credit: z.string().trim().max(200).nullable(),
  altText: z.string().trim().max(300).nullable(),
});

/**
 * Imports an image from a URL into the library, with its provenance.
 *
 * This is the deliberate replacement for a rule that read "never scraped". We
 * copy the bytes to our own bucket rather than hotlinking, which is the part
 * that matters practically — a hotlink is someone else's bandwidth, breaks the
 * day they reorganise their CDN, and lets them swap what our page shows.
 *
 * What we do NOT do is pretend the file is ours. `source` says where it came
 * from, `source_url` is the file, `source_page_url` is the page a person can
 * open to check, and none of it is optional for the sources that need it. An
 * asset with no provenance cannot be defended a year later, and the only moment
 * that information is cheap to record is now.
 */
export async function importMediaFromUrl(input: {
  imageUrl: string;
  sourcePageUrl: string | null;
  sourceType: string;
  credit: string | null;
  altText: string | null;
}): Promise<{ asset?: MediaAsset; error?: string; warning?: string }> {
  const { supabase, user } = await requireAdmin();

  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the image details." };
  const d = parsed.data;

  const sourceType = d.sourceType as MediaSource;
  if (!IMPORTABLE_SOURCES.has(sourceType)) {
    return { error: "Choose where this image came from." };
  }

  /*
   * A source page is required for anything taken from a business's channels.
   * It is the difference between a record we can stand behind and a URL to a
   * CDN blob that nobody can trace once the path rotates.
   */
  const needsSourcePage =
    sourceType === "official_website" ||
    sourceType === "official_instagram" ||
    sourceType === "official_facebook" ||
    sourceType === "other_editorial_source";

  if (needsSourcePage && !d.sourcePageUrl) {
    return { error: "Add the page this image came from." };
  }

  const fetched = await fetchRemoteImage(d.imageUrl);
  if (!fetched.ok) return { error: fetched.error };

  const { image } = fetched;

  // The path is built here and never from the remote filename, which is
  // attacker-controlled text and has no business shaping a storage key.
  const now = new Date();
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const path = `${folder}/${crypto.randomUUID()}.${MIME_EXTENSION[image.mimeType]}`;

  /*
   * Uploaded with the editor's own session, not a service key. The bucket's
   * admin-insert policy is what authorises it, so this path is exactly as
   * privileged as the browser upload beside it and no more.
   */
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, image.bytes, {
      contentType: image.mimeType,
      upsert: false,
    });

  if (uploadError) {
    return { error: "The image downloaded but could not be stored." };
  }

  const filename = filenameFromUrl(image.finalUrl, MIME_EXTENSION[image.mimeType]);
  const reviewState = REVIEW_ON_ARRIVAL.has(sourceType) ? "needs_review" : "ok";

  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      storage_path: path,
      filename,
      mime_type: image.mimeType,
      width: image.width,
      height: image.height,
      size_bytes: image.bytes.byteLength,
      alt_text: d.altText,
      source: sourceType,
      credit: d.credit,
      source_url: image.finalUrl,
      source_page_url: d.sourcePageUrl,
      review_state: reviewState,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error || !data) {
    // The object is already in the bucket; without a row it is unreachable
    // through the app, so take it back out rather than leaving a stray file.
    await supabase.storage.from(BUCKET).remove([path]);
    return { error: "Could not record the image details." };
  }

  revalidatePath("/admin/media");

  return {
    asset: data as MediaAsset,
    warning:
      reviewState === "needs_review"
        ? "Imported, but marked Needs review — clear it before this publishes."
        : undefined,
  };
}

/** A readable filename for the library listing, derived from the URL. */
function filenameFromUrl(url: string, extension: string): string {
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
    const cleaned = last.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
    if (!cleaned) return `imported.${extension}`;
    return /\.[a-z0-9]{3,4}$/i.test(cleaned) ? cleaned : `${cleaned}.${extension}`;
  } catch {
    return `imported.${extension}`;
  }
}

/* -------------------------------------------------------------------------- */
/* Takedown                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Removes an image on request, and remembers that we did.
 *
 * A published promise to take imagery down is worth nothing without a button
 * that does it. Deleting the asset row detaches it from every record that used
 * it — each reference is `on delete set null` — and the object leaves the
 * bucket, so the file stops being served rather than merely stopping being
 * linked.
 *
 * The log is written FIRST and outlives the row. It is the answer to "you
 * ignored us", and it is what stops the same URL being re-imported next month
 * by someone who never heard about the complaint.
 */
export async function takedownMediaAsset(
  assetId: string,
  reason: string,
): Promise<MediaActionState> {
  const { supabase, user } = await requireAdmin();

  const { data: asset } = await supabase
    .from("media_assets")
    .select("id, filename, storage_path, source, source_url, source_page_url")
    .eq("id", assetId)
    .maybeSingle();

  if (!asset) return { error: "That image could not be found." };
  const a = asset as {
    id: string;
    filename: string;
    storage_path: string;
    source: string | null;
    source_url: string | null;
    source_page_url: string | null;
  };

  const { error: logError } = await supabase.from("media_takedowns").insert({
    media_asset_id: a.id,
    filename: a.filename,
    storage_path: a.storage_path,
    source: a.source,
    source_url: a.source_url,
    source_page_url: a.source_page_url,
    reason: reason.trim() || null,
    actioned_by: user.id,
  });

  if (logError) return { error: "Could not record the takedown. Nothing removed." };

  const { error: deleteError } = await supabase
    .from("media_assets")
    .delete()
    .eq("id", assetId);

  if (deleteError) return { error: "Could not remove that image." };

  // Best effort, and deliberately after the row: an object with no row is
  // invisible to the site, whereas a row pointing at a deleted object is a
  // broken image on a public page.
  await supabase.storage.from(BUCKET).remove([a.storage_path]);

  revalidatePath("/admin/media");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Clears the needs-review flag once a person has looked at the image. */
export async function clearMediaReview(
  assetId: string,
  note: string | null,
): Promise<MediaActionState> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("media_assets")
    .update({ review_state: "ok", review_note: note?.trim() || null })
    .eq("id", assetId);

  if (error) return { error: "Could not clear that review." };

  revalidatePath("/admin/media");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Library                                                                     */
/* -------------------------------------------------------------------------- */

const detailsSchema = z.object({
  id: z.string().uuid(),
  altText: z.string().trim().max(300).nullable(),
  caption: z.string().trim().max(500).nullable(),
  credit: z.string().trim().max(200).nullable(),
  source: z
    .enum([
      "original",
      "business_provided",
      "licensed",
      "official_website",
      "official_instagram",
      "official_facebook",
      "other_editorial_source",
      "creator",
      "manufacturer",
      "other",
    ])
    .nullable(),
  sourceUrl: z.string().trim().max(500).nullable(),
  sourcePageUrl: z.string().trim().max(500).nullable(),
  license: z.string().trim().max(200).nullable(),
  permissionNote: z.string().trim().max(1000).nullable(),
  focalX: z.number().min(0).max(1),
  focalY: z.number().min(0).max(1),
});

export async function saveMediaDetails(
  _prev: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  const { supabase } = await requireAdmin();

  const parsed = detailsSchema.safeParse({
    id: readString(formData, "id"),
    altText: readNullableString(formData, "altText"),
    caption: readNullableString(formData, "caption"),
    credit: readNullableString(formData, "credit"),
    source: readNullableString(formData, "source"),
    sourceUrl: readNullableString(formData, "sourceUrl"),
    sourcePageUrl: readNullableString(formData, "sourcePageUrl"),
    license: readNullableString(formData, "license"),
    permissionNote: readNullableString(formData, "permissionNote"),
    focalX: Number(readString(formData, "focalX") || "0.5"),
    focalY: Number(readString(formData, "focalY") || "0.5"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the image details." };
  }
  const d = parsed.data;

  const { error } = await supabase
    .from("media_assets")
    .update({
      alt_text: d.altText,
      caption: d.caption,
      credit: d.credit,
      source: d.source,
      source_url: d.sourceUrl,
      source_page_url: d.sourcePageUrl,
      license: d.license,
      permission_note: d.permissionNote,
      focal_x: d.focalX,
      focal_y: d.focalY,
    })
    .eq("id", d.id);

  if (error) return { error: "Could not save those details." };

  revalidatePath("/admin/media");
  // Alt text and credit are read wherever the asset renders, so a correction
  // here has to reach the public pages rather than waiting out the ISR window.
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Archives an asset instead of deleting it.
 *
 * Archiving takes it out of the picker without breaking a published page that
 * already uses it — a hard delete would leave a live article pointing at a
 * missing file, and the person who notices is a reader, not an editor.
 */
export async function setMediaStatus(
  id: string,
  status: "active" | "archived",
): Promise<void> {
  const { supabase } = await requireAdmin();
  await supabase.from("media_assets").update({ status }).eq("id", id);
  revalidatePath("/admin/media");
}

/**
 * Edits an asset's descriptive fields from wherever the image is being used.
 *
 * Alt text is written by whoever is looking at the picture, and that person is
 * in the ranking editor, not in the media library. Sending them elsewhere to
 * add it is how images end up shipping without any — the label said "add it in
 * the Media library" and the honest response to that is to not bother.
 *
 * The values still belong to the ASSET, so a correction here is a correction
 * everywhere the image appears. That is the point of the library.
 */
export async function saveMediaMetadata(
  id: string,
  values: { altText: string; caption: string; credit: string },
): Promise<MediaActionState> {
  const { supabase } = await requireAdmin();

  const parsed = z
    .object({
      id: z.string().uuid(),
      altText: z.string().trim().max(300),
      caption: z.string().trim().max(500),
      credit: z.string().trim().max(200),
    })
    .safeParse({ id, ...values });

  if (!parsed.success) return { error: "Check those details." };

  const { error } = await supabase
    .from("media_assets")
    .update({
      alt_text: parsed.data.altText || null,
      caption: parsed.data.caption || null,
      credit: parsed.data.credit || null,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: "Could not save those details." };

  revalidatePath("/admin/media");
  // Alt text and credit render wherever the asset does.
  revalidatePath("/", "layout");
  return { ok: true };
}
