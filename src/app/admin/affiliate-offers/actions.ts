"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slug";

/**
 * Merchant mutations.
 *
 * Merchants are data rather than a hardcoded list, so adding Amazon, TikTok Shop
 * or a one-off manufacturer is a row created here — including the colours its
 * buy buttons wear on the public site.
 */

export type ActionState = { ok?: boolean; error?: string };

const NETWORKS = [
  "amazon",
  "tiktok_shop",
  "walmart",
  "target",
  "home_depot",
  "lowes",
  "impact",
  "cj",
  "shareasale",
  "awin",
  "rakuten",
  "direct",
] as const;

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Colours reach an inline style on the public button, so only a six-digit hex
 * is ever stored. The column has a matching check constraint — this is the
 * friendly half of the same rule.
 */
const hexColor = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^#[0-9a-f]{6}$/i.test(value),
    "Use a six-digit hex colour, like #ffd814.",
  );

const merchantSchema = z.object({
  id: z.string().uuid().nullable(),
  name: z.string().trim().min(2, "Merchant name is required.").max(120),
  slug: z.string().trim().min(2, "Slug is required.").max(120),
  network: z.enum(NETWORKS),
  homepageUrl: z
    .string()
    .trim()
    .max(300)
    .refine(
      (value) => value === "" || /^https?:\/\/\S+$/i.test(value),
      "Enter a full URL starting with http:// or https://",
    ),
  ctaLabel: z.string().trim().max(40),
  disclosureNote: z.string().trim().max(400),
  brandColor: hexColor,
  brandTextColor: hexColor,
  brandHoverColor: hexColor,
  status: z.enum(["draft", "review", "published", "archived"]),
});

export async function saveMerchant(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const parsed = merchantSchema.safeParse({
    id: readString(formData, "id").trim() || null,
    name: readString(formData, "name"),
    slug: readString(formData, "slug"),
    network: readString(formData, "network"),
    homepageUrl: readString(formData, "homepageUrl"),
    ctaLabel: readString(formData, "ctaLabel"),
    disclosureNote: readString(formData, "disclosureNote"),
    brandColor: readString(formData, "brandColor"),
    brandTextColor: readString(formData, "brandTextColor"),
    brandHoverColor: readString(formData, "brandHoverColor"),
    status: readString(formData, "status"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the merchant." };
  }

  const data = parsed.data;

  const row = {
    name: data.name,
    slug: slugify(data.slug),
    network: data.network,
    homepage_url: data.homepageUrl || null,
    cta_label: data.ctaLabel || null,
    disclosure_note: data.disclosureNote || null,
    brand_color: data.brandColor || null,
    brand_text_color: data.brandTextColor || null,
    brand_hover_color: data.brandHoverColor || null,
    status: data.status,
  };

  const { error } = data.id
    ? await supabase.from("affiliate_merchants").update(row).eq("id", data.id)
    : await supabase.from("affiliate_merchants").insert(row);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That merchant slug is already in use."
          : "Could not save that merchant.",
    };
  }

  revalidatePath("/admin/affiliate-offers");
  // Offers reference a merchant by slug and read its colours and CTA at render
  // time, so a branding change affects every product surface at once.
  revalidatePath("/products", "layout");
  revalidatePath("/best", "layout");
  return { ok: true };
}
