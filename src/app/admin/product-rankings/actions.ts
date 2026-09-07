"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { slugify, uniqueSlug } from "@/lib/slug";

/**
 * Buying guide mutations.
 *
 * Mirrors app/admin/rankings/actions.ts, including the position-swap dance and
 * the publish-once timestamp, so the two editors behave identically. Every
 * action re-checks the session through requireAdmin().
 */

export type ActionState = { ok?: boolean; error?: string };

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readUuidOrNull(formData: FormData, key: string): string | null {
  const value = readString(formData, key).trim();
  return value.length > 0 ? value : null;
}

/**
 * A textarea of one item per line becomes a jsonb array.
 *
 * Blank lines are dropped and each item is capped, so a pasted paragraph cannot
 * turn into a single enormous "pro".
 */
function readList(formData: FormData, key: string, max = 8): string[] {
  return readString(formData, key)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, max)
    .map((line) => line.slice(0, 160));
}

/* -------------------------------------------------------------------------- */
/* Guide details                                                               */
/* -------------------------------------------------------------------------- */

const detailsSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(4, "Title is required.").max(200),
  slug: z.string().trim().min(3, "Slug is required.").max(120),
  categoryId: z.string().uuid().nullable(),
  localCategoryId: z.string().uuid().nullable(),
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

export async function saveGuideDetails(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const parsed = detailsSchema.safeParse({
    id: readString(formData, "id"),
    title: readString(formData, "title"),
    slug: readString(formData, "slug"),
    categoryId: readUuidOrNull(formData, "categoryId"),
    localCategoryId: readUuidOrNull(formData, "localCategoryId"),
    description: readString(formData, "description"),
    intro: readString(formData, "intro"),
    methodology: readString(formData, "methodology"),
    authorName: readString(formData, "authorName"),
    heroMediaId: readString(formData, "heroMediaId") || null,
    heroImageUrl: readString(formData, "heroImageUrl"),
    ogImageMediaId: readString(formData, "ogImageMediaId") || null,
    seoTitle: readString(formData, "seoTitle"),
    seoDescription: readString(formData, "seoDescription"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const data = parsed.data;

  const { error } = await supabase
    .from("product_rankings")
    .update({
      title: data.title,
      slug: slugify(data.slug),
      category_id: data.categoryId,
      local_category_id: data.localCategoryId,
      description: data.description || null,
      intro: data.intro || null,
      methodology: data.methodology || null,
      author_name: data.authorName || null,
      hero_media_id: data.heroMediaId,
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
          ? "That slug is already in use by another guide."
          : "Could not save. Please try again.",
    };
  }

  revalidatePath(`/admin/product-rankings/${data.id}`);
  revalidatePath("/admin/product-rankings");
  return { ok: true };
}

export async function setGuideStatus(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<void> {
  const { supabase } = await requireAdmin();

  const { data: current } = await supabase
    .from("product_rankings")
    .select("published_at, slug")
    .eq("id", id)
    .maybeSingle();

  await supabase
    .from("product_rankings")
    .update({
      status,
      // Stamp the first publication only, so re-publishing an edit does not
      // reset the guide's original date.
      published_at:
        status === "published" && !current?.published_at
          ? new Date().toISOString()
          : (current?.published_at ?? null),
    })
    .eq("id", id);

  revalidatePath(`/admin/product-rankings/${id}`);
  revalidatePath("/admin/product-rankings");
  if (current?.slug) revalidatePath(`/products/${current.slug}`);
  revalidatePath("/products");
}

export async function createBlankGuide(): Promise<void> {
  const { supabase } = await requireAdmin();

  const { data: existing } = await supabase.from("product_rankings").select("slug");
  const taken = new Set((existing ?? []).map((row: { slug: string }) => row.slug));

  const { data } = await supabase
    .from("product_rankings")
    .insert({
      title: "Untitled buying guide",
      slug: uniqueSlug("untitled-buying-guide", taken),
      status: "draft",
    })
    .select("id")
    .single();

  revalidatePath("/admin/product-rankings");
  if (data) redirect(`/admin/product-rankings/${data.id}`);
}

/* -------------------------------------------------------------------------- */
/* Entries                                                                     */
/* -------------------------------------------------------------------------- */

const entrySchema = z.object({
  entryId: z.string().uuid(),
  badge: z.string().trim().max(60),
  bestFor: z.string().trim().max(200),
  editorialReason: z.string().trim().max(2000),
});

export async function saveGuideEntry(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const parsed = entrySchema.safeParse({
    entryId: readString(formData, "entryId"),
    badge: readString(formData, "badge"),
    bestFor: readString(formData, "bestFor"),
    editorialReason: readString(formData, "editorialReason"),
  });

  if (!parsed.success) return { error: "Could not save that entry." };

  const guideId = readString(formData, "guideId");

  const { error } = await supabase
    .from("product_ranking_entries")
    .update({
      badge: parsed.data.badge || null,
      best_for: parsed.data.bestFor || null,
      editorial_reason: parsed.data.editorialReason || null,
      pros: readList(formData, "pros"),
      cons: readList(formData, "cons"),
    })
    .eq("id", parsed.data.entryId);

  if (error) return { error: "Could not save that entry." };

  revalidatePath(`/admin/product-rankings/${guideId}`);
  return { ok: true };
}

/** Adds a product to the end of a guide. */
export async function addProductToGuide(
  guideId: string,
  productId: string,
): Promise<void> {
  const { supabase } = await requireAdmin();

  const { data: existing } = await supabase
    .from("product_ranking_entries")
    .select("position")
    .eq("product_ranking_id", guideId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition =
    ((existing ?? [])[0] as { position: number } | undefined)?.position ?? 0;

  await supabase.from("product_ranking_entries").insert({
    product_ranking_id: guideId,
    product_id: productId,
    position: nextPosition + 1,
  });

  revalidatePath(`/admin/product-rankings/${guideId}`);
}

/**
 * Moves an entry one position up or down.
 *
 * Positions are swapped through a temporary negative value because
 * (product_ranking_id, position) collisions would otherwise be possible
 * mid-swap.
 */
export async function moveGuideEntry(
  entryId: string,
  guideId: string,
  direction: "up" | "down",
): Promise<void> {
  const { supabase } = await requireAdmin();

  const { data: entries } = await supabase
    .from("product_ranking_entries")
    .select("id, position")
    .eq("product_ranking_id", guideId)
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
    .from("product_ranking_entries")
    .update({ position: -1 })
    .eq("id", current.id);
  await supabase
    .from("product_ranking_entries")
    .update({ position: current.position })
    .eq("id", other.id);
  await supabase
    .from("product_ranking_entries")
    .update({ position: other.position })
    .eq("id", current.id);

  revalidatePath(`/admin/product-rankings/${guideId}`);
}

export async function removeGuideEntry(
  entryId: string,
  guideId: string,
): Promise<void> {
  const { supabase } = await requireAdmin();

  await supabase.from("product_ranking_entries").delete().eq("id", entryId);

  // Close the gap so positions stay 1..n.
  const { data: remaining } = await supabase
    .from("product_ranking_entries")
    .select("id")
    .eq("product_ranking_id", guideId)
    .order("position");

  const list = (remaining ?? []) as { id: string }[];
  for (const [index, entry] of list.entries()) {
    await supabase
      .from("product_ranking_entries")
      .update({ position: index + 1 })
      .eq("id", entry.id);
  }

  revalidatePath(`/admin/product-rankings/${guideId}`);
}
