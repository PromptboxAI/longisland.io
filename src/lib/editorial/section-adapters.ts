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
  ctaLabel: string;
}

/**
 * Top Picks cards. Accepts every target type.
 *
 * A product guide gets the commerce CTA; everything else keeps the editorial
 * one, because "Check Price" over a ranking of local restaurants promises
 * something the page does not do.
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
    ctaLabel: item.targetType === "product_ranking" ? "Check Price" : "Read the list",
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
