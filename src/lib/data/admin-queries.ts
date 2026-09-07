import "server-only";

import type { OfferCore } from "@/lib/affiliate";
import type { MediaAsset } from "@/types/media";
import type { Article, ArticleWithRelations } from "@/types/articles";

import { requireAdmin } from "@/lib/auth";
import { resolveImageUrl } from "@/lib/media/resolve";
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
      "*, category:categories(*), place:places(*), " +
        "entries:ranking_entries(*, business:businesses(*, " +
        "primary_media:media_assets!businesses_primary_media_id_fkey(*))), " +
        "hero_media:media_assets!rankings_hero_media_id_fkey(*), " +
        "og_media:media_assets!rankings_og_image_media_id_fkey(*)",
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

/** One item, reduced to what the dashboard card needs to show. */
export interface AdminSectionLeadItem {
  id: string;
  image_media: MediaAsset | null;
  image_url: string | null;
  inheritedImageUrl: string | null;
  inheritedMedia: MediaAsset | null;
  displayHeadline: string;
}

export interface AdminSection extends EditorialSection {
  item_count: number;
  /** Same number, named the way the dashboard reads. */
  itemCount: number;
  items: AdminSectionLeadItem[];
}

export async function listEditorialSections(): Promise<AdminSection[]> {
  const { supabase } = await requireAdmin();

  /*
   * The dashboard shows what is in each slot, so it needs the first item and
   * enough of its target to name and picture it — not just a count. Limited to
   * the lead item: a card showing five thumbnails tells an editor less than one
   * showing the headline that will actually run.
   */
  const { data } = await supabase
    .from("editorial_sections")
    .select(
      "*, editorial_section_items(count), " +
        "items:editorial_section_items(" +
        "id, position, headline, image_url, " +
        "image_media:media_assets!editorial_section_items_image_media_id_fkey(*), " +
        "ranking:rankings(title, hero_image_url, hero_media:media_assets!rankings_hero_media_id_fkey(*)), " +
        "article:articles(title, hero_image_url, hero_media:media_assets!articles_hero_media_id_fkey(*)), " +
        "product_ranking:product_rankings(title, hero_image_url, hero_media:media_assets!product_rankings_hero_media_id_fkey(*)), " +
        "business:businesses(name, primary_image_url, primary_media:media_assets!businesses_primary_media_id_fkey(*)), " +
        "category:categories(name), place:places(name), product:products(name, image_url), " +
        "external_url" +
        ")",
    )
    .order("key");

  type ItemRow = {
    id: string;
    position: number;
    headline: string | null;
    image_url: string | null;
    image_media: MediaAsset | null;
    ranking: { title: string; hero_image_url: string | null; hero_media: MediaAsset | null } | null;
    article: { title: string; hero_image_url: string | null; hero_media: MediaAsset | null } | null;
    product_ranking: { title: string; hero_image_url: string | null; hero_media: MediaAsset | null } | null;
    business: { name: string; primary_image_url: string | null; primary_media: MediaAsset | null } | null;
    category: { name: string } | null;
    place: { name: string } | null;
    product: { name: string; image_url: string | null } | null;
    external_url: string | null;
  };

  type Row = EditorialSection & {
    editorial_section_items: { count: number }[];
    items: ItemRow[] | null;
  };

  return ((data ?? []) as unknown as Row[]).map((row) => {
    const items = [...(row.items ?? [])].sort((a, b) => a.position - b.position);

    return {
      ...row,
      item_count: row.editorial_section_items?.[0]?.count ?? 0,
      itemCount: row.editorial_section_items?.[0]?.count ?? 0,
      items: items.map((item) => ({
        id: item.id,
        image_media: item.image_media,
        image_url: item.image_url,
        // The same precedence the public resolver uses: an override wins, then
        // the target's own image.
        inheritedImageUrl:
          item.ranking?.hero_media?.storage_path
            ? null
            : (item.ranking?.hero_image_url ??
              item.article?.hero_image_url ??
              item.product_ranking?.hero_image_url ??
              item.business?.primary_image_url ??
              item.product?.image_url ??
              null),
        inheritedMedia:
          item.ranking?.hero_media ??
          item.article?.hero_media ??
          item.product_ranking?.hero_media ??
          item.business?.primary_media ??
          null,
        displayHeadline:
          item.headline ??
          item.ranking?.title ??
          item.article?.title ??
          item.product_ranking?.title ??
          item.business?.name ??
          item.category?.name ??
          item.place?.name ??
          item.product?.name ??
          item.external_url ??
          "Untitled",
      })),
    };
  });
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
      /*
       * Every target brings its own media, or the editor sees "no inherited
       * value" beside a record that plainly has a hero image.
       */
      "*, items:editorial_section_items(" +
        "*, image_media:media_assets!editorial_section_items_image_media_id_fkey(*), " +
        "ranking:rankings(*, hero_media:media_assets!rankings_hero_media_id_fkey(*)), " +
        "article:articles(*, hero_media:media_assets!articles_hero_media_id_fkey(*)), " +
        "business:businesses(*, primary_media:media_assets!businesses_primary_media_id_fkey(*)), " +
        "category:categories(*, hero_media:media_assets!categories_hero_media_id_fkey(*)), " +
        "place:places(*, hero_media:media_assets!places_hero_media_id_fkey(*)), " +
        "product_ranking:product_rankings(*, hero_media:media_assets!product_rankings_hero_media_id_fkey(*)), " +
        "product:products(*, offers:product_offers(*), image_media:media_assets!products_image_media_id_fkey(*))" +
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
/**
 * What a target would contribute if it were added, resolved at pick time.
 *
 * The picker used to show a title and a status, and the inherited image,
 * headline, dek and kicker only appeared once the item had been added — which
 * is backwards, because those are what an editor is choosing BETWEEN. Picking
 * blind and then finding the ranking has no hero image means removing the item
 * and starting again.
 *
 * These fields mirror `resolveItem()`. If that changes, this has to.
 */
export interface TargetPreview {
  /** What an editor calls this kind of thing. */
  typeLabel: string;
  headline: string;
  dek: string | null;
  kicker: string | null;
  imageUrl: string | null;
  status: string;
}

interface Candidate {
  id: string;
  status: string;
  preview: TargetPreview;
}

export interface TargetCandidates {
  rankings: (Candidate & { title: string; slug: string })[];
  businesses: (Candidate & { name: string; city: string | null })[];
  categories: (Candidate & { name: string; slug: string })[];
  places: (Candidate & { name: string; slug: string })[];
  productRankings: (Candidate & { title: string; slug: string })[];
  articles: (Candidate & { title: string; slug: string })[];
  /**
   * Products carry their offers so the picker can warn about one that has
   * nothing buyable behind it — that product is curatable but will not render.
   */
  products: (Candidate & {
    name: string;
    brand: string | null;
    offers: OfferCore[];
  })[];
}

export async function listTargetCandidates(): Promise<TargetCandidates> {
  const { supabase } = await requireAdmin();

  // Each select now pulls the hero image and the dek/kicker source alongside
  // the label, so the picker can show what would be inherited before anything
  // is added. Extra columns on queries that already run; no extra round trips.
  const [rankings, businesses, categories, places, productRankings, products, articles] =
    await Promise.all([
      supabase
        .from("rankings")
        .select(
          "id, title, slug, status, description, geography, hero_image_url, " +
            "hero_media:media_assets!rankings_hero_media_id_fkey(*)",
        )
        .order("title"),
      supabase
        .from("businesses")
        .select(
          "id, name, city, status, editorial_summary, description, primary_image_url, " +
            "primary_media:media_assets!businesses_primary_media_id_fkey(*)",
        )
        .order("name"),
      supabase
        .from("categories")
        .select(
          "id, name, slug, status, description, hero_image_url, " +
            "hero_media:media_assets!categories_hero_media_id_fkey(*)",
        )
        .order("name"),
      supabase
        .from("places")
        .select(
          "id, name, slug, status, description, type, hero_image_url, " +
            "hero_media:media_assets!places_hero_media_id_fkey(*)",
        )
        .order("name"),
      supabase
        .from("product_rankings")
        .select(
          "id, title, slug, status, description, hero_image_url, " +
            "hero_media:media_assets!product_rankings_hero_media_id_fkey(*)",
        )
        .order("title"),
      supabase
        .from("products")
        .select(
          "id, name, brand, status, summary, image_url, " +
            "offers:product_offers(affiliate_url, direct_url, availability)",
        )
        .order("name"),
      supabase
        .from("articles")
        .select(
          "id, title, slug, status, dek, kicker, hero_image_url, " +
            "hero_media:media_assets!articles_hero_media_id_fkey(*)",
        )
        .order("title"),
    ]);

  type Row = Record<string, unknown>;

  const image = (row: Row, mediaKey: string, urlKey: string) =>
    resolveImageUrl(
      (row[mediaKey] ?? null) as MediaAsset | null,
      (row[urlKey] ?? null) as string | null,
    );

  const text = (row: Row, key: string) =>
    ((row[key] ?? null) as string | null) || null;

  const withPreview = (
    rows: Row[],
    typeLabel: string,
    build: (row: Row) => Omit<TargetPreview, "typeLabel" | "status">,
  ) =>
    rows.map((row) => ({
      ...row,
      preview: {
        typeLabel,
        status: String(row.status ?? "draft"),
        ...build(row),
      },
    }));

  return {
    rankings: withPreview((rankings.data ?? []) as unknown as Row[], "Ranking", (r) => ({
      headline: String(r.title ?? ""),
      dek: text(r, "description"),
      kicker: text(r, "geography"),
      imageUrl: image(r, "hero_media", "hero_image_url"),
    })) as unknown as TargetCandidates["rankings"],

    businesses: withPreview((businesses.data ?? []) as unknown as Row[], "Business", (b) => ({
      headline: String(b.name ?? ""),
      dek: text(b, "editorial_summary") ?? text(b, "description"),
      kicker: text(b, "city"),
      imageUrl: image(b, "primary_media", "primary_image_url"),
    })) as unknown as TargetCandidates["businesses"],

    categories: withPreview((categories.data ?? []) as unknown as Row[], "Category", (c) => ({
      headline: String(c.name ?? ""),
      dek: text(c, "description"),
      kicker: null,
      imageUrl: image(c, "hero_media", "hero_image_url"),
    })) as unknown as TargetCandidates["categories"],

    places: withPreview((places.data ?? []) as unknown as Row[], "Place", (p) => ({
      headline: String(p.name ?? ""),
      dek: text(p, "description"),
      kicker: text(p, "type"),
      imageUrl: image(p, "hero_media", "hero_image_url"),
    })) as unknown as TargetCandidates["places"],

    productRankings: withPreview(
      (productRankings.data ?? []) as unknown as Row[],
      "Product guide",
      (g) => ({
        headline: String(g.title ?? ""),
        dek: text(g, "description"),
        kicker: null,
        imageUrl: image(g, "hero_media", "hero_image_url"),
      }),
    ) as unknown as TargetCandidates["productRankings"],

    products: withPreview((products.data ?? []) as unknown as Row[], "Product", (p) => ({
      headline: [p.brand, p.name].filter(Boolean).join(" "),
      dek: text(p, "summary"),
      kicker: text(p, "brand"),
      imageUrl: text(p, "image_url"),
    })) as unknown as TargetCandidates["products"],

    articles: withPreview((articles.data ?? []) as unknown as Row[], "Article", (a) => ({
      headline: String(a.title ?? ""),
      dek: text(a, "dek"),
      kicker: text(a, "kicker"),
      imageUrl: image(a, "hero_media", "hero_image_url"),
    })) as unknown as TargetCandidates["articles"],
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

/**
 * Which of these businesses came from a Yelp search.
 *
 * Drives the evidence line in the ranking editor: a business with a reference
 * can have review excerpts fetched for drafting, one added by hand cannot. One
 * query for the whole list rather than one per entry.
 */
export async function listYelpReferencedBusinessIds(
  businessIds: string[],
): Promise<string[]> {
  if (businessIds.length === 0) return [];

  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("external_business_refs")
    .select("business_id")
    .eq("provider", "yelp")
    .in("business_id", businessIds);

  return ((data ?? []) as { business_id: string }[]).map((row) => row.business_id);
}
