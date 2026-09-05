import { ProductOfferButton } from "@/components/products/ProductOfferButton";
import { bestOffer, displayPrice } from "@/lib/affiliate";
import type { ProductRankingEntryWithProduct } from "@/types/products";

export interface ProductComparisonTableProps {
  entries: ProductRankingEntryWithProduct[];
  caption?: string;
}

/**
 * Every product in a guide, side by side.
 *
 * A real table rather than a grid of divs, so it is navigable with a screen
 * reader's table commands and each cell is announced with its column. Wrapped in
 * an `overflow-x-auto` container so a narrow viewport scrolls the table instead
 * of the page.
 *
 * The price column shows a dash rather than a guess when a price is stale or the
 * merchant's terms forbid republishing it — see `displayPrice`.
 */
export function ProductComparisonTable({
  entries,
  caption = "Every pick in this guide, compared",
}: ProductComparisonTableProps) {
  if (entries.length < 2) return null;

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-white">
      <table className="w-full min-w-3xl text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line bg-sand-50 text-left">
          <tr>
            <th
              scope="col"
              className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400"
            >
              Product
            </th>
            <th
              scope="col"
              className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400"
            >
              Award
            </th>
            <th
              scope="col"
              className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400"
            >
              Best for
            </th>
            <th
              scope="col"
              className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400"
            >
              Price
            </th>
            <th
              scope="col"
              className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400"
            >
              <span className="sr-only">Buying options</span>
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-line">
          {entries.map((entry) => {
            const offer = bestOffer(entry.product.offers);
            const price = offer ? displayPrice(offer) : null;

            return (
              <tr key={entry.id} className="hover:bg-sand-50">
                <th scope="row" className="px-5 py-3 text-left font-normal">
                  <a
                    href={`#product-${entry.position}`}
                    className="font-semibold text-navy-900 hover:text-brand-600 hover:underline"
                  >
                    {entry.position}. {entry.product.name}
                  </a>
                  {entry.product.brand ? (
                    <span className="mt-0.5 block text-xs text-ink-400">
                      {entry.product.brand}
                    </span>
                  ) : null}
                </th>

                <td className="px-5 py-3">
                  {entry.badge ? (
                    <span className="inline-block rounded-full border border-navy-200 bg-navy-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-navy-900">
                      {entry.badge}
                    </span>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </td>

                <td className="px-5 py-3 text-ink-700">{entry.best_for ?? "—"}</td>

                <td className="px-5 py-3 tabular-nums text-ink-700">
                  {price ?? <span className="text-ink-400">—</span>}
                </td>

                <td className="px-5 py-3">
                  {offer ? (
                    <ProductOfferButton
                      offer={offer}
                      productName={entry.product.name}
                      variant="secondary"
                    />
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
