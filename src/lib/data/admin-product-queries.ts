import "server-only";

import { requireAdmin } from "@/lib/auth";
import { sortOffers } from "@/lib/affiliate";
import type { Category } from "@/types/database";
import type {
  AffiliateMerchant,
  ContentProductRecommendation,
  OfferWithMerchant,
  Product,
  ProductCategory,
  ProductOffer,
  ProductRanking,
  ProductRankingEntry,
  ProductRankingEntryWithProduct,
  ProductRankingWithEntries,
  ProductWithOffers,
  RecommendationContentType,
  RecommendedProduct,
} from "@/types/products";

/**
 * Admin reads for the product and affiliate layer.
 *
 * These use the authenticated server client, so RLS grants access to draft rows
 * the public queries cannot see. Every function calls requireAdmin() first,
 * which redirects to the login page when there is no session.
 *
 * Unlike the public module there is no seed fallback here: an editor looking at
 * an empty products table needs to see that it is empty, not fixtures they
 * cannot edit.
 */

type ProductRow = Product & { offers: ProductOffer[] | null };

async function merchantMap(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
): Promise<Map<string, AffiliateMerchant>> {
  const { data } = await supabase.from("affiliate_merchants").select("*");
  return new Map(
    ((data ?? []) as AffiliateMerchant[]).map((merchant) => [merchant.slug, merchant]),
  );
}

function joinOffers(
  product: Product,
  offers: ProductOffer[],
  merchants: Map<string, AffiliateMerchant>,
): ProductWithOffers {
  const joined: OfferWithMerchant[] = offers.map((offer) => ({
    ...offer,
    merchantRecord: merchants.get(offer.merchant) ?? null,
  }));
  return { ...product, offers: sortOffers(joined) };
}

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

export interface AdminProduct extends Product {
  category: Pick<ProductCategory, "name" | "slug"> | null;
  offer_count: number;
}

export async function listAdminProducts(
  options: {
    status?: string;
    categoryId?: string;
    query?: string;
    limit?: number;
  } = {},
): Promise<AdminProduct[]> {
  const { supabase } = await requireAdmin();

  let request = supabase
    .from("products")
    .select("*, category:product_categories(name, slug), product_offers(count)")
    .order("updated_at", { ascending: false })
    .limit(options.limit ?? 100);

  if (options.status) request = request.eq("status", options.status);
  if (options.categoryId) request = request.eq("category_id", options.categoryId);
  if (options.query) request = request.ilike("name", `%${options.query}%`);

  const { data } = await request;

  type Row = Product & {
    category: { name: string; slug: string } | null;
    product_offers: { count: number }[];
  };

  return ((data ?? []) as Row[]).map((row) => ({
    ...row,
    offer_count: row.product_offers?.[0]?.count ?? 0,
  }));
}

export async function getAdminProduct(id: string): Promise<ProductWithOffers | null> {
  const { supabase } = await requireAdmin();

  const [{ data }, merchants] = await Promise.all([
    supabase
      .from("products")
      .select("*, offers:product_offers(*)")
      .eq("id", id)
      .maybeSingle(),
    merchantMap(supabase),
  ]);

  if (!data) return null;

  const row = data as unknown as ProductRow;
  return joinOffers(row, row.offers ?? [], merchants);
}

/**
 * Product search for the pickers — the guide entry adder and the recommended
 * products editor. Published and draft alike, since an editor builds a guide
 * before anything in it is public.
 */
export async function searchAdminProducts(
  query: string,
  limit = 12,
): Promise<Product[]> {
  const { supabase } = await requireAdmin();

  const trimmed = query.trim();
  let request = supabase.from("products").select("*").order("name").limit(limit);

  if (trimmed) {
    // Name or brand, so "Dunecrest" finds everything that brand makes.
    request = request.or(`name.ilike.%${trimmed}%,brand.ilike.%${trimmed}%`);
  }

  const { data } = await request;
  return (data ?? []) as Product[];
}

/* -------------------------------------------------------------------------- */
/* Offers and merchants                                                        */
/* -------------------------------------------------------------------------- */

export interface AdminOffer extends ProductOffer {
  product: Pick<Product, "id" | "name" | "slug" | "status"> | null;
  merchantRecord: AffiliateMerchant | null;
}

/** Every offer across every product, for the affiliate offers queue. */
export async function listAdminOffers(
  options: { merchant?: string; limit?: number } = {},
): Promise<AdminOffer[]> {
  const { supabase } = await requireAdmin();

  let request = supabase
    .from("product_offers")
    .select("*, product:products(id, name, slug, status)")
    .order("updated_at", { ascending: false })
    .limit(options.limit ?? 200);

  if (options.merchant) request = request.eq("merchant", options.merchant);

  const [{ data }, merchants] = await Promise.all([request, merchantMap(supabase)]);

  type Row = ProductOffer & {
    product: Pick<Product, "id" | "name" | "slug" | "status"> | null;
  };

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    ...row,
    merchantRecord: merchants.get(row.merchant) ?? null,
  }));
}

export async function listAdminMerchants(): Promise<AffiliateMerchant[]> {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("affiliate_merchants")
    .select("*")
    .order("name");
  return (data ?? []) as AffiliateMerchant[];
}

export async function listAdminProductCategories(): Promise<ProductCategory[]> {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("product_categories")
    .select("*")
    .order("name");
  return (data ?? []) as ProductCategory[];
}

/* -------------------------------------------------------------------------- */
/* Buying guides                                                               */
/* -------------------------------------------------------------------------- */

export interface AdminProductGuide extends ProductRanking {
  category: Pick<ProductCategory, "name" | "slug"> | null;
  entry_count: number;
}

export async function listAdminProductGuides(
  options: { status?: string; query?: string; limit?: number } = {},
): Promise<AdminProductGuide[]> {
  const { supabase } = await requireAdmin();

  let request = supabase
    .from("product_rankings")
    .select("*, category:product_categories(name, slug), product_ranking_entries(count)")
    .order("updated_at", { ascending: false });

  if (options.status) request = request.eq("status", options.status);
  if (options.query) request = request.ilike("title", `%${options.query}%`);
  if (options.limit) request = request.limit(options.limit);

  const { data } = await request;

  type Row = ProductRanking & {
    category: { name: string; slug: string } | null;
    product_ranking_entries: { count: number }[];
  };

  return ((data ?? []) as Row[]).map((row) => ({
    ...row,
    entry_count: row.product_ranking_entries?.[0]?.count ?? 0,
  }));
}

export async function getAdminProductGuide(
  id: string,
): Promise<ProductRankingWithEntries | null> {
  const { supabase } = await requireAdmin();

  const [{ data }, merchants] = await Promise.all([
    supabase
      .from("product_rankings")
      .select(
        "*, category:product_categories(*), localCategory:categories(id, name, slug), " +
          "hero_media:media_assets!product_rankings_hero_media_id_fkey(*), " +
          "og_media:media_assets!product_rankings_og_image_media_id_fkey(*), " +
          "entries:product_ranking_entries(*, product:products(*, offers:product_offers(*), image_media:media_assets!products_image_media_id_fkey(*)))",
      )
      .eq("id", id)
      .maybeSingle(),
    merchantMap(supabase),
  ]);

  if (!data) return null;

  type EntryRow = ProductRankingEntry & { product: ProductRow | null };
  const row = data as unknown as ProductRankingWithEntries & { entries: EntryRow[] };

  const entries: ProductRankingEntryWithProduct[] = [...(row.entries ?? [])]
    .filter((entry) => entry.product)
    .sort((a, b) => a.position - b.position)
    .map((entry) => ({
      ...entry,
      product: joinOffers(
        entry.product as ProductRow,
        (entry.product as ProductRow).offers ?? [],
        merchants,
      ),
    }));

  return { ...row, entries };
}

/** Local categories, for the cross-link selector on a guide. */
export async function listAdminLocalCategories(): Promise<Category[]> {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("categories").select("*").order("name");
  return (data ?? []) as Category[];
}

/* -------------------------------------------------------------------------- */
/* Recommendation modules                                                      */
/* -------------------------------------------------------------------------- */

/** The products attached to one host page, drafts included. */
export async function getAdminRecommendations(
  contentType: RecommendationContentType,
  contentId: string,
): Promise<RecommendedProduct[]> {
  const { supabase } = await requireAdmin();

  const [{ data }, merchants] = await Promise.all([
    supabase
      .from("content_product_recommendations")
      .select("*, product:products(*, offers:product_offers(*))")
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .order("position"),
    merchantMap(supabase),
  ]);

  type Row = ContentProductRecommendation & { product: ProductRow | null };

  return ((data ?? []) as unknown as Row[])
    .filter((row) => row.product)
    .map((row) => ({
      ...row,
      product: joinOffers(
        row.product as ProductRow,
        (row.product as ProductRow).offers ?? [],
        merchants,
      ),
    }));
}
