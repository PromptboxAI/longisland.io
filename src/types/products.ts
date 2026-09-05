/**
 * Hand-written database types for the product and affiliate layer.
 *
 * These mirror `supabase/migrations/2026020100000*`. Kept in their own file
 * rather than appended to `./database.ts` so the local-business types and the
 * commerce types can move independently.
 */

import type { Category, Place, PublishStatus } from "@/types/database";

export type OfferAvailability =
  | "in_stock"
  | "out_of_stock"
  | "preorder"
  | "discontinued";

export type AffiliateNetwork =
  | "amazon"
  | "tiktok_shop"
  | "walmart"
  | "target"
  | "home_depot"
  | "lowes"
  | "impact"
  | "cj"
  | "shareasale"
  | "awin"
  | "rakuten"
  | "direct";

/** Host page types a product can be recommended on. */
export type RecommendationContentType =
  | "ranking"
  | "place"
  | "category"
  | "business";

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  icon: string | null;
  status: PublishStatus;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  category_id: string | null;
  short_description: string | null;
  editorial_summary: string | null;
  image_url: string | null;
  status: PublishStatus;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface AffiliateMerchant {
  id: string;
  name: string;
  slug: string;
  network: AffiliateNetwork;
  homepage_url: string | null;
  cta_label: string | null;
  disclosure_note: string | null;
  status: PublishStatus;
  created_at: string;
  updated_at: string;
}

export interface ProductOffer {
  id: string;
  product_id: string;
  /** Slug of a row in `affiliate_merchants`. */
  merchant: string;
  merchant_product_id: string | null;
  affiliate_url: string | null;
  direct_url: string | null;
  /** Postgres `numeric` arrives as a string or number depending on the driver. */
  price: number | string | null;
  currency: string;
  availability: OfferAvailability | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductRanking {
  id: string;
  title: string;
  slug: string;
  category_id: string | null;
  local_category_id: string | null;
  description: string | null;
  intro: string | null;
  methodology: string | null;
  status: PublishStatus;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductRankingEntry {
  id: string;
  product_ranking_id: string;
  product_id: string;
  position: number;
  badge: string | null;
  best_for: string | null;
  editorial_reason: string | null;
  /** jsonb arrays of short strings. */
  pros: string[];
  cons: string[];
  created_at: string;
  updated_at: string;
}

export interface ContentProductRecommendation {
  id: string;
  content_type: RecommendationContentType;
  content_id: string;
  product_id: string;
  position: number;
  context_label: string | null;
  editorial_note: string | null;
  created_at: string;
}

/* -------------------------------------------------------------------------- */
/* View models — what page components actually receive.                        */
/* -------------------------------------------------------------------------- */

/** An offer joined to the merchant row that supplies its display name and CTA. */
export interface OfferWithMerchant extends ProductOffer {
  merchantRecord: AffiliateMerchant | null;
}

/** A product with everywhere you can buy it, cheapest usable offer first. */
export interface ProductWithOffers extends Product {
  offers: OfferWithMerchant[];
}

/** One ranked entry in a buying guide, joined to its product. */
export interface ProductRankingEntryWithProduct extends ProductRankingEntry {
  product: ProductWithOffers;
}

/** A buying guide joined to its entries and categories. */
export interface ProductRankingWithEntries extends ProductRanking {
  category: ProductCategory | null;
  localCategory: Pick<Category, "id" | "name" | "slug"> | null;
  entries: ProductRankingEntryWithProduct[];
}

/** Minimal shape used by index cards. */
export interface ProductRankingSummary {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  author_name: string | null;
  published_at: string | null;
  updated_at: string;
  entry_count: number;
  category: Pick<ProductCategory, "name" | "slug"> | null;
}

/** A product recommended on a host page, with the editorial context for it. */
export interface RecommendedProduct extends ContentProductRecommendation {
  product: ProductWithOffers;
}

/** A local guide surfaced from a product guide, and vice versa. */
export interface RelatedLocalRanking {
  title: string;
  slug: string;
  description: string | null;
  place: Pick<Place, "name" | "slug"> | null;
}

/**
 * Badges a guide entry may carry. Free text in the database, curated here so the
 * quick-picks rail at the top of a guide has a stable set to lay out.
 *
 * The order is the order they appear in the rail.
 */
export const PRODUCT_BADGES = [
  "Our Pick",
  "Best Value",
  "Best Premium",
  "Best for Families",
  "Best for Travel",
  "Also Great",
] as const;

export type ProductBadge = (typeof PRODUCT_BADGES)[number];
