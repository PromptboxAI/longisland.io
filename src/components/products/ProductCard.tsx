import { EditorialImage } from "@/components/ui/EditorialImage";
import { ProductOfferButton } from "@/components/products/ProductOfferButton";
import { bestOffer } from "@/lib/affiliate";
import type { ProductWithOffers } from "@/types/products";

export interface ProductCardProps {
  /**
   * Which surface this is rendered on, and the page it sits on.
   *
   * Passed to the buy-button so a click can be attributed. Optional throughout:
   * an unlabelled click is still counted, which matters more than the label.
   */
  placement?: string;
  sourcePath?: string;

  product: ProductWithOffers;
  /** Badge from the guide entry, e.g. "Our Pick". */
  badge?: string | null;
  /** Why this product belongs here, written for this placement. */
  note?: string | null;
  /** Position number, when the card sits in a ranked context. */
  position?: number;
}

/**
 * A product in a grid: recommendation modules, featured rails, related guides.
 *
 * There is no link to a product page because there is no product page — a page
 * whose only content is a name and a buy button is a thin affiliate page, and we
 * do not publish those. The card's one outbound link is the offer itself, and it
 * goes to the merchant.
 */
export function ProductCard({
  product,
  badge,
  note,
  position,
  placement,
  sourcePath,
}: ProductCardProps) {
  const offer = bestOffer(product.offers);

  return (
    <article className="relative flex flex-col rounded-card border border-line bg-white shadow-card">
      {badge ? (
        <div className="absolute -top-3 left-4 z-10">
          <span className="inline-flex items-center rounded-full bg-navy-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-400">
            {badge}
          </span>
        </div>
      ) : null}

      <div className="relative aspect-[4/3] overflow-hidden rounded-t-card border-b border-line">
        <EditorialImage
          src={product.image_url}
          alt=""
          seed={product.slug}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
          fallbackLabel={product.brand ?? undefined}
          // Product shots must not be cropped — main added `contain` for exactly
          // this, so a wide box or a tall bottle survives the frame intact.
          fit="contain"
        />
        {position ? (
          <span className="absolute left-2 top-2 grid size-8 place-items-center rounded-full bg-navy-900 text-sm font-bold text-white">
            {position}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        {product.brand ? (
          <p className="meta">
            {product.brand}
          </p>
        ) : null}

        <h3 className="headline mt-1 text-base text-navy-900">
          {product.name}
        </h3>

        {(note ?? product.editorial_summary) ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            {note ?? product.editorial_summary}
          </p>
        ) : null}

        {/*
          mt-auto pins the button to the foot of the card, so a row of cards of
          different text lengths still lines its CTAs up. Not full-width: the
          label is two words and a stretched pill reads as an ad unit.
        */}
        {offer ? (
          <div className="mt-auto pt-4">
            <ProductOfferButton
              placement={placement}
              sourcePath={sourcePath}
              offer={offer}
              productName={product.name}
              size="compact"
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
