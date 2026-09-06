import type { RelatedLink } from "@/components/cards/RankingCard";
import type { TopRailItem } from "@/components/rankings/TopRail";
import type { RankingSummary, ResolvedSection } from "@/types/database";

/**
 * Maps a curated section onto the props the existing cards already take.
 *
 * The components are not changed by curation — each adapter produces exactly
 * the shape that component accepted before, so wiring a section in is a data
 * change rather than a visual one.
 *
 * Curated order is always preserved: `getSection` has already applied position,
 * scheduling and overrides, so nothing here re-sorts or re-filters.
 */

/** Right rail and any other generic list. Accepts every target type. */
export function toRailItems(section: ResolvedSection | null): TopRailItem[] {
  if (!section) return [];

  return section.items.map((item) => ({
    id: item.id,
    title: item.headline,
    href: item.href,
    imageUrl: item.imageUrl,
    imageSeed: item.id,
    detail: item.kicker,
  }));
}

export interface PickProps {
  key: string;
  title: string;
  subtitle: string | null;
  href: string;
  imageUrl: string | null;
  imageSeed: string;
}

/**
 * Top Picks cards. Accepts every target type.
 *
 * No target type carries a CTA label, because every destination a section can
 * hold is editorial — a ranking, a buying guide, a business, a category, a
 * place, or an external article. A buying guide is an article ABOUT products,
 * not a product, so it gets no "Check Price" either; commerce CTAs are rendered
 * per real offer by `products/ProductOfferButton`.
 */
export function toPickCards(
  section: ResolvedSection | null,
  max = 5,
): PickProps[] {
  if (!section) return [];

  return section.items.slice(0, max).map((item) => ({
    key: item.id,
    title: item.headline,
    subtitle: item.kicker,
    href: item.href,
    imageUrl: item.imageUrl,
    imageSeed: item.id,
  }));
}

/** "Related Reviews" and category heading text links — title plus href only. */
export function toRelatedLinks(section: ResolvedSection | null): RelatedLink[] {
  if (!section) return [];

  return section.items.map((item) => ({
    title: item.headline,
    href: item.href,
  }));
}

/**
 * Curated items that point at a LOCAL RANKING, resolved back to the full
 * ranking record from a list the page already loaded.
 *
 * RankingCard is ranking-shaped: it renders "N places" unguarded and links its
 * kicker to a local category. Handing it a synthesised summary for a product
 * guide would print "0 places" about a buying guide — inventing a fact about
 * the content. So the ranking-rendered slots take ranking targets only, and any
 * other target curated into them is skipped rather than mis-rendered.
 *
 * Curated order wins; the pool is only a lookup.
 */
export function pickRankingSummaries(
  section: ResolvedSection | null,
  pool: RankingSummary[],
): RankingSummary[] {
  if (!section) return [];

  const byHref = new Map(pool.map((ranking) => [`/best/${ranking.slug}`, ranking]));

  return section.items
    .filter((item) => item.targetType === "ranking")
    .map((item) => byHref.get(item.href))
    .filter((ranking): ranking is RankingSummary => ranking !== undefined);
}

/** True when a section exists and an editor has put something live in it. */
export function isCurated(section: ResolvedSection | null): boolean {
  return Boolean(section && section.items.length > 0);
}
