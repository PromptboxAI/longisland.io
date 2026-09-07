"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { slugify, uniqueSlug } from "@/lib/slug";

/**
 * Product and offer mutations.
 *
 * Every action re-checks the session through requireAdmin() — a Server Action is
 * a public HTTP endpoint, so it cannot rely on the page around it having been
 * authorised. RLS is the final boundary underneath.
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
 * An outbound link we are willing to store.
 *
 * Restricted to http and https so a stored `javascript:` or `data:` URL can
 * never reach an href. Editor-entered rather than user-entered, but a buy button
 * is the one place on this site that sends a reader somewhere else, and it is
 * cheap to be certain.
 */
const outboundUrl = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (value) => value === "" || /^https?:\/\/\S+$/i.test(value),
    "Enter a full URL starting with http:// or https://",
  );

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

const productSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2, "Name is required.").max(200),
  slug: z.string().trim().min(3, "Slug is required.").max(120),
  brand: z.string().trim().max(120),
  categoryId: z.string().uuid().nullable(),
  shortDescription: z.string().trim().max(600),
  editorialSummary: z.string().trim().max(2000),
  imageUrl: outboundUrl,
  imageMediaId: z.string().uuid().nullable(),
  status: z.enum(["draft", "review", "published", "archived"]),
  featured: z.boolean(),
});

export async function saveProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const parsed = productSchema.safeParse({
    id: readString(formData, "id"),
    name: readString(formData, "name"),
    slug: readString(formData, "slug"),
    brand: readString(formData, "brand"),
    categoryId: readUuidOrNull(formData, "categoryId"),
    shortDescription: readString(formData, "shortDescription"),
    editorialSummary: readString(formData, "editorialSummary"),
    imageUrl: readString(formData, "imageUrl"),
    imageMediaId: readString(formData, "imageMediaId") || null,
    status: readString(formData, "status"),
    featured: formData.get("featured") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const data = parsed.data;

  const { error } = await supabase
    .from("products")
    .update({
      name: data.name,
      slug: slugify(data.slug),
      brand: data.brand || null,
      category_id: data.categoryId,
      short_description: data.shortDescription || null,
      editorial_summary: data.editorialSummary || null,
      image_media_id: data.imageMediaId,
      image_url: data.imageMediaId ? null : data.imageUrl || null,
      status: data.status,
      featured: data.featured,
    })
    .eq("id", data.id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That slug is already in use by another product."
          : "Could not save. Please try again.",
    };
  }

  revalidatePath(`/admin/products/${data.id}`);
  revalidatePath("/admin/products");
  // A product can appear in any number of guides and modules, so the whole
  // product surface is revalidated rather than tracking every host page.
  revalidatePath("/products", "layout");
  return { ok: true };
}

export async function createBlankProduct(): Promise<void> {
  const { supabase } = await requireAdmin();

  const { data: existing } = await supabase.from("products").select("slug");
  const taken = new Set((existing ?? []).map((row: { slug: string }) => row.slug));

  const { data } = await supabase
    .from("products")
    .insert({
      name: "Untitled product",
      slug: uniqueSlug("untitled-product", taken),
      status: "draft",
    })
    .select("id")
    .single();

  revalidatePath("/admin/products");
  if (data) redirect(`/admin/products/${data.id}`);
}

export async function deleteProduct(id: string): Promise<void> {
  const { supabase } = await requireAdmin();

  // Offers cascade; guide entries and recommendations cascade too, so removing
  // a product removes it from every list it appeared on rather than leaving a
  // gap an editor has to hunt for.
  await supabase.from("products").delete().eq("id", id);

  revalidatePath("/admin/products");
  revalidatePath("/products", "layout");
  redirect("/admin/products");
}

/* -------------------------------------------------------------------------- */
/* Offers                                                                      */
/* -------------------------------------------------------------------------- */

const offerSchema = z
  .object({
    offerId: z.string().uuid().nullable(),
    productId: z.string().uuid(),
    merchant: z.string().trim().min(1, "Pick a merchant."),
    merchantProductId: z.string().trim().max(200),
    affiliateUrl: outboundUrl,
    directUrl: outboundUrl,
    price: z.string().trim().max(20),
    currency: z.string().trim().min(3).max(3),
    availability: z.enum(["in_stock", "out_of_stock", "preorder", "discontinued", ""]),
  })
  .refine((data) => data.affiliateUrl !== "" || data.directUrl !== "", {
    message: "An offer needs an affiliate URL, a direct URL, or both.",
    path: ["affiliateUrl"],
  });

export async function saveOffer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const parsed = offerSchema.safeParse({
    offerId: readUuidOrNull(formData, "offerId"),
    productId: readString(formData, "productId"),
    merchant: readString(formData, "merchant"),
    merchantProductId: readString(formData, "merchantProductId"),
    affiliateUrl: readString(formData, "affiliateUrl"),
    directUrl: readString(formData, "directUrl"),
    price: readString(formData, "price"),
    currency: readString(formData, "currency") || "USD",
    availability: readString(formData, "availability"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the offer." };
  }

  const data = parsed.data;

  const priceValue = data.price === "" ? null : Number.parseFloat(data.price);
  if (priceValue !== null && (Number.isNaN(priceValue) || priceValue < 0)) {
    return { error: "Enter a price as a number, or leave it blank." };
  }

  const row = {
    product_id: data.productId,
    merchant: data.merchant,
    merchant_product_id: data.merchantProductId || null,
    affiliate_url: data.affiliateUrl || null,
    direct_url: data.directUrl || null,
    price: priceValue,
    currency: data.currency.toUpperCase(),
    availability: data.availability || null,
    // Saving the offer IS checking it. Stamping here rather than asking the
    // editor for a date is what keeps the freshness rule honest: the timestamp
    // records when a person last looked, which is exactly what it claims.
    last_checked_at: new Date().toISOString(),
  };

  const { error } = data.offerId
    ? await supabase.from("product_offers").update(row).eq("id", data.offerId)
    : await supabase.from("product_offers").insert(row);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "This product already has an offer from that merchant."
          : "Could not save that offer.",
    };
  }

  revalidatePath(`/admin/products/${data.productId}`);
  revalidatePath("/admin/affiliate-offers");
  revalidatePath("/products", "layout");
  return { ok: true };
}

export async function removeOffer(
  offerId: string,
  productId: string,
): Promise<void> {
  const { supabase } = await requireAdmin();

  await supabase.from("product_offers").delete().eq("id", offerId);

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/affiliate-offers");
  revalidatePath("/products", "layout");
}
