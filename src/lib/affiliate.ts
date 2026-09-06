import type {
  AffiliateMerchant,
  OfferWithMerchant,
  ProductOffer,
  ProductWithOffers,
} from "@/types/products";

/**
 * Affiliate rules in one place.
 *
 * Everything here is a policy decision rather than a display detail: what a link
 * says, what it discloses, whether a price may be shown at all. Components read
 * from this module so a rule changes once rather than in nine templates.
 */

/* -------------------------------------------------------------------------- */
/* Disclosure                                                                  */
/* -------------------------------------------------------------------------- */

/** Rendered above any content containing affiliate links. */
export const AFFILIATE_DISCLOSURE =
  "LongIsland.io may earn a commission when you buy through links on our site. " +
  "This does not affect our editorial recommendations.";

/** Longer form for /affiliate-disclosure and the foot of a guide. */
export const AFFILIATE_DISCLOSURE_LONG =
  "Some links on this page are affiliate links. If you buy something through " +
  "one, LongIsland.io may earn a commission at no additional cost to you. " +
  "Commissions never determine which products we recommend, what order they " +
  "appear in, or what we say about them.";

/**
 * Every affiliate link carries these.
 *
 * `sponsored` is what Google asks for on a monetised outbound link, and it is
 * the honest label; `nofollow` is belt-and-braces for older crawlers. `noopener`
 * and `noreferrer` are the usual protections for a `target="_blank"` link.
 */
export const AFFILIATE_LINK_REL = "sponsored nofollow noopener noreferrer";

/* -------------------------------------------------------------------------- */
/* Call to action                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Merchant-neutral button wording.
 *
 * Deliberately never "Buy now" or "Best price" — the first pressures, the second
 * is a claim we cannot substantiate at render time.
 */
export const CTA_LABELS = ["Check Price", "View Deal", "Shop Now"] as const;

export const DEFAULT_CTA_LABEL = CTA_LABELS[0];

export function ctaLabel(offer: OfferWithMerchant): string {
  const label = offer.merchantRecord?.cta_label?.trim();
  return label && label.length > 0 ? label : DEFAULT_CTA_LABEL;
}

/** Display name for a merchant, falling back to the stored slug. */
export function merchantName(offer: OfferWithMerchant): string {
  const name = offer.merchantRecord?.name?.trim();
  if (name && name.length > 0) return name;

  // A slug we have no merchant row for still has to read like a name.
  return offer.merchant
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/* -------------------------------------------------------------------------- */
/* Merchant button branding                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Hex guard.
 *
 * The colour reaches an inline `style`, so it is re-validated here even though
 * the column has a check constraint. A value that ever arrived from anywhere
 * but that column must not be able to smuggle arbitrary CSS into the attribute.
 */
const HEX = /^#[0-9a-f]{6}$/i;

function hexOrNull(value: string | null | undefined): string | null {
  return value && HEX.test(value) ? value : null;
}

export interface MerchantButtonTheme {
  background: string;
  text: string;
  hover: string;
}

/**
 * The merchant's own colours for a buy button, or null for the house style.
 *
 * A reader should be able to tell where a link goes before clicking it, so an
 * Amazon button is Amazon yellow and a TikTok Shop button is TikTok red. The
 * palette lives on the merchant row, not in a map here, so adding a merchant
 * with its own colours is a row rather than a deploy.
 *
 * Buttons carry the merchant NAME on the merchant's colour and never its logo
 * or wordmark artwork — those carry separate brand-guideline obligations per
 * network, and a coloured button with a name is what the programmes actually
 * permit without asset licensing.
 */
export function merchantButtonTheme(
  offer: OfferWithMerchant,
): MerchantButtonTheme | null {
  const record = offer.merchantRecord;
  const background = hexOrNull(record?.brand_color);
  if (!background) return null;

  return {
    background,
    text: hexOrNull(record?.brand_text_color) ?? "#ffffff",
    hover: hexOrNull(record?.brand_hover_color) ?? background,
  };
}

/* -------------------------------------------------------------------------- */
/* Links                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Where a buy button actually points.
 *
 * The affiliate URL when we have one, otherwise the plain merchant URL. Losing a
 * tag should cost us a commission, not cost the reader the buying option.
 */
export function offerUrl(offer: OfferCore): string | null {
  return offer.affiliate_url ?? offer.direct_url ?? null;
}

/** Whether following this offer earns us anything. Drives disclosure. */
export function isAffiliateOffer(offer: ProductOffer): boolean {
  return Boolean(offer.affiliate_url);
}

/**
 * Whether a page needs an affiliate disclosure.
 *
 * Disclosure is triggered by the presence of a monetised link, not by the page
 * type, so a guide whose offers are all untagged does not claim a commercial
 * relationship it does not have — and one that gains a tagged offer discloses
 * without anyone remembering to add a component.
 */
export function hasAffiliateLinks(products: ProductWithOffers[]): boolean {
  return products.some((product) => product.offers.some(isAffiliateOffer));
}

/** Network-required wording for the merchants actually linked on a page. */
export function merchantDisclosures(products: ProductWithOffers[]): string[] {
  const notes = new Set<string>();

  for (const product of products) {
    for (const offer of product.offers) {
      if (!isAffiliateOffer(offer)) continue;
      const note = offer.merchantRecord?.disclosure_note?.trim();
      if (note) notes.add(note);
    }
  }
  return [...notes];
}

/* -------------------------------------------------------------------------- */
/* Prices                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * How long a manually checked price stays displayable.
 *
 * A price on a page is a factual claim. We have no price feed yet, so the number
 * is only as good as the last time an editor looked at it; after this window we
 * hide it and let the button speak instead. Shorten this, never lengthen it.
 */
export const PRICE_FRESHNESS_DAYS = 14;

/**
 * Merchants whose prices we may not republish.
 *
 * The Amazon Associates operating agreement only permits displaying prices
 * sourced from the Product Advertising API and kept continuously current. We
 * pull nothing from that API, so we show no Amazon price at all rather than a
 * hand-typed one. Remove a network from this set only once a live feed backs it.
 */
const PRICE_DISPLAY_BLOCKED_NETWORKS = new Set(["amazon"]);

function priceAsNumber(price: ProductOffer["price"]): number | null {
  if (price === null || price === undefined) return null;
  const value = typeof price === "string" ? Number.parseFloat(price) : price;
  return Number.isFinite(value) ? value : null;
}

export function isPriceFresh(lastCheckedAt: string | null): boolean {
  if (!lastCheckedAt) return false;

  const checked = new Date(lastCheckedAt).getTime();
  if (Number.isNaN(checked)) return false;

  return Date.now() - checked <= PRICE_FRESHNESS_DAYS * 86_400_000;
}

/** Whether this offer's price may be rendered. */
export function canDisplayPrice(offer: OfferWithMerchant): boolean {
  const network = offer.merchantRecord?.network;
  if (network && PRICE_DISPLAY_BLOCKED_NETWORKS.has(network)) return false;

  return priceAsNumber(offer.price) !== null && isPriceFresh(offer.last_checked_at);
}

export function formatPrice(
  price: ProductOffer["price"],
  currency = "USD",
): string | null {
  const value = priceAsNumber(price);
  if (value === null) return null;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    // Whole-dollar prices read better without the trailing zeros.
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** The formatted price for an offer, or null when it may not be shown. */
export function displayPrice(offer: OfferWithMerchant): string | null {
  if (!canDisplayPrice(offer)) return null;
  return formatPrice(offer.price, offer.currency);
}

/* -------------------------------------------------------------------------- */
/* Offer selection                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The fields any offer-usability question needs.
 *
 * Narrower than ProductOffer so the admin picker can ask the same question of a
 * lightweight candidate row. The rule lives here once: an editor's warning and
 * the renderer's decision to skip a tile must never disagree.
 */
export type OfferCore = Pick<
  ProductOffer,
  "affiliate_url" | "direct_url" | "availability"
>;

/** Availability we are willing to send a reader to. */
function isBuyable(offer: OfferCore): boolean {
  return offer.availability !== "out_of_stock" && offer.availability !== "discontinued";
}

/**
 * Whether this product has somewhere we can actually send a reader.
 *
 * A curated product with no usable offer renders no tile: a commerce card whose
 * button is missing is a dead end, and pointing the button at an out-of-stock
 * listing is worse. RLS cannot check this — it can see products.status, not a
 * merchant's stock — so the renderer skips and the admin picker warns.
 */
export function hasUsableOffer(offers: OfferCore[]): boolean {
  return offers.some((offer) => isBuyable(offer) && offerUrl(offer) !== null);
}

/**
 * Orders a product's offers for display.
 *
 * Buyable first, then a displayable price ascending, then the rest in a stable
 * order. This is the seam the "choose the best available offer dynamically" goal
 * grows into: once a price feed exists, only this comparator changes.
 */
export function sortOffers(offers: OfferWithMerchant[]): OfferWithMerchant[] {
  return [...offers].sort((a, b) => {
    if (isBuyable(a) !== isBuyable(b)) return isBuyable(a) ? -1 : 1;

    const priceA = canDisplayPrice(a) ? priceAsNumber(a.price) : null;
    const priceB = canDisplayPrice(b) ? priceAsNumber(b.price) : null;

    if (priceA !== null && priceB !== null && priceA !== priceB) {
      return priceA - priceB;
    }
    if (priceA !== null && priceB === null) return -1;
    if (priceA === null && priceB !== null) return 1;

    return merchantName(a).localeCompare(merchantName(b));
  });
}

/** The offer a primary buy button should point at, if there is one. */
export function bestOffer(offers: OfferWithMerchant[]): OfferWithMerchant | null {
  const usable = sortOffers(offers).filter((offer) => offerUrl(offer) !== null);
  return usable[0] ?? null;
}

/** Merchant rows keyed by slug, for joining offers to their display config. */
export function indexMerchants(
  merchants: AffiliateMerchant[],
): Map<string, AffiliateMerchant> {
  return new Map(merchants.map((merchant) => [merchant.slug, merchant]));
}

/* -------------------------------------------------------------------------- */
/* Editorial guardrails                                                        */
/* -------------------------------------------------------------------------- */

/**
 * How the guide describes its own research.
 *
 * We do not buy and test products, so no template may imply that we did. This is
 * the default methodology line and the wording the admin editor suggests; an
 * editor can replace it with something more specific, but never with a testing
 * claim that is not true.
 */
export const PRODUCT_RESEARCH_NOTICE =
  "Our picks are researched, not lab-tested. We read specifications, owner " +
  "reviews and expert coverage, and we weight what actually matters on Long " +
  "Island — sand, salt, wind and the walk from the parking lot.";
