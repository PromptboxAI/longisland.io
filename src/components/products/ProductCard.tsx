import { EditorialImage } from "@/components/ui/EditorialImage";
import { ProductOfferButton } from "@/components/products/ProductOfferButton";
import { bestOffer } from "@/lib/affiliate";
import type { ProductWithOffers } from "@/types/products";

export interface ProductCardProps {
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
export function ProductCard({ product, badge, note, position }: ProductCardProps) {
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
        />
        {position ? (
          <span className="absolute left-2 top-2 grid size-8 place-items-center rounded-full bg-navy-900 text-sm font-bold text-white">
            {position}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        {product.brand ? (
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
            {product.brand}
          </p>
        ) : null}

        <h3 className="mt-1 text-base font-extrabold leading-tight text-navy-900">
          {product.name}
        </h3>

        {(note ?? product.editorial_summary) ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            {note ?? product.editorial_summary}
          </p>
        ) : null}

        {offer ? (
          <div className="mt-auto pt-4">
            <ProductOfferButton
              offer={offer}
              productName={product.name}
              className="w-full"
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
