import {
  canDisplayPrice,
  offerUrl,
  merchantName,
} from "@/lib/affiliate";
import { site } from "@/lib/site";
import type {
  OfferWithMerchant,
  ProductRankingWithEntries,
  ProductWithOffers,
} from "@/types/products";

/**
 * Structured data for the product layer.
 *
 * Same rule as the local builders in ./json-ld.ts, for the same reason: nothing
 * here emits `aggregateRating` or `review`. We do not collect star ratings and
 * we do not run a testing lab, so a rating in our markup would be a fabrication
 * — the kind search engines penalise and readers are right to resent. What we
 * do have is an editorial ranking, and `ItemList` states exactly that.
 */

const AVAILABILITY_URLS: Record<string, string> = {
  in_stock: "https://schema.org/InStock",
  out_of_stock: "https://schema.org/OutOfStock",
  preorder: "https://schema.org/PreOrder",
  discontinued: "https://schema.org/Discontinued",
};

/**
 * One Offer node.
 *
 * `price` is emitted only when the same freshness and merchant-policy rules that
 * govern the visible page allow it. Markup that claims a price the page itself
 * will not show is exactly the mismatch that gets structured data distrusted.
 */
function offerNode(offer: OfferWithMerchant) {
  const url = offerUrl(offer);
  if (!url) return null;

  const showPrice = canDisplayPrice(offer);

  return {
    "@type": "Offer",
    url,
    seller: { "@type": "Organization", name: merchantName(offer) },
    ...(showPrice
      ? { price: Number(offer.price), priceCurrency: offer.currency }
      : {}),
    ...(offer.availability && AVAILABILITY_URLS[offer.availability]
      ? { availability: AVAILABILITY_URLS[offer.availability] }
      : {}),
  };
}

/** Offer, AggregateOffer or nothing, depending on how many are usable. */
function offersFor(product: ProductWithOffers) {
  const nodes = product.offers
    .map(offerNode)
    .filter((node): node is NonNullable<typeof node> => node !== null);

  if (nodes.length === 0) return undefined;
  if (nodes.length === 1) return nodes[0];

  const prices = nodes
    .map((node) => ("price" in node ? (node.price as number) : null))
    .filter((price): price is number => price !== null);

  return {
    "@type": "AggregateOffer",
    offerCount: nodes.length,
    ...(prices.length > 0
      ? {
          lowPrice: Math.min(...prices),
          highPrice: Math.max(...prices),
          priceCurrency: product.offers[0]?.currency ?? "USD",
        }
      : {}),
    offers: nodes,
  };
}

/** A Product node, for embedding inside an ItemList. */
export function productNode(product: ProductWithOffers) {
  return {
    "@type": "Product",
    name: product.name,
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    ...(product.short_description ? { description: product.short_description } : {}),
    ...(product.image_url ? { image: product.image_url } : {}),
    ...(offersFor(product) ? { offers: offersFor(product) } : {}),
  };
}

/**
 * Article + ItemList for a buying guide.
 *
 * Mirrors `rankingJsonLd` so both kinds of ranked list describe themselves the
 * same way to a crawler: an article whose main entity is an ordered list.
 */
export function productGuideJsonLd(guide: ProductRankingWithEntries) {
  const url = `${site.url}/products/${guide.slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description ?? undefined,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: guide.published_at ?? undefined,
    dateModified: guide.updated_at,
    author: {
      "@type": "Organization",
      name: guide.author_name ?? site.name,
    },
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: site.url,
    },
    about: guide.category?.name,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: guide.entries.length,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      itemListElement: guide.entries.map((entry) => ({
        "@type": "ListItem",
        position: entry.position,
        name: entry.product.name,
        item: productNode(entry.product),
      })),
    },
  };
}
