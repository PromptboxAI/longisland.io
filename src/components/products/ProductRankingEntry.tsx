import { ProductOfferList } from "@/components/products/ProductOfferButton";
import { ProductProsCons } from "@/components/products/ProductProsCons";
import { EditorialImage } from "@/components/ui/EditorialImage";
import type { ProductRankingEntryWithProduct } from "@/types/products";

export interface ProductRankingEntryProps {
  entry: ProductRankingEntryWithProduct;
  priority?: boolean;
}

/**
 * One ranked product in a buying guide, laid out as a comparison card.
 *
 * Structurally a sibling of `components/rankings/RankingEntry` — badge chip,
 * image left, editorial middle, actions right — so a guide and a local ranking
 * read as the same publication rather than two products bolted together.
 *
 * The `id` anchors the quick-picks rail at the top of the page.
 */
export function ProductRankingEntry({
  entry,
  priority = false,
}: ProductRankingEntryProps) {
  const { product } = entry;
  const headingId = `product-${entry.position}-name`;

  return (
    <article
      id={`product-${entry.position}`}
      className="relative rounded-card border border-line bg-white shadow-card scroll-mt-24"
    >
      {entry.badge ? (
        <div className="absolute -top-3 left-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gold-400">
            {entry.badge}
          </span>
        </div>
      ) : null}

      <div className="grid gap-5 p-5 pt-7 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-6 lg:grid-cols-[220px_minmax(0,1fr)_220px]">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden rounded border border-line">
          <EditorialImage
            src={product.image_url}
            alt=""
            seed={product.slug}
            priority={priority}
            sizes="(max-width: 640px) 100vw, 220px"
            fallbackLabel={product.brand ?? undefined}
            // Product shots must not be cropped.
            fit="contain"
          />
          <span className="absolute left-2 top-2 grid size-9 place-items-center rounded-full bg-navy-900 text-sm font-bold text-white">
            {entry.position}
          </span>
        </div>

        {/* Editorial content */}
        <div className="min-w-0">
          {product.brand ? (
            <p className="meta">
              {product.brand}
            </p>
          ) : null}

          <h3
            id={headingId}
            className="headline mt-1 text-xl text-navy-900"
          >
            {product.name}
          </h3>

          {entry.best_for ? (
            <p className="mt-3 text-sm font-bold text-brand-600">
              Best for: {entry.best_for}
            </p>
          ) : null}

          {entry.editorial_reason ? (
            <div className="mt-2">
              <p className="meta">
                Why we picked it
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-700">
                {entry.editorial_reason}
              </p>
            </div>
          ) : null}

          {product.short_description ? (
            <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-ink-500">
              {product.short_description}
            </p>
          ) : null}

          <div className="mt-4">
            <ProductProsCons
              pros={entry.pros}
              cons={entry.cons}
              labelledBy={headingId}
            />
          </div>
        </div>

        {/* Buying options. self-start keeps the column sized to its content
            rather than stretching to the height of the editorial column. */}
        <div className="self-start sm:col-span-2 lg:col-span-1">
          <p className="meta mb-2">
            Where to buy
          </p>
          <ProductOfferList offers={product.offers} productName={product.name} />
          {product.offers.length === 0 ? (
            <p className="text-sm text-ink-500">No current buying options.</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
