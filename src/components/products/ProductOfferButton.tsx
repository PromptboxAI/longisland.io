import { ExternalLink } from "lucide-react";
import type { CSSProperties } from "react";

import {
  AFFILIATE_LINK_REL,
  ctaLabel,
  displayPrice,
  isAffiliateOffer,
  merchantButtonTheme,
  merchantName,
  offerUrl,
} from "@/lib/affiliate";
import type { OfferWithMerchant } from "@/types/products";

export interface ProductOfferButtonProps {
  offer: OfferWithMerchant;
  /** Named in the accessible label, since the button text is merchant-neutral. */
  productName: string;
  /**
   * "primary" is the merchant's own colour when it has one, the house navy
   * otherwise. "secondary" is the outlined house style, used for the second and
   * subsequent merchants so one page of offers has a single visual lead.
   */
  variant?: "primary" | "secondary";
  className?: string;
}

/**
 * One outbound buying link.
 *
 * A primary button wears the merchant's own colours — Amazon yellow, TikTok Shop
 * red — so a reader can tell where a link goes before clicking it. The palette
 * comes from the merchant row (see `merchantButtonTheme`), never a hardcoded map,
 * and a merchant with no colours set falls back to the house navy rather than
 * rendering something broken.
 *
 * Buttons carry the merchant NAME, not its logo: wordmark artwork carries brand
 * guideline and licensing obligations per network that a colour and a name do
 * not.
 *
 * The visible label stays merchant-neutral in its verb — "Check Price at
 * Amazon", never "Buy now" or "Best price". Every link is
 * `rel="sponsored nofollow noopener noreferrer"` whether or not it carries a tag,
 * so an untagged offer that later gains one needs no change here.
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

  const theme = variant === "primary" ? merchantButtonTheme(offer) : null;

  // Hover cannot be expressed in an inline style, so the colours arrive as
  // custom properties and Tailwind reads them back for both states.
  const brandStyle = theme
    ? ({
        "--merchant-bg": theme.background,
        "--merchant-fg": theme.text,
        "--merchant-hover": theme.hover,
      } as CSSProperties)
    : undefined;

  const styles = theme
    ? "bg-(--merchant-bg) text-(--merchant-fg) hover:bg-(--merchant-hover) border border-black/10"
    : variant === "primary"
      ? "bg-navy-900 text-white hover:bg-navy-800"
      : "border border-navy-300 text-navy-900 hover:border-navy-500 hover:bg-navy-50";

  return (
    <a
      href={href}
      target="_blank"
      rel={AFFILIATE_LINK_REL}
      style={brandStyle}
      // The visible text repeats across a page of offers, so the accessible name
      // carries the product and merchant that make this one distinct.
      aria-label={`${label} for ${productName} at ${merchant} (opens in a new tab)`}
      aria-disabled={unavailable || undefined}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${styles} ${
        unavailable ? "opacity-60" : ""
      } ${className}`}
    >
      <span>
        {label} at <span className="font-bold">{merchant}</span>
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
      {usable.map((offer) => (
        <li key={offer.id}>
          {/*
            Every merchant gets its own colours rather than only the first: the
            point of the branding is recognition, and a greyed-out Amazon button
            under a coloured Walmart one reads as "unavailable" instead of
            "second option".
          */}
          <ProductOfferButton
            offer={offer}
            productName={productName}
            variant="primary"
            className="w-full"
          />
        </li>
      ))}
    </ul>
  );
}
