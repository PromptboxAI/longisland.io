import type { RelatedLink } from "@/components/cards/RankingCard";
import type { RankingSummary } from "@/types/database";

/**
 * TEMPORARY — a stopgap, not the model.
 *
 * Picks "Related Reviews" for the lead feature out of the rankings a page has
 * already fetched: same category, next two, in feed order. It exists only so
 * the slot is not empty before curation ships.
 *
 * Which rankings relate to which is an editorial decision. It belongs on the
 * ranking record, chosen in admin, alongside featured and trending — not
 * inferred from a shared category slug, which will happily pair a list with
 * whatever else happens to sit under it.
 *
 * Deliberately kept out of RankingCard: the card takes `relatedItems` and
 * renders what it is handed. When the curation model lands, the caller passes
 * curated items instead and this file is deleted — no visual change.
 */
export function deriveRelatedFallback(
  lead: RankingSummary | undefined,
  pool: RankingSummary[],
  limit = 2,
): RelatedLink[] {
  if (!lead?.category) return [];

  return pool
    .filter(
      (ranking) =>
        ranking.id !== lead.id &&
        ranking.category?.slug === lead.category?.slug,
    )
    .slice(0, limit)
    .map((ranking) => ({
      title: ranking.title,
      href: `/best/${ranking.slug}`,
    }));
}
