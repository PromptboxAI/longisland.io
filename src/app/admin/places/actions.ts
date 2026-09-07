"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { slugify, uniqueSlug } from "@/lib/slug";

/**
 * Place mutations.
 *
 * Geography is half of every ranking title we publish — Pizza in Stony Brook,
 * Roofers in Suffolk County — and until now a new town could only be added by
 * hand in the database. The hierarchy already existed in the schema; this is
 * the surface that lets an editor use it.
 *
 * A place scopes a ranking; it never duplicates a business. One pizzeria stays
 * one row and appears in the island list, the county list and the town list
 * through separate ranking entries.
 */

export type PlaceActionState = { ok?: boolean; error?: string };

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
  type: z.enum(["island", "county", "region", "town", "village", "hamlet"]),
  parentId: z.string().uuid().nullable(),
  county: z.string().trim().max(120),
  description: z.string().trim().max(1000),
  heroMediaId: z.string().uuid().nullable(),
  heroImageUrl: z.string().trim().max(500),
  featured: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(200),
  status: z.enum(["draft", "review", "published", "archived"]),
});

export async function savePlace(
  _prev: PlaceActionState,
  formData: FormData,
): Promise<PlaceActionState> {
  const { supabase } = await requireAdmin();

  const parsed = schema.safeParse({
    id: readString(formData, "id"),
    name: readString(formData, "name"),
    slug: readString(formData, "slug"),
    type: readString(formData, "type"),
    parentId: readUuidOrNull(formData, "parentId"),
    county: readString(formData, "county"),
    description: readString(formData, "description"),
    heroMediaId: readUuidOrNull(formData, "heroMediaId"),
    heroImageUrl: readString(formData, "heroImageUrl"),
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

  if (d.parentId === d.id) {
    return { error: "A place cannot be inside itself." };
  }

  const slug = slugify(d.slug);

  const { error } = await supabase
    .from("places")
    .update({
      name: d.name,
      slug,
      type: d.type,
      parent_id: d.parentId,
      county: d.county || null,
      description: d.description || null,
      hero_media_id: d.heroMediaId,
      hero_image_url: d.heroMediaId ? null : d.heroImageUrl || null,
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
          ? "That slug is already in use by another place."
          : "Could not save. Please try again.",
    };
  }

  revalidatePath("/admin/places");
  revalidatePath(`/admin/places/${d.id}`);
  revalidatePath(`/place/${slug}`);
  revalidatePath("/places");
  revalidatePath("/");
  return { ok: true };
}

export async function createBlankPlace(): Promise<void> {
  const { supabase } = await requireAdmin();

  const { data: existing } = await supabase.from("places").select("slug");
  const taken = new Set((existing ?? []).map((row: { slug: string }) => row.slug));

  const { data } = await supabase
    .from("places")
    .insert({
      name: "New place",
      slug: uniqueSlug("new-place", taken),
      type: "town",
      status: "draft",
    })
    .select("id")
    .single();

  revalidatePath("/admin/places");
  if (data) redirect(`/admin/places/${data.id}`);
}

export async function deletePlace(id: string): Promise<void> {
  const { supabase } = await requireAdmin();

  await supabase.from("places").update({ parent_id: null }).eq("parent_id", id);
  await supabase.from("places").delete().eq("id", id);

  revalidatePath("/admin/places");
  revalidatePath("/places");
  revalidatePath("/");
  redirect("/admin/places");
}
