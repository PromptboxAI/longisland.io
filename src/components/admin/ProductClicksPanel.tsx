import { MousePointerClick } from "lucide-react";

import type {
  ClickSourceRow,
  OfferClickRow,
  ProductClickTotals,
} from "@/lib/data/click-queries";

/**
 * What this product's buy-links actually get clicked.
 *
 * The wording is careful throughout and deliberately so. Every number here is a
 * CLICK — someone followed a link off the site. It is not a sale, not revenue,
 * and not a conversion rate. We cannot see any of those: affiliate programmes
 * report conversions in their own dashboards and never back to us, so a column
 * headed anything else would be inventing a figure.
 *
 * That is worth saying on screen rather than only in a comment, because a
 * number beside a product in a commerce CMS is read as money unless it says
 * otherwise.
 */

/** Placement keys are internal; these are what an editor calls those surfaces. */
const PLACEMENT_LABELS: Record<string, string> = {
  homepage_top_picks: "Homepage · Top Picks",
  product_guide: "Buying guide",
  product_detail: "Product page",
  ranking_recommendation: "Ranking · recommended",
  article: "Article",
  unlabelled: "Not labelled",
};

export function ProductClicksPanel({
  totals,
  byOffer,
  sources,
}: {
  totals: ProductClickTotals;
  byOffer: OfferClickRow[];
  sources: ClickSourceRow[];
}) {
  const nothingYet = totals.total === 0;

  return (
    <section className="rounded-card border border-line bg-white p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-navy-900">
        <MousePointerClick aria-hidden="true" className="size-4 text-ink-400" />
        Outbound clicks
      </h2>
      <p className="mt-1 max-w-prose text-xs leading-relaxed text-ink-500">
        How often readers followed a buy-link for this product. These are clicks
        only — whether any became a purchase is visible in the merchant&rsquo;s
        own dashboard, never here.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: "Last 7 days", value: totals.last7 },
          { label: "Last 30 days", value: totals.last30 },
          { label: "All time", value: totals.total },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-md border border-line bg-sand-50 px-3 py-2.5"
          >
            <p className="text-xl font-extrabold tabular-nums text-navy-900">
              {stat.value.toLocaleString()}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {nothingYet ? (
        <p className="mt-4 rounded-md border border-dashed border-line px-3 py-4 text-center text-xs text-ink-500">
          No clicks recorded yet. They start counting the first time someone
          follows a buy-link for this product.
        </p>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400">
              By merchant
            </h3>
            <table className="mt-2 w-full text-xs">
              <thead className="text-left text-ink-400">
                <tr>
                  <th scope="col" className="pb-1 font-semibold">Merchant</th>
                  <th scope="col" className="pb-1 text-right font-semibold">30d</th>
                  <th scope="col" className="pb-1 text-right font-semibold">All</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {byOffer.map((row) => (
                  <tr key={`${row.merchant}-${row.linkType}`}>
                    <td className="py-1.5 text-ink-700">
                      {row.merchant}
                      {/* An untagged link earns nothing; worth seeing here. */}
                      {row.linkType === "direct" ? (
                        <span className="ml-1.5 text-[10px] font-semibold uppercase text-ink-400">
                          direct
                        </span>
                      ) : null}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-ink-700">
                      {row.last30.toLocaleString()}
                    </td>
                    <td className="py-1.5 text-right tabular-nums font-semibold text-navy-900">
                      {row.clicks.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400">
              Top sources
            </h3>
            <ul className="mt-2 divide-y divide-line">
              {sources.map((row) => (
                <li
                  key={`${row.placement}-${row.sourcePath}`}
                  className="flex items-baseline justify-between gap-3 py-1.5"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-navy-900">
                      {PLACEMENT_LABELS[row.placement] ?? row.placement}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-ink-400">
                      {row.sourcePath}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-navy-900">
                    {row.clicks.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
