import { ExternalLink } from "lucide-react";
import type { CSSProperties } from "react";

import {
  AFFILIATE_LINK_REL,
  ctaLabel,
  DEFAULT_CTA_LABEL,
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
  /**
   * Whether the merchant is named in the visible text.
   *
   * False on a product card, where the button is one of a row and reads as a
   * consistent "Check Price". True in a list of several offers for the same
   * product, where the merchant is the only thing telling one row from the next
   * and colour alone cannot carry that.
   */
  showMerchant?: boolean;
  /**
   * "compact" is the card size: smaller type and padding, and the label never
   * wraps. In a five-card row the tiles get narrow, and a button that breaks
   * "Check Price" over two lines leaves the row's feet out of line with each
   * other.
   */
  size?: "default" | "compact";
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
 * No price on the button. "Check Price" is a promise that the number is on the
 * other side of the click and current when you get there; printing one beside
 * the words contradicts them, and a price we rendered minutes or days ago is
 * exactly the number we cannot stand behind. Prices belong where they are being
 * compared — the guide's comparison table — not on the control that goes and
 * fetches them. Do not add one back here.
 *
 * The visible label stays merchant-neutral — "Check Price", never "Buy now" or
 * "Best price", and never the retailer's name unless `showMerchant` is set for a
 * stacked list where the merchant is what distinguishes the rows. The accessible
 * name always carries product and merchant, so a screen reader still learns the
 * destination. Every link is
 * `rel="sponsored nofollow noopener noreferrer"` whether or not it carries a tag,
 * so an untagged offer that later gains one needs no change here.
 */
export function ProductOfferButton({
  offer,
  productName,
  variant = "primary",
  showMerchant = false,
  size = "default",
  className = "",
}: ProductOfferButtonProps) {
  const href = offerUrl(offer);
  if (!href) return null;

  const merchant = merchantName(offer);
  /*
   * A card that does not name its merchant uses the house label, so a row of
   * five reads "Check Price" five times instead of mixing in "Shop Now" for
   * whichever retailer happens to be behind one tile. Where the merchant IS
   * named — a stacked list of offers for one product — its own wording is kept,
   * because there the button is about that retailer specifically.
   */
  const label = showMerchant ? ctaLabel(offer) : DEFAULT_CTA_LABEL;
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

  const sizing =
    size === "compact"
      ? "gap-1 px-3 py-1.5 text-[13px] whitespace-nowrap"
      : "gap-1.5 px-4 py-2 text-sm";

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
      className={`inline-flex items-center justify-center rounded-full font-semibold transition-colors ${sizing} ${styles} ${
        unavailable ? "opacity-60" : ""
      } ${className}`}
    >
      <span>
        {label}
        {showMerchant ? (
          <>
            {" at "}
            <span className="font-bold">{merchant}</span>
          </>
        ) : null}
      </span>
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
            showMerchant
            className="w-full"
          />
        </li>
      ))}
    </ul>
  );
}
