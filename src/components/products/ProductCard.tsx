import { EditorialImage } from "@/components/ui/EditorialImage";
import { ProductOfferButton } from "@/components/products/ProductOfferButton";
import { bestOffer } from "@/lib/affiliate";
import { resolveImageUrl } from "@/lib/media/resolve";
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

      {/*
        The shot sat flush against the top edge with a rule under it, which
        boxed it in. Inset instead, so the card opens with white space and the
        product floats in it.
      */}
      <div className="relative mt-5 aspect-[4/3] overflow-hidden px-5">
        <EditorialImage
          /*
            The uploaded picture, then the linked URL. Reading only the column
            meant a product whose image was uploaded rather than pasted showed
            the placeholder, on the card and in the admin list alike.
          */
          src={resolveImageUrl(product.image_media ?? null, product.image_url)}
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

      {/*
        Centred, matching the pick card beside it in the same row. A product
        card is a poster for one thing — brand, what it is, and the button —
        not a paragraph, and ragged-right text under a centred image and a
        centred button left the middle of the card looking misaligned.
      */}
      <div className="flex min-w-0 flex-1 flex-col p-5 pb-7 text-center">
        {product.brand ? (
          <p className="meta">
            {product.brand}
          </p>
        ) : null}

        <h3 className="headline mt-1 text-base text-navy-900">
          {product.name}
        </h3>

        {/*
          Clamped to two lines, which is what makes the gap below it constant.
          Pinning the button to the foot lined the buttons up but left a
          different amount of air under each card's text — a one-line product
          got a chasm, a four-line one got none. Capping the description makes
          every card's text block the same height, so the buttons line up AND
          the spacing above them is identical, without choosing between the two.
        */}
        {(note ?? product.editorial_summary) ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-700">
            {note ?? product.editorial_summary}
          </p>
        ) : null}

        {/*
          Not full-width: the label is two words and a stretched pill reads as
          an ad unit.
        */}
        {offer ? (
          <div className="mt-auto flex justify-center pt-9">
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
