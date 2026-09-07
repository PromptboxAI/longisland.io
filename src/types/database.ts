import type { ProductRanking, ProductWithOffers } from "@/types/products";
import type { MediaAsset } from "@/types/media";
import type { Article } from "@/types/articles";

/**
 * Hand-written database types.
 *
 * These mirror `supabase/migrations/*`. If you regenerate types with the
 * Supabase CLI (`supabase gen types typescript`), replace this file wholesale
 * rather than editing both.
 */

export type PublishStatus = "draft" | "review" | "published" | "archived";
export type NominationStatus = "new" | "reviewing" | "approved" | "rejected";
export type LeadStatus = "new" | "contacted" | "qualified" | "closed" | "archived";
export type ContentStatus = "idea" | "script" | "media" | "ready" | "published";
export type PlaceType = "island" | "county" | "region" | "town" | "village" | "hamlet";

export interface Business {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  county: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  category_id: string | null;
  subcategory: string | null;
  description: string | null;
  editorial_summary: string | null;
  status: PublishStatus;
  featured: boolean;
  claimed: boolean;
  primary_image_url: string | null;
  created_at: string;
  updated_at: string;
  primary_media_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  icon: string | null;
  hero_image_url: string | null;
  status: PublishStatus;
  created_at: string;
  updated_at: string;
  hero_media_id: string | null;
  featured: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
}

export interface Place {
  id: string;
  name: string;
  slug: string;
  type: PlaceType;
  parent_id: string | null;
  county: string | null;
  description: string | null;
  hero_image_url: string | null;
  status: PublishStatus;
  created_at: string;
  updated_at: string;
  hero_media_id: string | null;
  featured: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
}

export interface ExternalBusinessRef {
  id: string;
  business_id: string;
  provider: string;
  external_id: string;
  external_url: string | null;
  last_synced_at: string | null;
  created_at: string;
}

export interface Ranking {
  id: string;
  title: string;
  slug: string;
  category_id: string | null;
  place_id: string | null;
  geography: string | null;
  description: string | null;
  intro: string | null;
  methodology: string | null;
  status: PublishStatus;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  hero_media_id: string | null;
  hero_image_url: string | null;
  og_image_media_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

export interface RankingEntry {
  id: string;
  ranking_id: string;
  business_id: string;
  position: number;
  editorial_reason: string | null;
  best_for: string | null;
  badge: string | null;
  editor_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Nomination {
  id: string;
  business_name: string;
  town: string | null;
  category: string | null;
  website: string | null;
  reason: string | null;
  submitter_name: string | null;
  email: string | null;
  status: NominationStatus;
  created_at: string;
}

export interface Lead {
  id: string;
  type: string;
  name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  category: string | null;
  interest: string | null;
  budget: string | null;
  message: string | null;
  status: LeadStatus;
  created_at: string;
}

export interface ContentItem {
  id: string;
  ranking_id: string | null;
  platform: string | null;
  content_type: string | null;
  script: string | null;
  caption: string | null;
  video_url: string | null;
  status: ContentStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailSubscriber {
  id: string;
  email: string;
  source: string | null;
  created_at: string;
}

/* -------------------------------------------------------------------------- */
/* View models — what page components actually receive.                        */
/* -------------------------------------------------------------------------- */

/** A ranking entry joined to its business, as rendered on a ranking page. */
export interface RankingEntryWithBusiness extends RankingEntry {
  business: Business & { primary_media?: MediaAsset | null };
}

/** A ranking joined to its entries, category and place. */
export interface RankingWithEntries extends Ranking {
  category: Category | null;
  place: Place | null;
  entries: RankingEntryWithBusiness[];
  hero_media: MediaAsset | null;
  og_media: MediaAsset | null;
}

/** Where a business appears across published rankings. */
export interface BusinessAppearance {
  ranking: Ranking;
  position: number;
  badge: string | null;
}

/** Minimal shape used by list/grid cards so pages stay cheap to render. */
export interface RankingSummary {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  geography: string | null;
  author_name: string | null;
  published_at: string | null;
  updated_at: string;
  entry_count: number;
  category: Pick<Category, "name" | "slug"> | null;
  place: Pick<Place, "name" | "slug"> | null;
  /** The library asset, when one is set. Wins over hero_image_url. */
  hero_media: MediaAsset | null;
  hero_image_url: string | null;
}

/** Editorial badges an entry may carry. Free text in the DB, curated here. */
export const RANKING_BADGES = [
  "Best Overall",
  "Best for Families",
  "Best Date Night",
  "Hidden Gem",
  "Best Value",
  "Local Favorite",
] as const;

export type RankingBadge = (typeof RANKING_BADGES)[number];

/* -------------------------------------------------------------------------- */
/* Editorial curation                                                          */
/* -------------------------------------------------------------------------- */

export type SectionScope = "global" | "category" | "place";
export type SectionLayout = "feature" | "rail" | "grid" | "link_row";

/** Destination kinds an editorial item may point at. */
export type SectionTargetType =
  | "ranking"
  | "article"
  | "business"
  | "category"
  | "place"
  | "product_ranking"
  | "product"
  | "external_url";

/**
 * Target types that are pages we publish.
 *
 * These render as editorial cards: the image and headline link to the page and
 * there is no commerce CTA. A `product_ranking` is here deliberately — a buying
 * guide is an article ABOUT products, not a product.
 */
export const EDITORIAL_TARGET_TYPES: SectionTargetType[] = [
  "ranking",
  "article",
  "business",
  "category",
  "place",
  "product_ranking",
  "external_url",
];

export function isCommerceTarget(type: SectionTargetType): boolean {
  return type === "product";
}

export interface EditorialSection {
  id: string;
  key: string;
  scope_type: SectionScope;
  category_id: string | null;
  place_id: string | null;
  title: string | null;
  description: string | null;
  layout: SectionLayout;
  max_items: number | null;
  status: PublishStatus;
  created_at: string;
  updated_at: string;
}

export interface EditorialSectionItem {
  id: string;
  section_id: string;
  position: number;
  ranking_id: string | null;
  business_id: string | null;
  category_id: string | null;
  place_id: string | null;
  product_ranking_id: string | null;
  product_id: string | null;
  external_url: string | null;
  /** Nullable overrides — null means inherit from the target. */
  kicker: string | null;
  headline: string | null;
  dek: string | null;
  image_url: string | null;
  badge: string | null;
  is_sponsored: boolean;
  status: PublishStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  image_media_id: string | null;
  article_id: string | null;
}

/** An item with its target rows embedded, as the queries return it. */
export interface EditorialSectionItemWithTargets extends EditorialSectionItem {
  ranking: (Ranking & { hero_media: MediaAsset | null }) | null;
  business: (Business & { primary_media: MediaAsset | null }) | null;
  category: (Category & { hero_media: MediaAsset | null }) | null;
  place: (Place & { hero_media: MediaAsset | null }) | null;
  product_ranking: (ProductRanking & { hero_media: MediaAsset | null }) | null;
  product: ProductWithOffers | null;
  article: (Article & { hero_media: MediaAsset | null }) | null;
  image_media: MediaAsset | null;
}

/**
 * What a renderer consumes: every field already resolved.
 *
 * `headline`, `dek`, `kicker`, `imageUrl` are the override if one was set, and
 * the target's own value otherwise — the inheritance is applied once here so no
 * component reimplements it.
 */
export interface ResolvedSectionItem {
  id: string;
  position: number;
  targetType: SectionTargetType;
  /** Where the item links. External URLs are passed through verbatim. */
  href: string;
  kicker: string | null;
  headline: string;
  dek: string | null;
  imageUrl: string | null;
  badge: string | null;
  isSponsored: boolean;
  /**
   * Present only on a `product` target: the product with its offers and their
   * merchant rows, ready for the commerce card.
   *
   * Carrying it here rather than re-fetching in the page keeps one round trip,
   * and keeps every offer/merchant rule inside the components that already own
   * them. Null on every editorial target, which is what makes "no CTA on an
   * article" true by construction rather than by remembering.
   */
  commerce: ProductWithOffers | null;
  /** Focal point from the resolved media asset, as CSS object-position. */
  objectPosition: string | null;
  /** True when the field came from an override rather than the target. */
  overrides: {
    kicker: boolean;
    headline: boolean;
    dek: boolean;
    imageUrl: boolean;
  };
}

/** A section plus its resolved, ordered, currently-live items. */
export interface ResolvedSection {
  id: string;
  key: string;
  scope: SectionScope;
  title: string | null;
  description: string | null;
  layout: SectionLayout;
  maxItems: number | null;
  items: ResolvedSectionItem[];
}

export const SECTION_LAYOUTS: SectionLayout[] = [
  "feature",
  "rail",
  "grid",
  "link_row",
];

/** Keys the site is expected to ask for. Free text in the DB; curated here. */
export const SECTION_KEYS = [
  "homepage_primary",
  "homepage_latest",
  "homepage_top_rail",
  "homepage_top_picks",
  "homepage_trending",
  "category_module",
  "related_content",
  "category_links",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];
