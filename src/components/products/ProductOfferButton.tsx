import { ExternalLink } from "lucide-react";

import {
  AFFILIATE_LINK_REL,
  ctaLabel,
  displayPrice,
  isAffiliateOffer,
  merchantName,
  offerUrl,
} from "@/lib/affiliate";
import type { OfferWithMerchant } from "@/types/products";

export interface ProductOfferButtonProps {
  offer: OfferWithMerchant;
  /** Named in the accessible label, since the button text is merchant-neutral. */
  productName: string;
  variant?: "primary" | "secondary";
  className?: string;
}

/**
 * One outbound buying link.
 *
 * The visible label is deliberately merchant-neutral and never a price claim —
 * "Check Price at Walmart", not "Buy now — lowest price". A price renders beside
 * it only when `displayPrice` allows, which excludes anything stale or from a
 * merchant whose terms forbid us republishing it.
 *
 * Every link is `rel="sponsored nofollow noopener noreferrer"` whether or not it
 * carries a tag, so an untagged offer that later gains one needs no change here.
 */
export function ProductOfferButton({
  offer,
  productName,
  variant = "primary",
  className = "",
}: ProductOfferButtonProps) {
  const href = offerUrl(offer);
  if (!href) return null;

  const merchant = merchantName(offer);
  const label = ctaLabel(offer);
  const price = displayPrice(offer);
  const unavailable =
    offer.availability === "out_of_stock" || offer.availability === "discontinued";

  const styles =
    variant === "primary"
      ? "bg-navy-900 text-white hover:bg-navy-800"
      : "border border-navy-300 text-navy-900 hover:border-navy-500 hover:bg-navy-50";

  return (
    <a
      href={href}
      target="_blank"
      rel={AFFILIATE_LINK_REL}
      // The visible text repeats across a page of offers, so the accessible name
      // carries the product and merchant that make this one distinct.
      aria-label={`${label} for ${productName} at ${merchant} (opens in a new tab)`}
      aria-disabled={unavailable || undefined}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${styles} ${
        unavailable ? "opacity-60" : ""
      } ${className}`}
    >
      <span>
        {label} at {merchant}
      </span>
      {price ? <span className="font-bold tabular-nums">{price}</span> : null}
      <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
      {isAffiliateOffer(offer) ? <span className="sr-only">(affiliate link)</span> : null}
    </a>
  );
}

/**
 * Every buying option for one product, primary offer first.
 *
 * Rendered as a list rather than a single button wherever the page has room:
 * showing more than one merchant is both more useful and more honest than
 * implying a single retailer is the only way to buy something.
 */
export function ProductOfferList({
  offers,
  productName,
  max = 3,
}: {
  offers: OfferWithMerchant[];
  productName: string;
  max?: number;
}) {
  const usable = offers.filter((offer) => offerUrl(offer) !== null).slice(0, max);
  if (usable.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {usable.map((offer, index) => (
        <li key={offer.id}>
          <ProductOfferButton
            offer={offer}
            productName={productName}
            variant={index === 0 ? "primary" : "secondary"}
            className="w-full"
          />
        </li>
      ))}
    </ul>
  );
}
