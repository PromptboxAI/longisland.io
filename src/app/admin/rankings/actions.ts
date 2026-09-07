"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { businessSlug, slugify, uniqueSlug } from "@/lib/slug";

/**
 * Ranking editor mutations.
 *
 * Every action re-checks the session through requireAdmin() — a Server Action
 * is a public HTTP endpoint, so it cannot rely on the page around it having
 * been authorised. RLS is the final boundary underneath.
 */

const detailsSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(4).max(200),
  slug: z.string().trim().min(3).max(100),
  categoryId: z.string().uuid().nullable(),
  placeId: z.string().uuid().nullable(),
  geography: z.string().trim().max(120),
  description: z.string().trim().max(500),
  intro: z.string().trim().max(5000),
  methodology: z.string().trim().max(5000),
  authorName: z.string().trim().max(120),
  heroMediaId: z.string().uuid().nullable(),
  heroImageUrl: z.string().trim().max(500),
  ogImageMediaId: z.string().uuid().nullable(),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(200),
});

export type ActionState = { ok?: boolean; error?: string };

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readUuidOrNull(formData: FormData, key: string): string | null {
  const value = readString(formData, key).trim();
  return value.length > 0 ? value : null;
}

export async function saveRankingDetails(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const parsed = detailsSchema.safeParse({
    id: readString(formData, "id"),
    title: readString(formData, "title"),
    slug: readString(formData, "slug"),
    categoryId: readUuidOrNull(formData, "categoryId"),
    placeId: readUuidOrNull(formData, "placeId"),
    geography: readString(formData, "geography"),
    description: readString(formData, "description"),
    intro: readString(formData, "intro"),
    methodology: readString(formData, "methodology"),
    authorName: readString(formData, "authorName"),
    heroMediaId: readUuidOrNull(formData, "heroMediaId"),
    heroImageUrl: readString(formData, "heroImageUrl"),
    ogImageMediaId: readUuidOrNull(formData, "ogImageMediaId"),
    seoTitle: readString(formData, "seoTitle"),
    seoDescription: readString(formData, "seoDescription"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const data = parsed.data;

  const { error } = await supabase
    .from("rankings")
    .update({
      title: data.title,
      slug: slugify(data.slug),
      category_id: data.categoryId,
      place_id: data.placeId,
      geography: data.geography || null,
      description: data.description || null,
      intro: data.intro || null,
      methodology: data.methodology || null,
      author_name: data.authorName || null,
      hero_media_id: data.heroMediaId,
      // The uploaded asset wins; the pasted URL only survives when there is no
      // asset, which is what the field itself enforces on the client too.
      hero_image_url: data.heroMediaId ? null : data.heroImageUrl || null,
      og_image_media_id: data.ogImageMediaId,
      seo_title: data.seoTitle || null,
      seo_description: data.seoDescription || null,
    })
    .eq("id", data.id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That slug is already in use by another ranking."
          : "Could not save. Please try again.",
    };
  }

  revalidatePath(`/admin/rankings/${data.id}`);
  revalidatePath("/admin/rankings");
  revalidatePath(`/best/${slugify(data.slug)}`);
  revalidatePath("/best");
  revalidatePath("/");
  return { ok: true };
}

export async function setRankingStatus(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<void> {
  const { supabase } = await requireAdmin();

  const { data: current } = await supabase
    .from("rankings")
    .select("published_at, slug")
    .eq("id", id)
    .maybeSingle();

  await supabase
    .from("rankings")
    .update({
      status,
      // Stamp the first publication only, so re-publishing an edit does not
      // reset the article's original date.
      published_at:
        status === "published" && !current?.published_at
          ? new Date().toISOString()
          : (current?.published_at ?? null),
    })
    .eq("id", id);

  revalidatePath(`/admin/rankings/${id}`);
  revalidatePath("/admin/rankings");
  if (current?.slug) revalidatePath(`/best/${current.slug}`);
  revalidatePath("/best");
  revalidatePath("/");
}

const entrySchema = z.object({
  entryId: z.string().uuid(),
  editorialReason: z.string().trim().max(2000),
  bestFor: z.string().trim().max(200),
  badge: z.string().trim().max(60),
  editorNotes: z.string().trim().max(2000),
});

export async function saveEntry(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const parsed = entrySchema.safeParse({
    entryId: readString(formData, "entryId"),
    editorialReason: readString(formData, "editorialReason"),
    bestFor: readString(formData, "bestFor"),
    badge: readString(formData, "badge"),
    editorNotes: readString(formData, "editorNotes"),
  });

  if (!parsed.success) {
    return { error: "Could not save that entry." };
  }

  const rankingId = readString(formData, "rankingId");

  const { error } = await supabase
    .from("ranking_entries")
    .update({
      editorial_reason: parsed.data.editorialReason || null,
      best_for: parsed.data.bestFor || null,
      badge: parsed.data.badge || null,
      editor_notes: parsed.data.editorNotes || null,
    })
    .eq("id", parsed.data.entryId);

  if (error) return { error: "Could not save that entry." };

  revalidatePath(`/admin/rankings/${rankingId}`);
  return { ok: true };
}

/**
 * Moves an entry one position up or down.
 *
 * Positions are swapped through a temporary negative value because
 * (ranking_id, position) collisions would otherwise be possible mid-swap.
 */
/* -------------------------------------------------------------------------- */
/* Adding entries                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Puts a business into a ranking.
 *
 * Until now the only way a ranking gained entries was the Yelp workbench, which
 * always creates a NEW ranking from whatever the search returned. That made
 * three ordinary editorial acts impossible: adding a place Yelp does not list,
 * swapping one entry for another, and reopening a draft to change who is on it.
 * It also left `createBlankRanking` producing a ranking that could never gain a
 * single entry.
 *
 * Yelp is candidate discovery. This is the door that makes that true rather
 * than aspirational — nothing about the final list depends on what a third
 * party returned.
 *
 * The entry is appended at the end and the editor reorders from there, so
 * arrival order never quietly becomes the published order.
 */
export async function addEntry(
  rankingId: string,
  businessId: string,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const { data: existing } = await supabase
    .from("ranking_entries")
    .select("id, position, business_id")
    .eq("ranking_id", rankingId)
    .order("position");

  const rows = (existing ?? []) as { id: string; position: number; business_id: string }[];

  if (rows.some((row) => row.business_id === businessId)) {
    return { error: "That business is already on this list." };
  }

  const nextPosition = rows.length > 0 ? rows[rows.length - 1].position + 1 : 1;

  const { error } = await supabase.from("ranking_entries").insert({
    ranking_id: rankingId,
    business_id: businessId,
    position: nextPosition,
  });

  if (error) return { error: "Could not add that business." };

  revalidatePath(`/admin/rankings/${rankingId}`);
  return { ok: true };
}

const newBusinessSchema = z.object({
  name: z.string().trim().min(2).max(200),
  city: z.string().trim().max(120),
});

/**
 * Creates a business and adds it in one step.
 *
 * The case this exists for is specific: an editor knows a place belongs on the
 * list and Yelp did not return it. Making them leave for /admin/businesses,
 * create a record, come back and find it again is the kind of friction that
 * ends with the list being published without it.
 *
 * The business is created as a draft with only a name and a town — enough to
 * rank it — and the profile is filled in afterwards. Its own status still
 * governs whether it appears publicly, so an unfinished profile cannot leak
 * through a published ranking.
 */
export async function createBusinessAndAddEntry(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const rankingId = readString(formData, "rankingId");
  const parsed = newBusinessSchema.safeParse({
    name: readString(formData, "name"),
    city: readString(formData, "city"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Give the business a name." };
  }
  const d = parsed.data;

  const { data: taken } = await supabase.from("businesses").select("slug");
  const takenSlugs = new Set((taken ?? []).map((row: { slug: string }) => row.slug));

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .insert({
      name: d.name,
      slug: uniqueSlug(businessSlug(d.name, d.city || null), takenSlugs),
      city: d.city || null,
      status: "draft",
    })
    .select("id")
    .single();

  if (businessError || !business) return { error: "Could not create that business." };

  const added = await addEntry(rankingId, business.id as string);
  if (added.error) return added;

  revalidatePath("/admin/businesses");
  return { ok: true };
}

export async function moveEntry(
  entryId: string,
  rankingId: string,
  direction: "up" | "down",
): Promise<void> {
  const { supabase } = await requireAdmin();

  const { data: entries } = await supabase
    .from("ranking_entries")
    .select("id, position")
    .eq("ranking_id", rankingId)
    .order("position");

  if (!entries) return;

  const list = entries as { id: string; position: number }[];
  const index = list.findIndex((entry) => entry.id === entryId);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= list.length) return;

  const current = list[index];
  const other = list[swapIndex];

  await supabase
    .from("ranking_entries")
    .update({ position: -1 })
    .eq("id", current.id);
  await supabase
    .from("ranking_entries")
    .update({ position: current.position })
    .eq("id", other.id);
  await supabase
    .from("ranking_entries")
    .update({ position: other.position })
    .eq("id", current.id);

  revalidatePath(`/admin/rankings/${rankingId}`);
}

/**
 * Persists a complete new order.
 *
 * Drag-and-drop moves an entry from 1 to 10 in one gesture, which the pairwise
 * swap behind the up/down buttons cannot express — nine swaps would each be a
 * separate write with nine chances to interleave badly.
 *
 * Positions are renormalised to 1..n from the order given, so a list stays
 * coherent no matter what it looked like before: gaps left by a deletion close,
 * and duplicates introduced by two editors working at once resolve to whatever
 * the last save says.
 *
 * Ids not belonging to this ranking are dropped rather than trusted, and any
 * entry the caller omitted is appended in its existing order rather than
 * silently losing its place.
 */
export async function reorderEntries(
  rankingId: string,
  orderedEntryIds: string[],
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const { data: existing } = await supabase
    .from("ranking_entries")
    .select("id, position")
    .eq("ranking_id", rankingId)
    .order("position");

  const rows = (existing ?? []) as { id: string; position: number }[];
  const known = new Set(rows.map((row) => row.id));

  const ordered = orderedEntryIds.filter((id) => known.has(id));
  const missing = rows.map((row) => row.id).filter((id) => !ordered.includes(id));
  const final = [...ordered, ...missing];

  if (final.length !== rows.length) {
    return { error: "That order did not match this list. Reload and try again." };
  }

  /*
   * Two passes, because `position` has no unique constraint but the intent is
   * that it behaves like one: writing 1..n directly over 1..n would briefly
   * give two rows the same position, and any read landing in between would see
   * a list that never existed. Negatives are outside the range the UI can ever
   * produce, so the parking pass cannot collide with a real value.
   */
  for (const [index, id] of final.entries()) {
    await supabase
      .from("ranking_entries")
      .update({ position: -(index + 1) })
      .eq("id", id);
  }
  for (const [index, id] of final.entries()) {
    await supabase
      .from("ranking_entries")
      .update({ position: index + 1 })
      .eq("id", id);
  }

  revalidatePath(`/admin/rankings/${rankingId}`);
  return { ok: true };
}

export async function removeEntry(
  entryId: string,
  rankingId: string,
): Promise<void> {
  const { supabase } = await requireAdmin();

  await supabase.from("ranking_entries").delete().eq("id", entryId);

  // Close the gap so positions stay 1..n.
  const { data: remaining } = await supabase
    .from("ranking_entries")
    .select("id")
    .eq("ranking_id", rankingId)
    .order("position");

  const list = (remaining ?? []) as { id: string }[];
  for (const [index, entry] of list.entries()) {
    await supabase
      .from("ranking_entries")
      .update({ position: index + 1 })
      .eq("id", entry.id);
  }

  revalidatePath(`/admin/rankings/${rankingId}`);
}

export async function createBlankRanking(): Promise<void> {
  const { supabase } = await requireAdmin();

  const { data: existing } = await supabase.from("rankings").select("slug");
  const taken = new Set((existing ?? []).map((row: { slug: string }) => row.slug));

  const { data } = await supabase
    .from("rankings")
    .insert({
      title: "Untitled ranking",
      slug: uniqueSlug("untitled-ranking", taken),
      status: "draft",
    })
    .select("id")
    .single();

  revalidatePath("/admin/rankings");
  if (data) redirect(`/admin/rankings/${data.id}`);
}
