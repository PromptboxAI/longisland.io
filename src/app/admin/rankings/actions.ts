"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { slugify, uniqueSlug } from "@/lib/slug";

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
