import type { RelatedLink } from "@/components/cards/RankingCard";
import type { TopRailItem } from "@/components/rankings/TopRail";
import { hasUsableOffer } from "@/lib/affiliate";
import type { RankingSummary, ResolvedSection } from "@/types/database";
import type { ProductWithOffers } from "@/types/products";

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

/** An editorial pick: a page we publish, linked through image and headline. */
export interface EditorialPick extends PickProps {
  kind: "editorial";
}

/** A commerce pick: an actual product, rendered with a merchant offer button. */
export interface ProductPick {
  kind: "product";
  key: string;
  product: ProductWithOffers;
  badge: string | null;
  note: string | null;
}

export type SectionPick = EditorialPick | ProductPick;

export interface PickOptions {
  /**
   * Drop every non-product target instead of rendering it as an editorial card.
   *
   * Set for `homepage_top_picks`, which is a commerce row: a product card and an
   * editorial card side by side disagree about image ratio, card height and
   * whether there is a button at all, and the row stops reading as one shelf.
   * The schema still accepts any target there — this is a presentation policy,
   * and the admin editor says plainly that such an item will not render.
   */
  productsOnly?: boolean;
}

/**
 * Top Picks cards. Accepts every target type, and renders by target type.
 *
 * A `product` target is the only commerce destination there is, and it is the
 * thing that enables the commerce treatment — not a label an editor typed, and
 * not the name of the section. Everything else is a page we publish (a ranking,
 * a buying guide, a business, a category, a place, an external article) and gets
 * the editorial card with no CTA. A buying guide is an article ABOUT products,
 * so it is editorial here even though its subject is commercial.
 *
 * A product with no usable offer is dropped rather than rendered without a
 * button; `hasUsableOffer` is the same predicate the admin picker warns with.
 */
export function toPickCards(
  section: ResolvedSection | null,
  max = 5,
  { productsOnly = false }: PickOptions = {},
): SectionPick[] {
  if (!section) return [];

  const picks: SectionPick[] = [];

  for (const item of section.items) {
    if (picks.length >= max) break;

    if (productsOnly && item.targetType !== "product") continue;

    if (item.targetType === "product") {
      // resolveItem only ever sets commerce on a product target.
      if (!item.commerce || !hasUsableOffer(item.commerce.offers)) continue;

      picks.push({
        kind: "product",
        key: item.id,
        product: item.commerce,
        badge: item.badge,
        note: item.dek,
      });
      continue;
    }

    picks.push({
      kind: "editorial",
      key: item.id,
      title: item.headline,
      subtitle: item.kicker,
      href: item.href,
      imageUrl: item.imageUrl,
      imageSeed: item.id,
    });
  }

  return picks;
}

/**
 * The products actually rendered by a set of picks.
 *
 * Disclosure is driven by what reaches the page, so a product dropped for having
 * no usable offer must not trigger one — and the existing `hasAffiliateLinks`
 * and `merchantDisclosures` take exactly this shape.
 */
export function pickedProducts(picks: SectionPick[]): ProductWithOffers[] {
  return picks
    .filter((pick): pick is ProductPick => pick.kind === "product")
    .map((pick) => pick.product);
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
