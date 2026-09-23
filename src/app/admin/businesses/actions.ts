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

/* -------------------------------------------------------------------------- */
/* Deletion                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Deletes several businesses together.
 *
 * There was no way to delete a business at all before this, and the reason to
 * be careful is the same reason it was left out: a business is a SHARED record.
 * Rankings point at it, and deleting one that appears on a list would punch a
 * hole straight through that list — including a published one.
 *
 * So the first guard is not the business's own status, it is whether anything
 * uses it. A business on a ranking is refused with the ranking named, because
 * "still used somewhere" sends an editor hunting and "on 10 Best Pizza Places
 * near Stony Brook" does not.
 *
 * This is the inverse of the rule on the other side: deleting a RANKING never
 * deletes the businesses on it, and deleting a business is never allowed to
 * damage a ranking. The shared record survives its lists; the lists survive it.
 */
export async function deleteBusinesses(
  ids: string[],
): Promise<{ ok?: boolean; error?: string; deleted?: number }> {
  const { supabase } = await requireAdmin();

  const wanted = [...new Set(ids)].filter(Boolean);
  if (wanted.length === 0) return { error: "Nothing was selected." };

  const { data } = await supabase
    .from("businesses")
    .select("id, name, slug, status")
    .in("id", wanted);

  const rows = (data ?? []) as {
    id: string;
    name: string;
    slug: string;
    status: string;
  }[];
  if (rows.length !== wanted.length) {
    return {
      error:
        "That selection is out of date — something in it no longer exists. Reload and try again.",
    };
  }

  /*
   * Named with the list it is on, not just flagged as in use.
   *
   * The embed reaches through the entry to the ranking's title so the message
   * can say where to go. An editor who is told "still on a ranking" has to open
   * every list to find out which.
   */
  const { data: entries } = await supabase
    .from("ranking_entries")
    .select("business_id, ranking:rankings(title)")
    .in("business_id", wanted);

  const onLists = new Map<string, Set<string>>();
  for (const row of (entries ?? []) as unknown as {
    business_id: string;
    ranking: { title: string } | null;
  }[]) {
    const titles = onLists.get(row.business_id) ?? new Set<string>();
    if (row.ranking?.title) titles.add(row.ranking.title);
    onLists.set(row.business_id, titles);
  }

  if (onLists.size > 0) {
    const detail = rows
      .filter((row) => onLists.has(row.id))
      .map((row) => {
        const titles = [...(onLists.get(row.id) ?? [])];
        return titles.length > 0
          ? `"${row.name}" is on ${titles.map((t) => `"${t}"`).join(", ")}`
          : `"${row.name}" is on a ranking`;
      })
      .join("; ");
    return {
      error: `${detail}. Remove it from there first — deleting it would leave a gap in that list.`,
    };
  }

  const { data: placed } = await supabase
    .from("editorial_section_items")
    .select("business_id")
    .in("business_id", wanted);

  const used = new Set(
    ((placed ?? []) as { business_id: string }[]).map((r) => r.business_id),
  );
  if (used.size > 0) {
    const names = rows
      .filter((row) => used.has(row.id))
      .map((row) => `"${row.name}"`)
      .join(", ");
    return { error: `${names} is placed on the site. Remove it from that placement first.` };
  }

  const live = rows.filter((row) => row.status === "published");
  if (live.length > 0) {
    return {
      error: `Unpublish ${live
        .map((row) => `"${row.name}"`)
        .join(", ")} before deleting. That takes it off the site straight away and is undoable; deleting is not.`,
    };
  }

  const { error } = await supabase.from("businesses").delete().in("id", wanted);
  if (error) return { error: "Could not delete those businesses." };

  revalidatePath("/admin/businesses");
  for (const row of rows) revalidatePath(`/business/${row.slug}`);
  revalidatePath("/category/[slug]", "page");
  revalidatePath("/place/[slug]", "page");
  revalidatePath("/");
  return { ok: true, deleted: rows.length };
}
