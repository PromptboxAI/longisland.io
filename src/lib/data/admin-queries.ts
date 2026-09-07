import "server-only";

import type { OfferCore } from "@/lib/affiliate";
import type { MediaAsset } from "@/types/media";
import type { Article, ArticleWithRelations } from "@/types/articles";

import { requireAdmin } from "@/lib/auth";
import type {
  EditorialSection,
  EditorialSectionItemWithTargets,
  Business,
  Category,
  ContentItem,
  Lead,
  Nomination,
  Place,
  Ranking,
  RankingWithEntries,
} from "@/types/database";

/**
 * Admin reads and writes.
 *
 * These use the authenticated server client, so RLS grants access to draft rows
 * that the public queries in ./queries.ts cannot see. Every function calls
 * requireAdmin() first, which redirects to the login page when there is no
 * session.
 */

export interface AdminStats {
  businesses: number;
  publishedRankings: number;
  draftRankings: number;
  newNominations: number;
  newLeads: number;
  contentReady: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const { supabase } = await requireAdmin();

  // head:true returns only the count, so none of these transfer rows.
  const counts = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase
      .from("rankings")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("rankings")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase
      .from("nominations")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "ready"),
  ]);

  const [
    businesses,
    publishedRankings,
    draftRankings,
    newNominations,
    newLeads,
    contentReady,
  ] = counts.map((result) => result.count ?? 0);

  return {
    businesses,
    publishedRankings,
    draftRankings,
    newNominations,
    newLeads,
    contentReady,
  };
}

/* -------------------------------------------------------------------------- */
/* Rankings                                                                    */
/* -------------------------------------------------------------------------- */

export interface AdminRanking extends Ranking {
  category: Pick<Category, "name" | "slug"> | null;
  place: Pick<Place, "name" | "slug"> | null;
  entry_count: number;
}

export async function listAdminRankings(options: {
  status?: string;
  query?: string;
  limit?: number;
} = {}): Promise<AdminRanking[]> {
  const { supabase } = await requireAdmin();

  let request = supabase
    .from("rankings")
    .select(
      "*, category:categories(name, slug), place:places(name, slug), ranking_entries(count)",
    )
    .order("updated_at", { ascending: false });

  if (options.status) request = request.eq("status", options.status);
  if (options.query) request = request.ilike("title", `%${options.query}%`);
  if (options.limit) request = request.limit(options.limit);

  const { data } = await request;

  type Row = Ranking & {
    category: { name: string; slug: string } | null;
    place: { name: string; slug: string } | null;
    ranking_entries: { count: number }[];
  };

  return ((data ?? []) as Row[]).map((row) => ({
    ...row,
    entry_count: row.ranking_entries?.[0]?.count ?? 0,
  }));
}

export async function getAdminRanking(
  id: string,
): Promise<RankingWithEntries | null> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("rankings")
    .select(
      "*, category:categories(*), place:places(*), entries:ranking_entries(*, business:businesses(*))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  const ranking = data as unknown as RankingWithEntries;
  return {
    ...ranking,
    entries: [...(ranking.entries ?? [])]
      .filter((entry) => entry.business)
      .sort((a, b) => a.position - b.position),
  };
}

/* -------------------------------------------------------------------------- */
/* Businesses                                                                  */
/* -------------------------------------------------------------------------- */

export async function listAdminBusinesses(options: {
  status?: string;
  categoryId?: string;
  city?: string;
  query?: string;
  limit?: number;
} = {}): Promise<Business[]> {
  const { supabase } = await requireAdmin();

  let request = supabase
    .from("businesses")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(options.limit ?? 100);

  if (options.status) request = request.eq("status", options.status);
  if (options.categoryId) request = request.eq("category_id", options.categoryId);
  if (options.city) request = request.eq("city", options.city);
  if (options.query) request = request.ilike("name", `%${options.query}%`);

  const { data } = await request;
  return (data ?? []) as Business[];
}

export async function getAdminBusiness(id: string): Promise<Business | null> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return (data as Business | null) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Intake queues                                                               */
/* -------------------------------------------------------------------------- */

export async function listNominations(status?: string): Promise<Nomination[]> {
  const { supabase } = await requireAdmin();

  let request = supabase
    .from("nominations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) request = request.eq("status", status);

  const { data } = await request;
  return (data ?? []) as Nomination[];
}

export async function listLeads(status?: string): Promise<Lead[]> {
  const { supabase } = await requireAdmin();

  let request = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) request = request.eq("status", status);

  const { data } = await request;
  return (data ?? []) as Lead[];
}

export async function listContentItems(): Promise<ContentItem[]> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("content_items")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);

  return (data ?? []) as ContentItem[];
}

/* -------------------------------------------------------------------------- */
/* Reference data for editors                                                  */
/* -------------------------------------------------------------------------- */

export async function listAdminCategories(): Promise<Category[]> {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("categories").select("*").order("name");
  return (data ?? []) as Category[];
}

export async function listAdminPlaces(): Promise<Place[]> {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("places").select("*").order("name");
  return (data ?? []) as Place[];
}

/* -------------------------------------------------------------------------- */
/* Editorial curation                                                          */
/* -------------------------------------------------------------------------- */

export interface AdminSection extends EditorialSection {
  item_count: number;
}

export async function listEditorialSections(): Promise<AdminSection[]> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("editorial_sections")
    .select("*, editorial_section_items(count)")
    .order("key");

  type Row = EditorialSection & { editorial_section_items: { count: number }[] };

  return ((data ?? []) as Row[]).map((row) => ({
    ...row,
    item_count: row.editorial_section_items?.[0]?.count ?? 0,
  }));
}

export interface AdminSectionDetail extends EditorialSection {
  items: EditorialSectionItemWithTargets[];
}

/**
 * One section with every item, including drafts, expired and scheduled ones.
 *
 * Unlike the public getSection(), nothing is filtered — an editor has to see
 * what they have scheduled or unpublished in order to manage it. Ordering
 * matches the public contract so the admin list reflects the live order.
 */
export async function getEditorialSection(
  id: string,
): Promise<AdminSectionDetail | null> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("editorial_sections")
    .select(
      "*, items:editorial_section_items(" +
        "*, ranking:rankings(*), business:businesses(*), category:categories(*), " +
        "place:places(*), product_ranking:product_rankings(*), " +
        "article:articles(*), " +
        "product:products(*, offers:product_offers(*))" +
        ")",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  const section = data as unknown as AdminSectionDetail;
  const items = [...(section.items ?? [])].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });

  return { ...section, items };
}

/** Candidates for the target picker. Small tables, so loaded whole. */
export interface TargetCandidates {
  rankings: { id: string; title: string; slug: string; status: string }[];
  businesses: { id: string; name: string; city: string | null; status: string }[];
  categories: { id: string; name: string; slug: string; status: string }[];
  places: { id: string; name: string; slug: string; status: string }[];
  productRankings: { id: string; title: string; slug: string; status: string }[];
  /**
   * Products carry their offers so the picker can warn about one that has
   * nothing buyable behind it — that product is curatable but will not render.
   */
  articles: { id: string; title: string; slug: string; status: string }[];
  products: {
    id: string;
    name: string;
    brand: string | null;
    status: string;
    offers: OfferCore[];
  }[];
}

export async function listTargetCandidates(): Promise<TargetCandidates> {
  const { supabase } = await requireAdmin();

  const [rankings, businesses, categories, places, productRankings, products, articles] =
    await Promise.all([
      supabase.from("rankings").select("id, title, slug, status").order("title"),
      supabase.from("businesses").select("id, name, city, status").order("name"),
      supabase.from("categories").select("id, name, slug, status").order("name"),
      supabase.from("places").select("id, name, slug, status").order("name"),
      supabase
        .from("product_rankings")
        .select("id, title, slug, status")
        .order("title"),
      supabase
        .from("products")
        .select(
          "id, name, brand, status, offers:product_offers(affiliate_url, direct_url, availability)",
        )
        .order("name"),
      supabase.from("articles").select("id, title, slug, status").order("title"),
    ]);

  return {
    rankings: (rankings.data ?? []) as TargetCandidates["rankings"],
    businesses: (businesses.data ?? []) as TargetCandidates["businesses"],
    categories: (categories.data ?? []) as TargetCandidates["categories"],
    places: (places.data ?? []) as TargetCandidates["places"],
    productRankings: (productRankings.data ?? []) as TargetCandidates["productRankings"],
    products: (products.data ?? []) as unknown as TargetCandidates["products"],
    articles: (articles.data ?? []) as TargetCandidates["articles"],
  };
}

/* -------------------------------------------------------------------------- */
/* Media library                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Every asset an editor may choose from.
 *
 * Loaded whole and passed to the picker as a prop, the same way target
 * candidates are: the library is small enough for a long while, and a
 * server-rendered list keeps the picker a plain client component with no
 * fetching of its own. Archived assets are excluded — that is what archiving
 * is for — but they stay readable so a page already using one still renders.
 */
export async function listMediaAssets(): Promise<MediaAsset[]> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("media_assets")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return (data ?? []) as MediaAsset[];
}

/** One asset, for the library detail editor. */
export async function getMediaAsset(id: string): Promise<MediaAsset | null> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("media_assets")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return (data as MediaAsset) ?? null;
}

/**
 * How many records use each asset, for the whole library at once.
 *
 * Eight queries total rather than eight per asset: the alternative counts once
 * per image, which is 480 round trips for a library of sixty and gets slower
 * with every upload. Shown before archiving, so an editor can see that the
 * photo they are about to hide from the picker is on three live pages.
 */
export async function mediaUsageCounts(): Promise<Map<string, number>> {
  const { supabase } = await requireAdmin();

  const columns: [string, string][] = [
    ["rankings", "hero_media_id"],
    ["articles", "hero_media_id"],
    ["product_rankings", "hero_media_id"],
    ["businesses", "primary_media_id"],
    ["categories", "hero_media_id"],
    ["places", "hero_media_id"],
    ["products", "image_media_id"],
    ["editorial_section_items", "image_media_id"],
  ];

  const results = await Promise.all(
    columns.map(([table, column]) =>
      supabase.from(table).select(column).not(column, "is", null),
    ),
  );

  const counts = new Map<string, number>();
  results.forEach((result, index) => {
    const column = columns[index][1];
    const rows = (result.data ?? []) as unknown as Record<string, string | null>[];
    for (const row of rows) {
      const id = row[column];
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  });

  return counts;
}

/* -------------------------------------------------------------------------- */
/* Articles                                                                    */
/* -------------------------------------------------------------------------- */

export async function listAdminArticles(): Promise<Article[]> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("articles")
    .select("*")
    .order("updated_at", { ascending: false });

  return (data ?? []) as Article[];
}

/** One article with everything the editor needs, drafts included. */
export async function getAdminArticle(
  id: string,
): Promise<ArticleWithRelations | null> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("articles")
    .select(
      "*, category:categories(id, name, slug), place:places(id, name, slug), " +
        "hero_media:media_assets!articles_hero_media_id_fkey(*), " +
        "og_media:media_assets!articles_og_image_media_id_fkey(*)",
    )
    .eq("id", id)
    .maybeSingle();

  return (data as unknown as ArticleWithRelations) ?? null;
}
