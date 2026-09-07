"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { businessSlug, slugify, uniqueSlug } from "@/lib/slug";

export type BusinessActionState = { ok?: boolean; error?: string };

const businessSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(100),
  address: z.string().trim().max(300),
  city: z.string().trim().max(120),
  county: z.string().trim().max(120),
  zip: z.string().trim().max(20),
  phone: z.string().trim().max(40),
  website: z.string().trim().max(300),
  categoryId: z.string().uuid().nullable(),
  subcategory: z.string().trim().max(120),
  description: z.string().trim().max(2000),
  editorialSummary: z.string().trim().max(2000),
  primaryImageUrl: z.string().trim().max(500),
  primaryMediaId: z.string().uuid().nullable(),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(200),
  status: z.enum(["draft", "review", "published", "archived"]),
  featured: z.boolean(),
  claimed: z.boolean(),
});

function readUuidOrNull(formData: FormData, key: string): string | null {
  const value = readString(formData, key).trim();
  return value.length > 0 ? value : null;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function saveBusiness(
  _prev: BusinessActionState,
  formData: FormData,
): Promise<BusinessActionState> {
  const { supabase } = await requireAdmin();

  const categoryId = readString(formData, "categoryId").trim();

  const parsed = businessSchema.safeParse({
    id: readString(formData, "id"),
    name: readString(formData, "name"),
    slug: readString(formData, "slug"),
    address: readString(formData, "address"),
    city: readString(formData, "city"),
    county: readString(formData, "county"),
    zip: readString(formData, "zip"),
    phone: readString(formData, "phone"),
    website: readString(formData, "website"),
    categoryId: categoryId.length > 0 ? categoryId : null,
    subcategory: readString(formData, "subcategory"),
    description: readString(formData, "description"),
    editorialSummary: readString(formData, "editorialSummary"),
    primaryImageUrl: readString(formData, "primaryImageUrl"),
    primaryMediaId: readUuidOrNull(formData, "primaryMediaId"),
    seoTitle: readString(formData, "seoTitle"),
    seoDescription: readString(formData, "seoDescription"),
    status: readString(formData, "status") || "draft",
    featured: formData.get("featured") === "on",
    claimed: formData.get("claimed") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const data = parsed.data;

  const { error } = await supabase
    .from("businesses")
    .update({
      name: data.name,
      slug: slugify(data.slug),
      address: data.address || null,
      city: data.city || null,
      county: data.county || null,
      zip: data.zip || null,
      phone: data.phone || null,
      website: data.website || null,
      category_id: data.categoryId,
      subcategory: data.subcategory || null,
      description: data.description || null,
      editorial_summary: data.editorialSummary || null,
      primary_media_id: data.primaryMediaId,
      // The uploaded asset wins; a pasted URL only survives without one.
      primary_image_url: data.primaryMediaId ? null : data.primaryImageUrl || null,
      seo_title: data.seoTitle || null,
      seo_description: data.seoDescription || null,
      status: data.status,
      featured: data.featured,
      claimed: data.claimed,
    })
    .eq("id", data.id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That slug is already used by another business."
          : "Could not save. Please try again.",
    };
  }

  revalidatePath(`/admin/businesses/${data.id}`);
  revalidatePath("/admin/businesses");
  revalidatePath(`/business/${slugify(data.slug)}`);
  return { ok: true };
}

export async function createBlankBusiness(): Promise<void> {
  const { supabase } = await requireAdmin();

  const { data: existing } = await supabase.from("businesses").select("slug");
  const taken = new Set((existing ?? []).map((row: { slug: string }) => row.slug));

  const { data } = await supabase
    .from("businesses")
    .insert({
      name: "New business",
      slug: uniqueSlug(businessSlug("new business"), taken),
      status: "draft",
    })
    .select("id")
    .single();

  revalidatePath("/admin/businesses");
  if (data) redirect(`/admin/businesses/${data.id}`);
}

/* -------------------------------------------------------------------------- */
/* Private contact details                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Saves the private contact record for a business.
 *
 * Kept in `business_contacts`, which no public query can reach — every public
 * select on `businesses` uses `*`, so an email column there would travel into
 * the payload of every listing and profile page on the site. A separate
 * admin-only table makes that impossible by construction rather than by
 * everyone remembering.
 *
 * Upsert rather than update: most businesses have no contact row until the
 * first time somebody writes one.
 */
export async function saveBusinessContact(
  businessId: string,
  values: { email: string; contactName: string; phone: string; notes: string },
): Promise<BusinessActionState> {
  const { supabase } = await requireAdmin();

  const email = values.email.trim();
  // Deliberately loose. This is a note to ourselves, not a login, and refusing
  // "sales@ (ask for Dave)" helps nobody.
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "That does not look like an email address." };
  }

  const { error } = await supabase.from("business_contacts").upsert(
    {
      business_id: businessId,
      email: email || null,
      contact_name: values.contactName.trim() || null,
      phone: values.phone.trim() || null,
      notes: values.notes.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id" },
  );

  if (error) return { error: "Could not save those contact details." };

  // Nothing public renders these, so only the admin view needs refreshing.
  revalidatePath(`/admin/businesses/${businessId}`);
  return { ok: true };
}
