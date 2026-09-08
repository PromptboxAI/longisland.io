import "server-only";

import { isSeedContentAllowed } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { resolveImageUrl } from "@/lib/media/resolve";
import {
  SEED_BUSINESSES,
  SEED_CATEGORIES,
  SEED_PLACES,
  SEED_RANKING_ENTRIES,
  SEED_RANKINGS,
} from "@/lib/data/seed";
import type {
  Business,
  BusinessAppearance,
  BusinessWithMedia,
  Category,
  EditorialSection,
  EditorialSectionItemWithTargets,
  Place,
  Ranking,
  RankingEntryWithBusiness,
  RankingSummary,
  RankingWithEntries,
  ResolvedSection,
  ResolvedSectionItem,
  SectionTargetType,
} from "@/types/database";
import type { MediaAsset } from "@/types/media";
import type {
  AffiliateMerchant,
  OfferWithMerchant,
  ProductOffer,
  ProductWithOffers,
} from "@/types/products";
import { indexMerchants } from "@/lib/affiliate";

/**
 * Server-side data access for the public site.
 *
 * Every function reads from Supabase when credentials are present and falls
 * back to `src/lib/data/seed` when they are not, so the app builds and renders
 * before the database exists. The fallback is the ONLY branch in the codebase
 * that knows about seed data — pages and components just call these functions.
 *
 * Public reads rely on RLS: the anon key can only see rows with
 * `status = 'published'`, so no query here filters on status defensively.
 */

/* -------------------------------------------------------------------------- */
/* Seed helpers                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Whether the database actually has our schema.
 *
 * Having credentials is not the same as having tables. Before the migrations
 * are applied, PostgREST answers every request with PGRST205 ("table not found
 * in schema cache"), which would otherwise render an empty site — no
 * categories, no rankings, 404s on pages that exist.
 *
 * So we probe once per server process and fall back to seed content until the
 * schema is there. Cached, so this costs one request on cold start.
 *
 * This deliberately does NOT fall back when the schema exists but a table is
 * empty: an empty published table is a real state the site should show
 * honestly, not paper over with fixtures.
 */
let schemaReady: Promise<boolean> | null = null;

async function hasSchema(
  client: NonNullable<ReturnType<typeof createPublicClient>>,
): Promise<boolean> {
  schemaReady ??= (async () => {
    // A plain GET, deliberately not `head: true`: PostgREST returns no body on
    // HEAD, so supabase-js reports `error: null` with status 204 even when the
    // table does not exist, and the probe would wrongly pass.
    const { error } = await client.from("categories").select("id").limit(1);

    if (error?.code === "PGRST205") {
      console.warn(
        "[longisland] Supabase schema not found — the database is not " +
          "provisioned. Apply supabase/migrations to switch to live data.",
      );
      return false;
    }

    // Any OTHER error means the database is provisioned but this request
    // failed. That is a runtime fault, not "no database", so the schema is
    // treated as present and callers fall through to their error handling
    // rather than to seed content.
    if (error) {
      logQueryError("hasSchema probe", error);
    }
    return true;
  })();

  return schemaReady;
}

/**
 * Supabase client, or `null` when reading from seed content is correct.
 *
 * `null` means one thing only: there is no usable database — unconfigured, or
 * configured but not yet migrated. It NEVER means "a query failed".
 */
async function getDb() {
  const client = createPublicClient();
  if (!client) return null;
  return (await hasSchema(client)) ? client : null;
}

/**
 * The same database as `getDb`, read with the current user's cookies.
 *
 * Drafts come back only because RLS lets that particular person see them. A
 * signed-out visitor gets an anonymous session here and sees precisely what
 * they would have seen anyway, so this is safe to reach from a route that
 * forgot to check — though every caller does check.
 */
async function getEditorDb() {
  const client = await createServerClient();
  // Both are PostgREST clients; only the auth context differs.
  return (await hasSchema(client as never)) ? (client as never) : null;
}

/**
 * Whether a caller with no database may serve the fictional seed dataset.
 *
 * False in production unless explicitly opted in, so a misconfigured
 * production deploy renders empty rather than publishing invented businesses.
 */
function seedAllowed(): boolean {
  if (isSeedContentAllowed) return true;
  console.error(
    "[longisland] No usable Supabase database and seed content is not " +
      "permitted in production. Serving empty results. Check " +
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
  return false;
}

/**
 * Logs a failed Supabase read.
 *
 * Only the PostgREST code and message are logged — never the client, the URL
 * or any key, so a log line cannot leak credentials.
 */
function logQueryError(context: string, error: { code?: string; message: string }) {
  console.error(
    `[longisland] ${context} failed (${error.code ?? "unknown"}): ${error.message}`,
  );
}

const seedCategoryById = new Map(SEED_CATEGORIES.map((c) => [c.id, c]));
const seedPlaceById = new Map(SEED_PLACES.map((p) => [p.id, p]));
const seedBusinessById = new Map(SEED_BUSINESSES.map((b) => [b.id, b]));

function seedEntriesFor(rankingId: string) {
  return SEED_RANKING_ENTRIES.filter((e) => e.ranking_id === rankingId).sort(
    (a, b) => a.position - b.position,
  );
}

function seedSummary(ranking: Ranking): RankingSummary {
  const category = ranking.category_id
    ? (seedCategoryById.get(ranking.category_id) ?? null)
    : null;
  const place = ranking.place_id ? (seedPlaceById.get(ranking.place_id) ?? null) : null;

  return {
    id: ranking.id,
    title: ranking.title,
    slug: ranking.slug,
    description: ranking.description,
    geography: ranking.geography,
    author_name: ranking.author_name,
    published_at: ranking.published_at,
    updated_at: ranking.updated_at,
    entry_count: seedEntriesFor(ranking.id).length,
    category: category ? { name: category.name, slug: category.slug } : null,
    place: place ? { name: place.name, slug: place.slug } : null,
    hero_media: null,
    hero_image_url: null,
  };
}

/**
 * Seed-backed implementation of listRankings, shared by the "no database" and
 * "query failed" paths so a Supabase error degrades to content rather than to
 * an empty page.
 */
function seedRankingSummaries(options: ListRankingsOptions): RankingSummary[] {
  const { categorySlug, placeSlug, query, sort = "newest", limit } = options;

  const categoryIds = categorySlug
    ? categoryFamilyIds(categorySlug, SEED_CATEGORIES)
    : null;
  const placeIds = placeSlug ? placeFamilyIds(placeSlug, SEED_PLACES) : null;

  let rows = SEED_RANKINGS.filter((r) => {
    if (categoryIds && (!r.category_id || !categoryIds.has(r.category_id))) {
      return false;
    }
    if (placeIds && (!r.place_id || !placeIds.has(r.place_id))) return false;
    if (query && !r.title.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  rows = sortRankings(rows, sort);
  const summaries = rows.map(seedSummary);
  return limit ? summaries.slice(0, limit) : summaries;
}

/** Every descendant category id, so a parent page includes its children. */
function categoryFamilyIds(rootSlug: string, categories: Category[]): Set<string> {
  const root = categories.find((c) => c.slug === rootSlug);
  if (!root) return new Set();

  const ids = new Set([root.id]);
  let added = true;
  while (added) {
    added = false;
    for (const c of categories) {
      if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
        ids.add(c.id);
        added = true;
      }
    }
  }
  return ids;
}

/** Every descendant place id, so a county page includes its towns. */
function placeFamilyIds(rootSlug: string, places: Place[]): Set<string> {
  const root = places.find((p) => p.slug === rootSlug);
  if (!root) return new Set();

  const ids = new Set([root.id]);
  let added = true;
  while (added) {
    added = false;
    for (const p of places) {
      if (p.parent_id && ids.has(p.parent_id) && !ids.has(p.id)) {
        ids.add(p.id);
        added = true;
      }
    }
  }
  return ids;
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

export async function listCategories(): Promise<Category[]> {
  const supabase = await getDb();
  if (!supabase) return seedAllowed() ? SEED_CATEGORIES : [];

  const { data, error } = await supabase
    .from("categories")
    .select("*, hero_media:media_assets!categories_hero_media_id_fkey(*)")
    .order("name");

  // A failed read is NOT seed mode. Returning fixtures here would publish
  // invented content because of a transient database fault.
  if (error) {
    logQueryError("listCategories", error);
    return [];
  }
  return (data ?? []) as Category[];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await getDb();
  if (!supabase) {
    return seedAllowed()
      ? (SEED_CATEGORIES.find((c) => c.slug === slug) ?? null)
      : null;
  }

  const { data, error } = await supabase
    .from("categories")
    .select("*, hero_media:media_assets!categories_hero_media_id_fkey(*)")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    logQueryError(`getCategoryBySlug(${slug})`, error);
    return null;
  }
  return (data as Category | null) ?? null;
}

export async function getChildCategories(parentId: string): Promise<Category[]> {
  const all = await listCategories();
  return all.filter((c) => c.parent_id === parentId);
}

/* -------------------------------------------------------------------------- */
/* Places                                                                      */
/* -------------------------------------------------------------------------- */

export async function listPlaces(): Promise<Place[]> {
  const supabase = await getDb();
  if (!supabase) return seedAllowed() ? SEED_PLACES : [];

  const { data, error } = await supabase.from("places").select("*, hero_media:media_assets!places_hero_media_id_fkey(*)").order("name");
  if (error) {
    logQueryError("listPlaces", error);
    return [];
  }
  return (data ?? []) as Place[];
}

export async function getPlaceBySlug(slug: string): Promise<Place | null> {
  const supabase = await getDb();
  if (!supabase) {
    return seedAllowed() ? (SEED_PLACES.find((p) => p.slug === slug) ?? null) : null;
  }

  const { data, error } = await supabase
    .from("places")
    .select("*, hero_media:media_assets!places_hero_media_id_fkey(*)")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    logQueryError(`getPlaceBySlug(${slug})`, error);
    return null;
  }
  return (data as Place | null) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Rankings                                                                    */
/* -------------------------------------------------------------------------- */

export type RankingSort = "newest" | "popular" | "alphabetical";

export interface ListRankingsOptions {
  categorySlug?: string;
  placeSlug?: string;
  /** Free-text match against the title. */
  query?: string;
  sort?: RankingSort;
  limit?: number;
}

export async function listRankings(
  options: ListRankingsOptions = {},
): Promise<RankingSummary[]> {
  const { categorySlug, placeSlug, query, sort = "newest", limit } = options;

  const supabase = await getDb();

  if (!supabase) return seedAllowed() ? seedRankingSummaries(options) : [];

  let request = supabase
    .from("rankings")
    .select(
      "*, category:categories(name, slug), place:places(name, slug), " +
        "ranking_entries(count), " +
        "hero_media:media_assets!rankings_hero_media_id_fkey(*)",
    );

  if (categorySlug) {
    const category = await getCategoryBySlug(categorySlug);
    if (category) request = request.eq("category_id", category.id);
  }
  if (placeSlug) {
    const place = await getPlaceBySlug(placeSlug);
    if (place) request = request.eq("place_id", place.id);
  }
  if (query) {
    request = request.ilike("title", `%${query}%`);
  }

  request =
    sort === "alphabetical"
      ? request.order("title", { ascending: true })
      : request.order("published_at", { ascending: false, nullsFirst: false });

  if (limit) request = request.limit(limit);

  const { data, error } = await request;
  // A failed read returns empty, never fixtures: an empty rail is honest, a
  // fabricated ranking is not.
  if (error) {
    logQueryError("listRankings", error);
    return [];
  }
  if (!data) return [];

  type Row = Ranking & {
    category: { name: string; slug: string } | null;
    place: { name: string; slug: string } | null;
    ranking_entries: { count: number }[];
    hero_media: MediaAsset | null;
  };

  return (data as unknown as Row[]).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    geography: row.geography,
    author_name: row.author_name,
    published_at: row.published_at,
    updated_at: row.updated_at,
    entry_count: row.ranking_entries?.[0]?.count ?? 0,
    category: row.category,
    place: row.place,
    hero_media: row.hero_media,
    hero_image_url: row.hero_image_url,
  }));
}

function sortRankings(rows: Ranking[], sort: RankingSort): Ranking[] {
  const copy = [...rows];
  if (sort === "alphabetical") {
    return copy.sort((a, b) => a.title.localeCompare(b.title));
  }
  // "popular" has no engagement data yet; entry count is the honest proxy and
  // keeps the filter functional rather than fake. Revisit once analytics exist.
  if (sort === "popular") {
    return copy.sort(
      (a, b) => seedEntriesFor(b.id).length - seedEntriesFor(a.id).length,
    );
  }
  return copy.sort(
    (a, b) =>
      new Date(b.published_at ?? 0).getTime() -
      new Date(a.published_at ?? 0).getTime(),
  );
}

export async function getRankingBySlug(
  slug: string,
): Promise<RankingWithEntries | null> {
  const supabase = await getDb();

  if (!supabase) {
    if (!seedAllowed()) return null;
    const ranking = SEED_RANKINGS.find((r) => r.slug === slug);
    if (!ranking) return null;

    const entries: RankingEntryWithBusiness[] = seedEntriesFor(ranking.id)
      .map((entry) => {
        const business = seedBusinessById.get(entry.business_id);
        return business ? { ...entry, business } : null;
      })
      .filter((e): e is RankingEntryWithBusiness => e !== null);

    return {
      ...ranking,
      category: ranking.category_id
        ? (seedCategoryById.get(ranking.category_id) ?? null)
        : null,
      place: ranking.place_id ? (seedPlaceById.get(ranking.place_id) ?? null) : null,
      entries,
      hero_media: null,
      og_media: null,
    };
  }

  const { data, error } = await supabase
    .from("rankings")
    .select(
      "*, category:categories(*), place:places(*), " +
        "entries:ranking_entries(*, business:businesses(*, " +
        "primary_media:media_assets!businesses_primary_media_id_fkey(*))), " +
        "hero_media:media_assets!rankings_hero_media_id_fkey(*), " +
        "og_media:media_assets!rankings_og_image_media_id_fkey(*)",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    logQueryError(`getRankingBySlug(${slug})`, error);
    return null;
  }
  if (!data) return null;

  const ranking = data as unknown as RankingWithEntries;
  return {
    ...ranking,
    entries: [...(ranking.entries ?? [])]
      .filter((e) => e.business)
      .sort((a, b) => a.position - b.position),
  };
}

export async function listRankingSlugs(): Promise<string[]> {
  const supabase = await getDb();
  if (!supabase) return seedAllowed() ? SEED_RANKINGS.map((r) => r.slug) : [];

  const { data, error } = await supabase.from("rankings").select("slug");
  if (error) {
    logQueryError("listRankingSlugs", error);
    return [];
  }
  return (data ?? []).map((r: { slug: string }) => r.slug);
}

/* -------------------------------------------------------------------------- */
/* Businesses                                                                  */
/* -------------------------------------------------------------------------- */

export interface ListBusinessesOptions {
  categorySlug?: string;
  placeSlug?: string;
  query?: string;
  featuredOnly?: boolean;
  limit?: number;
}

export async function listBusinesses(
  options: ListBusinessesOptions = {},
): Promise<Business[]> {
  const { categorySlug, placeSlug, query, featuredOnly, limit } = options;
  const supabase = await getDb();

  if (!supabase) return seedAllowed() ? seedBusinesses(options) : [];

  /*
   * The picture is a media asset, so the asset has to come with the row.
   *
   * Every business image on the site is an upload — primary_image_url is null
   * on all of them — and this selected the columns only, so the category page's
   * business grid rendered 25 placeholder tiles over photographs that were
   * sitting in the bucket the whole time.
   */
  let request = supabase
    .from("businesses")
    .select("*, primary_media:media_assets!businesses_primary_media_id_fkey(*)")
    .order("name");

  if (categorySlug) {
    const category = await getCategoryBySlug(categorySlug);
    if (category) request = request.eq("category_id", category.id);
  }
  if (placeSlug) {
    const place = await getPlaceBySlug(placeSlug);
    if (place) {
      request =
        place.type === "county"
          ? request.eq("county", place.name)
          : request.eq("city", place.name);
    }
  }
  if (featuredOnly) request = request.eq("featured", true);
  if (query) request = request.ilike("name", `%${query}%`);
  if (limit) request = request.limit(limit);

  const { data, error } = await request;
  if (error) {
    logQueryError("listBusinesses", error);
    return [];
  }
  return (data ?? []) as Business[];
}

/**
 * Seed-backed implementation of listBusinesses, shared by the "no database"
 * and "query failed" paths.
 */
function seedBusinesses(options: ListBusinessesOptions): Business[] {
  const { categorySlug, placeSlug, query, featuredOnly, limit } = options;

  const categoryIds = categorySlug
    ? categoryFamilyIds(categorySlug, SEED_CATEGORIES)
    : null;

  // Places match on the business's city/county text rather than a foreign key,
  // because a business belongs to a town by address, not by editorial choice.
  const place = placeSlug ? SEED_PLACES.find((p) => p.slug === placeSlug) : null;

  const rows = SEED_BUSINESSES.filter((b) => {
    if (categoryIds && (!b.category_id || !categoryIds.has(b.category_id))) {
      return false;
    }
    if (place && !businessMatchesPlace(b, place)) return false;
    if (featuredOnly && !b.featured) return false;
    if (query) {
      const haystack = `${b.name} ${b.city} ${b.description ?? ""}`.toLowerCase();
      if (!haystack.includes(query.toLowerCase())) return false;
    }
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));

  return limit ? rows.slice(0, limit) : rows;
}

/** A business belongs to a place if its city matches, or its county does. */
function businessMatchesPlace(business: Business, place: Place): boolean {
  if (place.type === "island") return true;
  if (place.type === "county") return business.county === place.name;
  if (place.type === "region") {
    // Regions are editorial groupings; without a join table we match the towns
    // we know sit inside them. Kept in one place so it is easy to replace.
    const towns = REGION_TOWNS[place.slug];
    return towns ? towns.includes(business.city ?? "") : false;
  }
  return business.city === place.name;
}

/** Region membership for seed rendering. Replace with a join table in Supabase. */
const REGION_TOWNS: Record<string, string[]> = {
  "north-shore": [
    "Huntington",
    "Port Jefferson",
    "Stony Brook",
    "Smithtown",
    "Great Neck",
    "Manhasset",
    "Roslyn",
    "Oyster Bay",
    "Commack",
  ],
  "south-shore": [
    "Rockville Centre",
    "Patchogue",
    "Babylon",
    "Bay Shore",
    "Sayville",
    "Massapequa",
    "Long Beach",
    "Freeport",
  ],
  "north-fork": ["Riverhead", "Greenport", "Mattituck"],
  hamptons: ["Southampton", "East Hampton", "Montauk", "Westhampton Beach"],
  "east-end": [
    "Riverhead",
    "Greenport",
    "Mattituck",
    "Southampton",
    "East Hampton",
    "Montauk",
    "Westhampton Beach",
  ],
  "fire-island": [],
};

export async function getBusinessBySlug(
  slug: string,
): Promise<BusinessWithMedia | null> {
  const supabase = await getDb();
  if (!supabase) {
    return seedAllowed()
      ? (SEED_BUSINESSES.find((b) => b.slug === slug) ?? null)
      : null;
  }

  const { data, error } = await supabase
    .from("businesses")
    .select("*, primary_media:media_assets!businesses_primary_media_id_fkey(*)")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    logQueryError(`getBusinessBySlug(${slug})`, error);
    return null;
  }
  return (data as Business | null) ?? null;
}

/** Every published ranking this business appears in, with its position. */
export async function getBusinessAppearances(
  businessId: string,
): Promise<BusinessAppearance[]> {
  const supabase = await getDb();

  if (!supabase) {
    if (!seedAllowed()) return [];
    return SEED_RANKING_ENTRIES.filter((e) => e.business_id === businessId)
      .map((entry) => {
        const ranking = SEED_RANKINGS.find((r) => r.id === entry.ranking_id);
        return ranking
          ? { ranking, position: entry.position, badge: entry.badge }
          : null;
      })
      .filter((a): a is BusinessAppearance => a !== null)
      .sort((a, b) => a.position - b.position);
  }

  const { data, error } = await supabase
    .from("ranking_entries")
    .select("position, badge, ranking:rankings(*)")
    .eq("business_id", businessId)
    .order("position");

  if (error) {
    logQueryError(`getBusinessAppearances(${businessId})`, error);
    return [];
  }

  type Row = { position: number; badge: string | null; ranking: Ranking | null };

  return ((data ?? []) as unknown as Row[])
    .filter((row) => row.ranking !== null)
    .map((row) => ({
      ranking: row.ranking as Ranking,
      position: row.position,
      badge: row.badge,
    }));
}

/**
 * Businesses carrying a given editorial badge in any published ranking.
 *
 * Badges are editorial, so this is the honest source for a "Hidden Gems" rail —
 * it surfaces places an editor actually marked, rather than picking at random.
 */
export async function listBadgedBusinesses(
  badge: string,
  limit = 4,
): Promise<Business[]> {
  const supabase = await getDb();

  if (!supabase) {
    if (!seedAllowed()) return [];
    const seen = new Set<string>();
    const result: Business[] = [];

    for (const entry of SEED_RANKING_ENTRIES) {
      if (entry.badge !== badge || seen.has(entry.business_id)) continue;
      const business = seedBusinessById.get(entry.business_id);
      if (!business) continue;
      seen.add(entry.business_id);
      result.push(business);
      if (result.length >= limit) break;
    }
    return result;
  }

  const { data, error } = await supabase
    .from("ranking_entries")
    .select("business:businesses(*)")
    .eq("badge", badge)
    .limit(limit * 3);

  if (error) {
    logQueryError(`listBadgedBusinesses(${badge})`, error);
    return [];
  }

  type Row = { business: Business | null };

  const seen = new Set<string>();
  const result: Business[] = [];
  for (const row of ((data ?? []) as unknown as Row[])) {
    if (!row.business || seen.has(row.business.id)) continue;
    seen.add(row.business.id);
    result.push(row.business);
    if (result.length >= limit) break;
  }
  return result;
}

export async function listBusinessSlugs(): Promise<string[]> {
  const supabase = await getDb();
  if (!supabase) return seedAllowed() ? SEED_BUSINESSES.map((b) => b.slug) : [];

  const { data, error } = await supabase.from("businesses").select("slug");
  if (error) {
    logQueryError("listBusinessSlugs", error);
    return [];
  }
  return (data ?? []).map((b: { slug: string }) => b.slug);
}

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */

export interface SearchResults {
  rankings: RankingSummary[];
  businesses: Business[];
  categories: Category[];
  places: Place[];
}

export async function searchAll(query: string): Promise<SearchResults> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { rankings: [], businesses: [], categories: [], places: [] };
  }

  const needle = trimmed.toLowerCase();
  const [rankings, businesses, categories, places] = await Promise.all([
    listRankings({ query: trimmed, limit: 12 }),
    listBusinesses({ query: trimmed, limit: 12 }),
    listCategories(),
    listPlaces(),
  ]);

  return {
    rankings,
    businesses,
    categories: categories
      .filter((c) => c.name.toLowerCase().includes(needle))
      .slice(0, 8),
    places: places.filter((p) => p.name.toLowerCase().includes(needle)).slice(0, 8),
  };
}

/* -------------------------------------------------------------------------- */
/* Editorial curation                                                          */
/* -------------------------------------------------------------------------- */

/*
 * A product target brings its offers with it, so the commerce card can be
 * rendered from the same round trip. Merchant rows are attached afterwards:
 * product_offers.merchant is a slug rather than a foreign key, so PostgREST
 * cannot embed it here.
 */
const SECTION_SELECT =
  "*, items:editorial_section_items(" +
  "*, " +
  "image_media:media_assets!editorial_section_items_image_media_id_fkey(*), " +
  "ranking:rankings(*, hero_media:media_assets!rankings_hero_media_id_fkey(*)), " +
  "article:articles(*, hero_media:media_assets!articles_hero_media_id_fkey(*)), " +
  "business:businesses(*, primary_media:media_assets!businesses_primary_media_id_fkey(*)), " +
  "category:categories(*, hero_media:media_assets!categories_hero_media_id_fkey(*)), " +
  "place:places(*, hero_media:media_assets!places_hero_media_id_fkey(*)), " +
  "product_ranking:product_rankings(*, hero_media:media_assets!product_rankings_hero_media_id_fkey(*)), " +
  "product:products(*, offers:product_offers(*), " +
  "image_media:media_assets!products_image_media_id_fkey(*))" +
  ")";

/**
 * Deterministic order for section items.
 *
 * `position` is not unique — reordering through PostgREST cannot run a
 * multi-statement swap in one transaction — so ties break on created_at and
 * then id. Two renders of the same data always produce the same order.
 */
function compareItems(
  a: EditorialSectionItemWithTargets,
  b: EditorialSectionItemWithTargets,
): number {
  if (a.position !== b.position) return a.position - b.position;
  if (a.created_at !== b.created_at) {
    return a.created_at < b.created_at ? -1 : 1;
  }
  return a.id < b.id ? -1 : 1;
}

/**
 * Applies override-or-inherit for one item.
 *
 * Returns null when the destination row is absent. Under RLS that should not
 * happen — the item policy requires a published target — but a null here is
 * the safe outcome either way: drop the item rather than render a card that
 * links nowhere.
 */
function resolveItem(
  item: EditorialSectionItemWithTargets,
  merchants: Map<string, AffiliateMerchant>,
): ResolvedSectionItem | null {
  let commerce: ProductWithOffers | null = null;
  let inheritedMedia: MediaAsset | null = null;
  let targetType: SectionTargetType;
  let href: string;
  let inheritedKicker: string | null = null;
  let inheritedHeadline: string | null = null;
  let inheritedDek: string | null = null;
  let inheritedImage: string | null = null;

  if (item.ranking_id) {
    if (!item.ranking) return null;
    targetType = "ranking";
    href = `/best/${item.ranking.slug}`;
    inheritedKicker = item.ranking.geography;
    inheritedHeadline = item.ranking.title;
    inheritedDek = item.ranking.description;
    inheritedImage = item.ranking.hero_image_url;
    inheritedMedia = item.ranking.hero_media;
  } else if (item.business_id) {
    if (!item.business) return null;
    targetType = "business";
    href = `/business/${item.business.slug}`;
    inheritedKicker = item.business.city;
    inheritedHeadline = item.business.name;
    inheritedDek = item.business.description;
    inheritedImage = item.business.primary_image_url;
    inheritedMedia = item.business.primary_media;
  } else if (item.category_id) {
    if (!item.category) return null;
    targetType = "category";
    href = `/category/${item.category.slug}`;
    inheritedHeadline = item.category.name;
    inheritedDek = item.category.description;
    inheritedImage = item.category.hero_image_url;
    inheritedMedia = item.category.hero_media;
  } else if (item.place_id) {
    if (!item.place) return null;
    targetType = "place";
    href = `/place/${item.place.slug}`;
    inheritedKicker = item.place.county;
    inheritedHeadline = item.place.name;
    inheritedDek = item.place.description;
    inheritedImage = item.place.hero_image_url;
    inheritedMedia = item.place.hero_media;
  } else if (item.product_ranking_id) {
    if (!item.product_ranking) return null;
    targetType = "product_ranking";
    href = `/products/${item.product_ranking.slug}`;
    inheritedHeadline = item.product_ranking.title;
    inheritedDek = item.product_ranking.description;
    inheritedImage = item.product_ranking.hero_image_url;
    inheritedMedia = item.product_ranking.hero_media;
  } else if (item.product_id) {
    if (!item.product) return null;
    targetType = "product";
    /*
     * A product has no page of its own — a page whose only content is a name
     * and a buy button is a thin affiliate page, and we do not publish those.
     * The card renders the merchant button as its one outbound link, so this
     * href is never followed; it stays non-empty so the field's contract holds.
     */
    href = "";
    inheritedKicker = item.product.brand;
    inheritedHeadline = item.product.name;
    inheritedDek = item.product.short_description;
    inheritedImage = item.product.image_url;
    /*
     * Products were the one target type whose media asset was never read.
     * Every other branch sets both the URL column and the asset; this one set
     * only the column, so a product whose picture was uploaded rather than
     * linked resolved to nothing and the card rendered its empty state.
     */
    inheritedMedia = item.product.image_media ?? null;
    commerce = {
      ...item.product,
      offers: (item.product.offers ?? []).map(
        (offer): OfferWithMerchant => ({
          ...(offer as ProductOffer),
          merchantRecord: merchants.get(offer.merchant) ?? null,
        }),
      ),
    };
  } else if (item.article_id) {
    if (!item.article) return null;
    targetType = "article";
    href = `/articles/${item.article.slug}`;
    inheritedHeadline = item.article.title;
    inheritedDek = item.article.dek;
    inheritedImage = item.article.hero_image_url;
    inheritedMedia = item.article.hero_media;
  } else if (item.external_url) {
    targetType = "external_url";
    href = item.external_url;
    // An external destination has no record to inherit from; the check
    // constraint guarantees a headline was supplied.
    inheritedHeadline = item.headline;
  } else {
    return null;
  }

  const headline = item.headline ?? inheritedHeadline;
  if (!headline) return null;

  return {
    id: item.id,
    position: item.position,
    targetType,
    href,
    kicker: item.kicker ?? inheritedKicker,
    headline,
    dek: item.dek ?? inheritedDek,
    imageUrl:
      resolveImageUrl(item.image_media, item.image_url) ??
      resolveImageUrl(inheritedMedia, inheritedImage),
    objectPosition:
      (item.image_media ?? inheritedMedia)
        ? `${((item.image_media ?? inheritedMedia) as MediaAsset).focal_x * 100}% ` +
          `${((item.image_media ?? inheritedMedia) as MediaAsset).focal_y * 100}%`
        : null,
    badge: item.badge,
    isSponsored: item.is_sponsored,
    commerce,
    overrides: {
      kicker: item.kicker !== null,
      headline: item.headline !== null,
      dek: item.dek !== null,
      imageUrl: item.image_url !== null,
    },
  };
}

export interface SectionScopeRef {
  categoryId?: string | null;
  placeId?: string | null;
}

/**
 * One published editorial section, with its live items resolved and ordered.
 *
 * This is the contract the public UI consumes. Everything the renderer needs is
 * already decided here: which items are live, in what order, and what each one
 * says after overrides are applied.
 *
 * Returns null when the section does not exist, is not published, or there is
 * no database. Seed mode has no editorial sections — curation is an editor's
 * decision, and inventing one would be exactly the fabrication the seed gate
 * exists to prevent.
 *
 * Draft items, scheduled-but-not-yet-live items, expired items and items
 * pointing at unpublished targets are removed by RLS, not here. Note that
 * public pages revalidate hourly, so a scheduled item appears within an hour of
 * its starts_at rather than to the second.
 */
/**
 * One editorial placement, resolved.
 *
 * `draft` swaps the anonymous client for the signed-in editor's own, which is
 * the whole mechanism behind the homepage preview. It does NOT bypass RLS —
 * the admin policy on `editorial_sections` is what admits an unpublished row,
 * and an anonymous caller passing this flag gets exactly what they got before.
 * That is why it takes a client rather than a "show me everything" switch.
 */
export async function getSection(
  key: string,
  scope: SectionScopeRef = {},
  options: { draft?: boolean } = {},
): Promise<ResolvedSection | null> {
  const supabase = options.draft ? await getEditorDb() : await getDb();
  if (!supabase) return null;

  let request = supabase.from("editorial_sections").select(SECTION_SELECT).eq("key", key);

  request = scope.categoryId
    ? request.eq("category_id", scope.categoryId)
    : request.is("category_id", null);
  request = scope.placeId
    ? request.eq("place_id", scope.placeId)
    : request.is("place_id", null);

  const { data, error } = await request.maybeSingle();

  if (error) {
    logQueryError(`getSection(${key})`, error);
    return null;
  }
  if (!data) return null;

  const section = data as unknown as EditorialSection & {
    items: EditorialSectionItemWithTargets[] | null;
  };

  const rawItems = section.items ?? [];

  /*
   * Merchant rows are only needed when a product is actually curated here, so
   * the extra round trip is skipped on the editorial-only sections that make up
   * most of the site. A missing merchant row is not fatal — the offer falls back
   * to the house button styling and the default CTA wording.
   */
  let merchants: Map<string, AffiliateMerchant> = new Map();
  if (rawItems.some((item) => item.product_id)) {
    const { data: merchantRows, error: merchantError } = await supabase
      .from("affiliate_merchants")
      .select("*")
      .eq("status", "published");

    if (merchantError) {
      logQueryError(`getSection(${key}) merchants`, merchantError);
    } else {
      merchants = indexMerchants((merchantRows ?? []) as AffiliateMerchant[]);
    }
  }

  const resolved = [...rawItems]
    .sort(compareItems)
    .map((item) => resolveItem(item, merchants))
    .filter((item): item is ResolvedSectionItem => item !== null);

  return {
    id: section.id,
    key: section.key,
    scope: section.scope_type,
    title: section.title,
    description: section.description,
    layout: section.layout,
    maxItems: section.max_items,
    items: section.max_items ? resolved.slice(0, section.max_items) : resolved,
  };
}
