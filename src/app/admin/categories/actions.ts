"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { slugify, uniqueSlug } from "@/lib/slug";

/**
 * Category mutations.
 *
 * The local taxonomy had no admin surface at all until now, which meant every
 * ranking was filed against a tree that could only be changed by hand in the
 * database. It is the one thing every piece of local content depends on.
 *
 * Kept separate from product categories on purpose: "what kind of place is
 * this" and "what kind of thing is this" are different questions, and merging
 * them would put pizza and beach blankets in one tree.
 */

export type CategoryActionState = { ok?: boolean; error?: string };

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
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(100),
  parentId: z.string().uuid().nullable(),
  description: z.string().trim().max(1000),
  heroMediaId: z.string().uuid().nullable(),
  heroImageUrl: z.string().trim().max(500),
  icon: z.string().trim().max(60),
  featured: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(200),
  status: z.enum(["draft", "review", "published", "archived"]),
});

export async function saveCategory(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const { supabase } = await requireAdmin();

  const parsed = schema.safeParse({
    id: readString(formData, "id"),
    name: readString(formData, "name"),
    slug: readString(formData, "slug"),
    parentId: readUuidOrNull(formData, "parentId"),
    description: readString(formData, "description"),
    heroMediaId: readUuidOrNull(formData, "heroMediaId"),
    heroImageUrl: readString(formData, "heroImageUrl"),
    icon: readString(formData, "icon"),
    featured: formData.get("featured") === "on",
    sortOrder: Number(readString(formData, "sortOrder") || "0"),
    seoTitle: readString(formData, "seoTitle"),
    seoDescription: readString(formData, "seoDescription"),
    status: readString(formData, "status"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const d = parsed.data;

  // A category cannot be its own parent. The database has no constraint for
  // this, and the result would be a page that links to itself forever.
  if (d.parentId === d.id) {
    return { error: "A category cannot be its own parent." };
  }

  const slug = slugify(d.slug);

  const { error } = await supabase
    .from("categories")
    .update({
      name: d.name,
      slug,
      parent_id: d.parentId,
      description: d.description || null,
      hero_media_id: d.heroMediaId,
      hero_image_url: d.heroMediaId ? null : d.heroImageUrl || null,
      icon: d.icon || null,
      featured: d.featured,
      sort_order: d.sortOrder,
      seo_title: d.seoTitle || null,
      seo_description: d.seoDescription || null,
      status: d.status,
    })
    .eq("id", d.id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That slug is already in use by another category."
          : "Could not save. Please try again.",
    };
  }

  revalidatePath("/admin/categories");
  revalidatePath(`/admin/categories/${d.id}`);
  revalidatePath(`/category/${slug}`);
  revalidatePath("/categories");
  // A featured category appears on the homepage, and its name shows in the
  // discovery blocks either way.
  revalidatePath("/");
  return { ok: true };
}

export async function createBlankCategory(): Promise<void> {
  const { supabase } = await requireAdmin();

  const { data: existing } = await supabase.from("categories").select("slug");
  const taken = new Set((existing ?? []).map((row: { slug: string }) => row.slug));

  const { data } = await supabase
    .from("categories")
    .insert({
      name: "New category",
      slug: uniqueSlug("new-category", taken),
      status: "draft",
    })
    .select("id")
    .single();

  revalidatePath("/admin/categories");
  if (data) redirect(`/admin/categories/${data.id}`);
}

/**
 * Deletes a category.
 *
 * Rankings and businesses reference it with ON DELETE SET NULL, so nothing is
 * destroyed on the way — they simply become uncategorised and can be refiled.
 * Child categories are re-parented to nothing rather than orphaned mid-tree.
 */
export async function deleteCategory(id: string): Promise<void> {
  const { supabase } = await requireAdmin();

  await supabase.from("categories").update({ parent_id: null }).eq("parent_id", id);
  await supabase.from("categories").delete().eq("id", id);

  revalidatePath("/admin/categories");
  revalidatePath("/categories");
  revalidatePath("/");
  redirect("/admin/categories");
}
