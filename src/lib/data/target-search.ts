import "server-only";

import { requireAdmin } from "@/lib/auth";
import { resolveImageUrl } from "@/lib/media/resolve";
import type { MediaAsset } from "@/types/media";

/**
 * Server-side search over everything an editorial placement can point at.
 *
 * The picker this replaces loaded every ranking, article, business, category,
 * place, guide and product into the browser and filtered them with a substring
 * match. That is fine at forty records and unusable at four thousand — the page
 * carries the whole catalogue before an editor has typed anything, and the
 * filter that runs is the one thing a database is good at.
 *
 * So the search moves to the database and the results come back a page at a
 * time. Three rules shape the design:
 *
 * ONLY WHAT THE PLACEMENT ACCEPTS. A commerce row cannot hold a restaurant
 * ranking, so Top Picks does not query the rankings table at all. Narrowing the
 * question is both faster and the only way the picker can be honest about what
 * it is offering.
 *
 * ENOUGH TO TELL TWO THINGS APART. A title and a status are not enough when
 * three products share a name and differ by brand. Every row carries its
 * thumbnail, type, status and the one contextual field that distinguishes it —
 * brand for a product, place for local content.
 *
 * ORDERED BY WHAT YOU JUST TOUCHED. Recently updated first, because the thing
 * an editor is looking for is almost always the thing they were last working
 * on.
 */

export type TargetKind =
  | "ranking"
  | "article"
  | "product_ranking"
  | "product"
  | "business"
  | "category"
  | "place";

export type TargetSort = "updated" | "published" | "alpha";

export interface TargetResult {
  id: string;
  kind: TargetKind;
  /** What an editor calls this kind of thing. */
  typeLabel: string;
  title: string;
  /** Brand for a product, town for local content — whatever tells two apart. */
  context: string | null;
  /** The category it sits in, when it has one. */
  categoryName: string | null;
  status: string;
  slug: string | null;
  imageUrl: string | null;
  /** What the item would inherit. Mirrors resolveItem(). */
  dek: string | null;
  kicker: string | null;
  updatedAt: string | null;
}

export interface TargetQuery {
  kinds: TargetKind[];
  query?: string;
  status?: "all" | "published" | "draft";
  sort?: TargetSort;
  /** Rows to skip. The picker pages rather than loading a catalogue. */
  offset?: number;
  limit?: number;
}

export interface TargetSearchResult {
  results: TargetResult[];
  /** Whether another page exists, so Load more can hide itself honestly. */
  hasMore: boolean;
}

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<TargetKind, string> = {
  ranking: "Ranking",
  article: "Article",
  product_ranking: "Buying guide",
  product: "Product",
  business: "Business",
  category: "Category",
  place: "Place",
};

/*
 * Which table each kind lives in, what to select from it, and how to turn a row
 * into a result. Keeping this as data rather than a switch is what lets the
 * query loop stay one paragraph long and lets a new target type be one entry.
 */
interface KindSpec {
  table: string;
  select: string;
  /** Columns a text search should look at. */
  searchable: string[];
  /** Column to order by for A–Z. */
  alphaColumn: string;
  toResult: (row: Record<string, unknown>) => Omit<TargetResult, "kind" | "typeLabel">;
}

const str = (row: Record<string, unknown>, key: string) =>
  ((row[key] ?? null) as string | null) || null;

const media = (row: Record<string, unknown>, mediaKey: string, urlKey: string) =>
  resolveImageUrl(
    (row[mediaKey] ?? null) as MediaAsset | null,
    (row[urlKey] ?? null) as string | null,
  );

const categoryName = (row: Record<string, unknown>) =>
  ((row.category as { name?: string } | null)?.name ?? null) || null;

const SPECS: Record<TargetKind, KindSpec> = {
  ranking: {
    table: "rankings",
    select:
      "id, title, slug, status, description, geography, hero_image_url, updated_at, " +
      "category:categories(name), place:places(name), " +
      "hero_media:media_assets!rankings_hero_media_id_fkey(*)",
    searchable: ["title", "slug"],
    alphaColumn: "title",
    toResult: (r) => ({
      id: String(r.id),
      title: String(r.title ?? ""),
      context: ((r.place as { name?: string } | null)?.name ?? null) || str(r, "geography"),
      categoryName: categoryName(r),
      status: String(r.status ?? "draft"),
      slug: str(r, "slug"),
      imageUrl: media(r, "hero_media", "hero_image_url"),
      dek: str(r, "description"),
      kicker: str(r, "geography"),
      updatedAt: str(r, "updated_at"),
    }),
  },

  article: {
    table: "articles",
    select:
      "id, title, slug, status, dek, kicker, hero_image_url, updated_at, " +
      "category:categories(name), " +
      "hero_media:media_assets!articles_hero_media_id_fkey(*)",
    searchable: ["title", "slug"],
    alphaColumn: "title",
    toResult: (r) => ({
      id: String(r.id),
      title: String(r.title ?? ""),
      context: str(r, "kicker"),
      categoryName: categoryName(r),
      status: String(r.status ?? "draft"),
      slug: str(r, "slug"),
      imageUrl: media(r, "hero_media", "hero_image_url"),
      dek: str(r, "dek"),
      kicker: str(r, "kicker"),
      updatedAt: str(r, "updated_at"),
    }),
  },

  product_ranking: {
    table: "product_rankings",
    select:
      "id, title, slug, status, description, hero_image_url, updated_at, " +
      "category:categories(name), " +
      "hero_media:media_assets!product_rankings_hero_media_id_fkey(*)",
    searchable: ["title", "slug"],
    alphaColumn: "title",
    toResult: (r) => ({
      id: String(r.id),
      title: String(r.title ?? ""),
      context: null,
      categoryName: categoryName(r),
      status: String(r.status ?? "draft"),
      slug: str(r, "slug"),
      imageUrl: media(r, "hero_media", "hero_image_url"),
      dek: str(r, "description"),
      kicker: null,
      updatedAt: str(r, "updated_at"),
    }),
  },

  product: {
    table: "products",
    select:
      "id, name, brand, slug, status, summary, image_url, updated_at, " +
      "category:categories!products_category_id_fkey(name)",
    // Brand matters here: "Vertuo Pop" finds nothing if brand is not searched.
    searchable: ["name", "brand", "slug"],
    alphaColumn: "name",
    toResult: (r) => ({
      id: String(r.id),
      title: [str(r, "brand"), String(r.name ?? "")].filter(Boolean).join(" "),
      context: str(r, "brand"),
      categoryName: categoryName(r),
      status: String(r.status ?? "draft"),
      slug: str(r, "slug"),
      imageUrl: str(r, "image_url"),
      dek: str(r, "summary"),
      kicker: str(r, "brand"),
      updatedAt: str(r, "updated_at"),
    }),
  },

  business: {
    table: "businesses",
    select:
      "id, name, slug, status, city, editorial_summary, description, primary_image_url, updated_at, " +
      "category:categories(name), " +
      "primary_media:media_assets!businesses_primary_media_id_fkey(*)",
    searchable: ["name", "city", "slug"],
    alphaColumn: "name",
    toResult: (r) => ({
      id: String(r.id),
      title: String(r.name ?? ""),
      context: str(r, "city"),
      categoryName: categoryName(r),
      status: String(r.status ?? "draft"),
      slug: str(r, "slug"),
      imageUrl: media(r, "primary_media", "primary_image_url"),
      dek: str(r, "editorial_summary") ?? str(r, "description"),
      kicker: str(r, "city"),
      updatedAt: str(r, "updated_at"),
    }),
  },

  category: {
    table: "categories",
    select:
      "id, name, slug, status, description, hero_image_url, updated_at, " +
      "hero_media:media_assets!categories_hero_media_id_fkey(*)",
    searchable: ["name", "slug"],
    alphaColumn: "name",
    toResult: (r) => ({
      id: String(r.id),
      title: String(r.name ?? ""),
      context: null,
      categoryName: null,
      status: String(r.status ?? "draft"),
      slug: str(r, "slug"),
      imageUrl: media(r, "hero_media", "hero_image_url"),
      dek: str(r, "description"),
      kicker: null,
      updatedAt: str(r, "updated_at"),
    }),
  },

  place: {
    table: "places",
    select:
      "id, name, slug, status, description, type, hero_image_url, updated_at, " +
      "hero_media:media_assets!places_hero_media_id_fkey(*)",
    searchable: ["name", "slug"],
    alphaColumn: "name",
    toResult: (r) => ({
      id: String(r.id),
      title: String(r.name ?? ""),
      context: str(r, "type"),
      categoryName: null,
      status: String(r.status ?? "draft"),
      slug: str(r, "slug"),
      imageUrl: media(r, "hero_media", "hero_image_url"),
      dek: str(r, "description"),
      kicker: str(r, "type"),
      updatedAt: str(r, "updated_at"),
    }),
  },
};

/** PostgREST `or` needs commas and parentheses escaped out of the value. */
function escapeForOr(value: string): string {
  return value.replace(/[(),*]/g, " ").trim();
}

export async function searchTargets(
  input: TargetQuery,
): Promise<TargetSearchResult> {
  const { supabase } = await requireAdmin();

  const limit = Math.min(Math.max(input.limit ?? PAGE_SIZE, 1), 50);
  const offset = Math.max(input.offset ?? 0, 0);
  const sort = input.sort ?? "updated";
  const needle = escapeForOr(input.query?.trim() ?? "");

  /*
   * One request per eligible kind, then merged.
   *
   * A single query would need a view or a union that does not exist, and the
   * alternative — one round trip per kind — is a handful of parallel indexed
   * lookups against tables that are small individually. Each is asked for
   * `limit + 1` rows past the offset so the merged set can still fill a page
   * after interleaving, and so `hasMore` is a fact rather than a guess.
   */
  const perKind = await Promise.all(
    input.kinds.map(async (kind) => {
      const spec = SPECS[kind];
      if (!spec) return [] as TargetResult[];

      let request = supabase.from(spec.table).select(spec.select);

      if (needle) {
        request = request.or(
          spec.searchable.map((column) => `${column}.ilike.%${needle}%`).join(","),
        );
      }

      if (input.status === "published") request = request.eq("status", "published");
      else if (input.status === "draft") request = request.neq("status", "published");

      if (sort === "alpha") {
        request = request.order(spec.alphaColumn, { ascending: true });
      } else if (sort === "published") {
        // Not every table has published_at; updated_at is the honest stand-in
        // on those, and ordering never fails for want of a column.
        request = request.order("updated_at", { ascending: false });
      } else {
        request = request.order("updated_at", { ascending: false });
      }

      const { data, error } = await request.range(0, offset + limit);
      if (error) return [] as TargetResult[];

      return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
        kind,
        typeLabel: TYPE_LABELS[kind],
        ...spec.toResult(row),
      }));
    }),
  );

  const merged = perKind.flat();

  merged.sort((a, b) => {
    if (sort === "alpha") return a.title.localeCompare(b.title);
    return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
  });

  const page = merged.slice(offset, offset + limit);
  return { results: page, hasMore: merged.length > offset + limit };
}
