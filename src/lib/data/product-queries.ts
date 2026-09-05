import "server-only";

import {
  SEED_CATEGORIES,
  SEED_MERCHANTS,
  SEED_PRODUCTS,
  SEED_PRODUCT_CATEGORIES,
  SEED_PRODUCT_OFFERS,
  SEED_PRODUCT_RANKINGS,
  SEED_PRODUCT_RANKING_ENTRIES,
  SEED_PRODUCT_RECOMMENDATIONS,
} from "@/lib/data/seed";
import { createPublicClient } from "@/lib/supabase/public";
import { sortOffers } from "@/lib/affiliate";
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
  ProductRankingSummary,
  ProductRankingWithEntries,
  ProductWithOffers,
  RecommendationContentType,
  RecommendedProduct,
} from "@/types/products";

/**
 * Server-side data access for the public product and affiliate layer.
 *
 * Deliberately a sibling of ./queries.ts rather than an extension of it: the
 * commerce tables arrive in a later migration than the local ones, so this
 * module probes for its own schema and falls back to its own seed content. A
 * database that has the local schema but not the product schema renders the
 * local site live and the product site from fixtures, which is exactly the state
 * the repository is in between the two `supabase db push` runs.
 *
 * Public reads rely on RLS: the anon key only sees published rows, so nothing
 * here filters on status defensively.
 */

/* -------------------------------------------------------------------------- */
/* Schema probe                                                                */
/* -------------------------------------------------------------------------- */

let productSchemaReady: Promise<boolean> | null = null;

async function hasProductSchema(
  client: NonNullable<ReturnType<typeof createPublicClient>>,
): Promise<boolean> {
  productSchemaReady ??= (async () => {
    // A plain GET, deliberately not `head: true` — PostgREST sends no body on
    // HEAD, so a missing table comes back as a misleading 204 with no error.
    const { error } = await client.from("products").select("id").limit(1);

    if (error?.code === "PGRST205") {
      console.warn(
        "[longisland] Product schema not found — serving seed products. " +
          "Apply supabase/migrations/2026020100000* to switch to live data.",
      );
      return false;
    }
    return true;
  })();

  return productSchemaReady;
}

/** Supabase client, or null when we should read from seed content instead. */
async function getDb() {
  const client = createPublicClient();
  if (!client) return null;
  return (await hasProductSchema(client)) ? client : null;
}

/* -------------------------------------------------------------------------- */
/* Shared shaping                                                              */
/* -------------------------------------------------------------------------- */

/** PostgREST returns embedded rows; this is the shape we ask it for. */
type ProductRow = Product & { offers: ProductOffer[] | null };

/**
 * Joins offers to their merchant rows and orders them.
 *
 * Offers reference a merchant by slug rather than by foreign key, so the join
 * happens here rather than in the query. A missing merchant row is survivable —
 * the offer still renders, using a title-cased slug for its name.
 */
function withOffers(
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

const seedMerchantsBySlug = new Map(SEED_MERCHANTS.map((m) => [m.slug, m]));
const seedProductById = new Map(SEED_PRODUCTS.map((p) => [p.id, p]));
const seedProductCategoryById = new Map(
  SEED_PRODUCT_CATEGORIES.map((c) => [c.id, c]),
);
const seedLocalCategoryById = new Map(SEED_CATEGORIES.map((c) => [c.id, c]));

/** The local category a seed guide cross-links to, when it names one. */
function seedLocalCategory(
  localCategoryId: string | null,
): { id: string; name: string; slug: string } | null {
  if (!localCategoryId) return null;

  const category = seedLocalCategoryById.get(localCategoryId);
  if (!category) return null;

  return { id: category.id, name: category.name, slug: category.slug };
}

function seedOffersFor(productId: string): ProductOffer[] {
  return SEED_PRODUCT_OFFERS.filter((offer) => offer.product_id === productId);
}

function seedProductWithOffers(productId: string): ProductWithOffers | null {
  const product = seedProductById.get(productId);
  if (!product) return null;
  return withOffers(product, seedOffersFor(productId), seedMerchantsBySlug);
}

/** Fetches the published merchant rows, keyed by slug. */
async function loadMerchants(
  supabase: NonNullable<Awaited<ReturnType<typeof getDb>>>,
): Promise<Map<string, AffiliateMerchant>> {
  const { data } = await supabase.from("affiliate_merchants").select("*");
  return new Map(
    ((data ?? []) as AffiliateMerchant[]).map((merchant) => [merchant.slug, merchant]),
  );
}

/* -------------------------------------------------------------------------- */
/* Product categories                                                          */
/* -------------------------------------------------------------------------- */

export async function listProductCategories(): Promise<ProductCategory[]> {
  const supabase = await getDb();
  if (!supabase) return SEED_PRODUCT_CATEGORIES;

  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .order("name");

  if (error || !data) return SEED_PRODUCT_CATEGORIES;
  return data as ProductCategory[];
}

/* -------------------------------------------------------------------------- */
/* Buying guides                                                               */
/* -------------------------------------------------------------------------- */

export interface ListProductGuidesOptions {
  categorySlug?: string;
  /** Free-text match against the title. */
  query?: string;
  limit?: number;
}

function seedGuideSummary(guide: ProductRanking): ProductRankingSummary {
  const category = guide.category_id
    ? (seedProductCategoryById.get(guide.category_id) ?? null)
    : null;

  return {
    id: guide.id,
    title: guide.title,
    slug: guide.slug,
    description: guide.description,
    author_name: guide.author_name,
    published_at: guide.published_at,
    updated_at: guide.updated_at,
    entry_count: SEED_PRODUCT_RANKING_ENTRIES.filter(
      (entry) => entry.product_ranking_id === guide.id,
    ).length,
    category: category ? { name: category.name, slug: category.slug } : null,
  };
}

function seedGuideSummaries(
  options: ListProductGuidesOptions,
): ProductRankingSummary[] {
  const { categorySlug, query, limit } = options;

  const categoryId = categorySlug
    ? (SEED_PRODUCT_CATEGORIES.find((c) => c.slug === categorySlug)?.id ?? null)
    : null;

  const rows = SEED_PRODUCT_RANKINGS.filter((guide) => {
    if (categoryId && guide.category_id !== categoryId) return false;
    if (query && !guide.title.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }).sort(
    (a, b) =>
      new Date(b.published_at ?? 0).getTime() -
      new Date(a.published_at ?? 0).getTime(),
  );

  const summaries = rows.map(seedGuideSummary);
  return limit ? summaries.slice(0, limit) : summaries;
}

export async function listProductGuides(
  options: ListProductGuidesOptions = {},
): Promise<ProductRankingSummary[]> {
  const { categorySlug, query, limit } = options;
  const supabase = await getDb();

  if (!supabase) return seedGuideSummaries(options);

  let request = supabase
    .from("product_rankings")
    .select("*, category:product_categories(name, slug), product_ranking_entries(count)")
    .order("published_at", { ascending: false, nullsFirst: false });

  if (categorySlug) {
    const { data: category } = await supabase
      .from("product_categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();

    if (category) request = request.eq("category_id", (category as { id: string }).id);
  }
  if (query) request = request.ilike("title", `%${query}%`);
  if (limit) request = request.limit(limit);

  const { data, error } = await request;
  // Degrade to seed content rather than rendering an empty index.
  if (error || !data) return seedGuideSummaries(options);

  type Row = ProductRanking & {
    category: { name: string; slug: string } | null;
    product_ranking_entries: { count: number }[];
  };

  return (data as Row[]).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    author_name: row.author_name,
    published_at: row.published_at,
    updated_at: row.updated_at,
    entry_count: row.product_ranking_entries?.[0]?.count ?? 0,
    category: row.category,
  }));
}

export async function getProductGuideBySlug(
  slug: string,
): Promise<ProductRankingWithEntries | null> {
  const supabase = await getDb();

  if (!supabase) {
    const guide = SEED_PRODUCT_RANKINGS.find((g) => g.slug === slug);
    if (!guide) return null;

    const entries: ProductRankingEntryWithProduct[] = SEED_PRODUCT_RANKING_ENTRIES
      .filter((entry) => entry.product_ranking_id === guide.id)
      .sort((a, b) => a.position - b.position)
      .map((entry) => {
        const product = seedProductWithOffers(entry.product_id);
        return product ? { ...entry, product } : null;
      })
      .filter((entry): entry is ProductRankingEntryWithProduct => entry !== null);

    return {
      ...guide,
      category: guide.category_id
        ? (seedProductCategoryById.get(guide.category_id) ?? null)
        : null,
      localCategory: seedLocalCategory(guide.local_category_id),
      entries,
    };
  }

  const [{ data }, merchants] = await Promise.all([
    supabase
      .from("product_rankings")
      .select(
        "*, category:product_categories(*), localCategory:categories(id, name, slug), " +
          "entries:product_ranking_entries(*, product:products(*, offers:product_offers(*)))",
      )
      .eq("slug", slug)
      .maybeSingle(),
    loadMerchants(supabase),
  ]);

  if (!data) return null;

  type EntryRow = ProductRankingEntry & { product: ProductRow | null };
  const row = data as unknown as ProductRankingWithEntries & { entries: EntryRow[] };

  const entries = [...(row.entries ?? [])]
    .filter((entry) => entry.product)
    .sort((a, b) => a.position - b.position)
    .map((entry) => ({
      ...entry,
      product: withOffers(
        entry.product as ProductRow,
        (entry.product as ProductRow).offers ?? [],
        merchants,
      ),
    }));

  return { ...row, entries };
}

export async function listProductGuideSlugs(): Promise<string[]> {
  const supabase = await getDb();
  if (!supabase) return SEED_PRODUCT_RANKINGS.map((guide) => guide.slug);

  const { data } = await supabase.from("product_rankings").select("slug");
  return (data ?? []).map((row: { slug: string }) => row.slug);
}

/**
 * Guides tied to a local category, for the cross-links in both directions.
 *
 * A local "Beaches" page uses this to offer the beach-gear guide; a guide uses
 * its own `local_category_id` to offer the local lists. One nullable column
 * carries the relationship, so neither side needs a join table.
 */
export async function listProductGuidesForLocalCategory(
  localCategoryId: string,
  limit = 3,
): Promise<ProductRankingSummary[]> {
  const supabase = await getDb();

  if (!supabase) {
    return SEED_PRODUCT_RANKINGS.filter(
      (guide) => guide.local_category_id === localCategoryId,
    )
      .slice(0, limit)
      .map(seedGuideSummary);
  }

  const { data } = await supabase
    .from("product_rankings")
    .select("*, category:product_categories(name, slug), product_ranking_entries(count)")
    .eq("local_category_id", localCategoryId)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  type Row = ProductRanking & {
    category: { name: string; slug: string } | null;
    product_ranking_entries: { count: number }[];
  };

  return ((data ?? []) as Row[]).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    author_name: row.author_name,
    published_at: row.published_at,
    updated_at: row.updated_at,
    entry_count: row.product_ranking_entries?.[0]?.count ?? 0,
    category: row.category,
  }));
}

/* -------------------------------------------------------------------------- */
/* Recommendation modules                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The products an editor attached to one host page.
 *
 * Returns an empty array for a page with none, which is the common case — the
 * module renders nothing at all rather than an empty heading.
 */
export async function getRecommendedProducts(
  contentType: RecommendationContentType,
  contentId: string,
): Promise<RecommendedProduct[]> {
  const supabase = await getDb();

  if (!supabase) {
    return SEED_PRODUCT_RECOMMENDATIONS.filter(
      (rec) => rec.content_type === contentType && rec.content_id === contentId,
    )
      .sort((a, b) => a.position - b.position)
      .map((rec) => {
        const product = seedProductWithOffers(rec.product_id);
        return product ? { ...rec, product } : null;
      })
      .filter((rec): rec is RecommendedProduct => rec !== null);
  }

  const [{ data }, merchants] = await Promise.all([
    supabase
      .from("content_product_recommendations")
      .select("*, product:products(*, offers:product_offers(*))")
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .order("position"),
    loadMerchants(supabase),
  ]);

  type Row = ContentProductRecommendation & { product: ProductRow | null };

  return ((data ?? []) as unknown as Row[])
    .filter((row) => row.product)
    .map((row) => ({
      ...row,
      product: withOffers(
        row.product as ProductRow,
        (row.product as ProductRow).offers ?? [],
        merchants,
      ),
    }));
}

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

/** Featured products for the /products index rail. */
export async function listFeaturedProducts(limit = 4): Promise<ProductWithOffers[]> {
  const supabase = await getDb();

  if (!supabase) {
    return SEED_PRODUCTS.filter((product) => product.featured)
      .slice(0, limit)
      .map((product) => seedProductWithOffers(product.id))
      .filter((product): product is ProductWithOffers => product !== null);
  }

  const [{ data }, merchants] = await Promise.all([
    supabase
      .from("products")
      .select("*, offers:product_offers(*)")
      .eq("featured", true)
      .order("updated_at", { ascending: false })
      .limit(limit),
    loadMerchants(supabase),
  ]);

  return ((data ?? []) as unknown as ProductRow[]).map((row) =>
    withOffers(row, row.offers ?? [], merchants),
  );
}
