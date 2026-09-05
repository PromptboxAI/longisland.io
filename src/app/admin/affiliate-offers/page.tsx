import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { StatusPill } from "@/components/admin/StatusPill";
import {
  canDisplayPrice,
  formatPrice,
  isPriceFresh,
  PRICE_FRESHNESS_DAYS,
} from "@/lib/affiliate";
import {
  listAdminMerchants,
  listAdminOffers,
} from "@/lib/data/admin-product-queries";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ merchant?: string }> };

/**
 * Every affiliate offer in one place.
 *
 * The queue an editor works from: which links are untagged, whose prices have
 * gone stale, and what is attached to a product nobody has published. Offers are
 * edited on their product page, so each row links there rather than duplicating
 * the form.
 */
export default async function AdminAffiliateOffersPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const [offers, merchants] = await Promise.all([
    listAdminOffers({ merchant: params.merchant }),
    listAdminMerchants(),
  ]);

  const untagged = offers.filter((offer) => !offer.affiliate_url).length;
  const stale = offers.filter(
    (offer) => offer.price != null && !isPriceFresh(offer.last_checked_at),
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy-900">Affiliate Offers</h1>
        <p className="mt-1 text-sm text-ink-500">
          {offers.length} {offers.length === 1 ? "offer" : "offers"}
          {untagged > 0 ? ` · ${untagged} without an affiliate link` : ""}
          {stale > 0 ? ` · ${stale} with a stale price` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/affiliate-offers"
          aria-current={!params.merchant ? "true" : undefined}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            !params.merchant
              ? "border-navy-900 bg-navy-900 text-white"
              : "border-line bg-white text-navy-900 hover:border-brand-500"
          }`}
        >
          All merchants
        </Link>
        {merchants.map((merchant) => {
          const active = params.merchant === merchant.slug;
          return (
            <Link
              key={merchant.id}
              href={`/admin/affiliate-offers?merchant=${merchant.slug}`}
              aria-current={active ? "true" : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "border-navy-900 bg-navy-900 text-white"
                  : "border-line bg-white text-navy-900 hover:border-brand-500"
              }`}
            >
              {merchant.name}
            </Link>
          );
        })}
      </div>

      {offers.length === 0 ? (
        <div className="rounded-card border border-line bg-white p-12 text-center">
          <h2 className="text-lg font-bold text-navy-900">No offers here</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-500">
            Offers are attached to a product. Open a product and add one.
          </p>
          <Link
            href="/admin/products"
            className="mt-5 inline-block rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            Manage products
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full min-w-3xl text-sm">
            <thead className="border-b border-line bg-sand-50 text-left">
              <tr>
                <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400">
                  Product
                </th>
                <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400">
                  Merchant
                </th>
                <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400">
                  Link
                </th>
                <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400">
                  Price
                </th>
                <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400">
                  Product status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {offers.map((offer) => {
                const priceText = formatPrice(offer.price, offer.currency);
                const shown = canDisplayPrice({
                  ...offer,
                  merchantRecord: offer.merchantRecord,
                });

                return (
                  <tr key={offer.id} className="hover:bg-sand-50">
                    <td className="px-5 py-3">
                      {offer.product ? (
                        <Link
                          href={`/admin/products/${offer.product.id}`}
                          className="font-semibold text-navy-900 hover:text-brand-600 hover:underline"
                        >
                          {offer.product.name}
                        </Link>
                      ) : (
                        <span className="text-ink-400">Product removed</span>
                      )}
                    </td>

                    <td className="px-5 py-3 text-ink-700">
                      {offer.merchantRecord?.name ?? offer.merchant}
                    </td>

                    <td className="px-5 py-3">
                      {offer.affiliate_url ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-800">
                          Affiliate
                          <ExternalLink aria-hidden="true" className="size-3" />
                        </span>
                      ) : (
                        <span className="inline-block rounded-full border border-line bg-sand-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-ink-700">
                          Untagged
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3 tabular-nums">
                      {priceText ? (
                        <span className={shown ? "text-ink-700" : "text-ink-400 line-through"}>
                          {priceText}
                        </span>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                      {priceText && !shown ? (
                        <span className="mt-0.5 block text-[11px] text-ink-400">
                          {isPriceFresh(offer.last_checked_at)
                            ? "Not republished for this merchant"
                            : `Older than ${PRICE_FRESHNESS_DAYS} days`}
                        </span>
                      ) : null}
                    </td>

                    <td className="px-5 py-3">
                      {offer.product ? (
                        <StatusPill status={offer.product.status} />
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
