"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import type { MediaAsset, UploadTicket } from "@/types/media";

/**
 * Media library mutations.
 *
 * Uploads never pass through this server. A browser posting an 8 MB photo to a
 * Server Action would fail — Next caps action bodies at 1 MB by default and
 * Vercel caps request bodies at 4.5 MB — so instead `createUploadTicket` mints
 * a signed upload URL and the browser PUTs the bytes straight to Storage.
 *
 * That makes the browser the one choosing what to send, so the guards that
 * matter are not here: the path is chosen by this server and never accepted
 * from the client, and the bucket itself refuses anything that is not an image
 * under 8 MB regardless of what the upload claimed. No privileged credential is
 * ever handed to the browser — a signed URL is scoped to one path and expires.
 *
 * Every action re-checks the session through requireAdmin(): a Server Action is
 * a public HTTP endpoint and cannot rely on the page around it.
 */

export type MediaActionState = { ok?: boolean; error?: string };

const BUCKET = "media";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
const MAX_BYTES = 8 * 1024 * 1024;

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
    return { path: "", token: "", error: "Images must be 8 MB or smaller." };
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
/* Library                                                                     */
/* -------------------------------------------------------------------------- */

const detailsSchema = z.object({
  id: z.string().uuid(),
  altText: z.string().trim().max(300).nullable(),
  caption: z.string().trim().max(500).nullable(),
  credit: z.string().trim().max(200).nullable(),
  source: z
    .enum(["own", "business_provided", "licensed", "creator", "manufacturer", "other"])
    .nullable(),
  sourceUrl: z.string().trim().max(500).nullable(),
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
