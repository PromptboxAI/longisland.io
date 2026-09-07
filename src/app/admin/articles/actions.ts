"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { slugify, uniqueSlug } from "@/lib/slug";

/**
 * Article mutations.
 *
 * Articles are the general editorial content type — a seasonal guide, a weekend
 * feature, an event roundup. They exist so none of those has to be faked as a
 * ranking, which would have put a list of businesses where a story belongs and
 * a "How we chose" methodology on a piece that chose nothing.
 */

export type ArticleActionState = { ok?: boolean; error?: string };

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readUuidOrNull(formData: FormData, key: string): string | null {
  const value = readString(formData, key);
  return value.length > 0 ? value : null;
}

const schema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(4).max(200),
  slug: z.string().trim().min(3).max(100),
  kind: z.enum(["article", "guide", "feature", "seasonal", "news", "deal", "roundup"]),
  categoryId: z.string().uuid().nullable(),
  placeId: z.string().uuid().nullable(),
  dek: z.string().trim().max(500),
  body: z.string().trim().max(60000),
  heroMediaId: z.string().uuid().nullable(),
  heroImageUrl: z.string().trim().max(500),
  heroImageAlt: z.string().trim().max(300),
  authorName: z.string().trim().max(120),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(200),
  ogImageMediaId: z.string().uuid().nullable(),
});

export async function saveArticle(
  _prev: ArticleActionState,
  formData: FormData,
): Promise<ArticleActionState> {
  const { supabase } = await requireAdmin();

  const parsed = schema.safeParse({
    id: readString(formData, "id"),
    title: readString(formData, "title"),
    slug: readString(formData, "slug"),
    kind: readString(formData, "kind"),
    categoryId: readUuidOrNull(formData, "categoryId"),
    placeId: readUuidOrNull(formData, "placeId"),
    dek: readString(formData, "dek"),
    body: readString(formData, "body"),
    heroMediaId: readUuidOrNull(formData, "heroMediaId"),
    heroImageUrl: readString(formData, "heroImageUrl"),
    heroImageAlt: readString(formData, "heroImageAlt"),
    authorName: readString(formData, "authorName"),
    seoTitle: readString(formData, "seoTitle"),
    seoDescription: readString(formData, "seoDescription"),
    ogImageMediaId: readUuidOrNull(formData, "ogImageMediaId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const d = parsed.data;
  const slug = slugify(d.slug);

  const { error } = await supabase
    .from("articles")
    .update({
      title: d.title,
      slug,
      kind: d.kind,
      category_id: d.categoryId,
      place_id: d.placeId,
      dek: d.dek || null,
      body: d.body || null,
      hero_media_id: d.heroMediaId,
      hero_image_url: d.heroMediaId ? null : d.heroImageUrl || null,
      hero_image_alt: d.heroImageAlt || null,
      author_name: d.authorName || null,
      seo_title: d.seoTitle || null,
      seo_description: d.seoDescription || null,
      og_image_media_id: d.ogImageMediaId,
    })
    .eq("id", d.id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That slug is already in use by another article."
          : "Could not save. Please try again.",
    };
  }

  revalidatePath(`/admin/articles/${d.id}`);
  revalidatePath("/admin/articles");
  revalidatePath(`/articles/${slug}`);
  revalidatePath("/articles");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Publishes or withdraws an article.
 *
 * `published_at` is stamped on the first publish and kept afterwards, so
 * withdrawing to fix a typo and republishing does not move the piece to the top
 * of Latest as though it were new.
 */
export async function setArticleStatus(
  id: string,
  status: "draft" | "review" | "published" | "archived",
): Promise<void> {
  const { supabase } = await requireAdmin();

  const { data: current } = await supabase
    .from("articles")
    .select("slug, published_at")
    .eq("id", id)
    .maybeSingle();

  const row = current as { slug: string; published_at: string | null } | null;

  await supabase
    .from("articles")
    .update({
      status,
      published_at:
        status === "published" && !row?.published_at
          ? new Date().toISOString()
          : (row?.published_at ?? null),
    })
    .eq("id", id);

  revalidatePath(`/admin/articles/${id}`);
  revalidatePath("/admin/articles");
  if (row?.slug) revalidatePath(`/articles/${row.slug}`);
  revalidatePath("/articles");
  revalidatePath("/");
}

/**
 * Creates a blank record and opens it.
 *
 * `returnTo` is threaded through so an editor who came here from an editorial
 * placement — because the thing they wanted to curate did not exist yet — gets
 * a way back to that placement once they have made it. Without it the trip is
 * one-way and they land on a list with no memory of why.
 */
export async function createBlankArticle(formData?: FormData): Promise<void> {
  // Read from the form rather than an argument: these are used directly as
  // `<form action={...}>`, which hands the action FormData and nothing else.
  const returnTo = formData?.get("returnTo");
  const { supabase } = await requireAdmin();

  const { data: existing } = await supabase.from("articles").select("slug");
  const taken = new Set((existing ?? []).map((row: { slug: string }) => row.slug));

  const { data } = await supabase
    .from("articles")
    .insert({
      title: "Untitled article",
      slug: uniqueSlug("untitled-article", taken),
      status: "draft",
    })
    .select("id")
    .single();

  revalidatePath("/admin/articles");
  if (data) {
    // Only an internal path travels onward; an absolute URL here would make a
    // shared admin link an open redirect.
    const path = typeof returnTo === "string" ? returnTo : null;
    const safe = path?.startsWith("/") && !path.startsWith("//") ? path : null;
    redirect(
      safe
        ? `/admin/articles/${data.id}?returnTo=${encodeURIComponent(safe)}`
        : `/admin/articles/${data.id}`,
    );
  }
}

export async function deleteArticle(id: string): Promise<void> {
  const { supabase } = await requireAdmin();

  // Curated placements cascade with the article, so a deleted piece cannot
  // leave a dead slot in a section.
  await supabase.from("articles").delete().eq("id", id);

  revalidatePath("/admin/articles");
  revalidatePath("/articles");
  revalidatePath("/");
  redirect("/admin/articles");
}
