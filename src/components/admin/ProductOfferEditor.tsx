"use client";

import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import { removeOffer, saveOffer, type ActionState } from "@/app/admin/products/actions";
import { canDisplayPrice, isPriceFresh, PRICE_FRESHNESS_DAYS } from "@/lib/affiliate";
import type { AffiliateMerchant, OfferWithMerchant } from "@/types/products";

export interface ProductOfferEditorProps {
  productId: string;
  offers: OfferWithMerchant[];
  merchants: AffiliateMerchant[];
}

const inputClass =
  "w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";

/**
 * Merchant offers for one product.
 *
 * Each offer is its own form so saving one does not discard unsaved edits in
 * another, and a new offer is the same form with no id — the action inserts or
 * updates on that basis.
 */
export function ProductOfferEditor({
  productId,
  offers,
  merchants,
}: ProductOfferEditorProps) {
  const [addingNew, setAddingNew] = useState(false);

  const usedMerchants = new Set(offers.map((offer) => offer.merchant));
  const availableMerchants = merchants.filter(
    (merchant) => !usedMerchants.has(merchant.slug),
  );

  return (
    <div className="space-y-4">
      {/*
        Says what pasting a link does and does not do.
        An affiliate URL looks like it should bring the product with it — title,
        image, brand, price — and on most CMSs it would. Here it does not, and
        an editor who assumes otherwise saves a product with an empty name and
        no picture and only finds out when the homepage tile is blank.
      */}
      <div className="rounded-card border border-line bg-sand-50 p-4">
        <h3 className="text-sm font-bold text-navy-900">Where to buy</h3>
        <p className="mt-1 max-w-prose text-xs leading-relaxed text-ink-700">
          One row per merchant that sells this. Readers see a Check Price button
          for each, and clicks are counted.
        </p>
        <p className="mt-2 max-w-prose text-xs leading-relaxed text-amber-800">
          <strong>Pasting a link does not fill in the product.</strong> Automatic
          product details are not connected for any merchant yet, so the name,
          brand, picture and description above are yours to write. Adding that
          needs an approved merchant feed or API — we will not scrape a
          merchant&rsquo;s pages to get it.
        </p>
      </div>

      {offers.map((offer) => (
        <OfferForm
          key={offer.id}
          productId={productId}
          offer={offer}
          merchants={merchants}
        />
      ))}

      {offers.length === 0 && !addingNew ? (
        <div className="rounded-card border border-line bg-white p-8 text-center">
          <p className="text-sm text-ink-500">
            No offers yet. Add one so readers have somewhere to buy this.
          </p>
        </div>
      ) : null}

      {addingNew ? (
        <OfferForm
          productId={productId}
          offer={null}
          merchants={availableMerchants}
          onCancel={() => setAddingNew(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAddingNew(true)}
          disabled={availableMerchants.length === 0}
          className="inline-flex items-center gap-2 rounded-full border border-navy-300 px-5 py-2.5 text-sm font-semibold text-navy-900 hover:bg-sand-50 disabled:opacity-40"
        >
          <Plus aria-hidden="true" className="size-4" />
          {availableMerchants.length === 0
            ? "Every merchant already has an offer"
            : "Add merchant offer"}
        </button>
      )}
    </div>
  );
}

function OfferForm({
  productId,
  offer,
  merchants,
  onCancel,
}: {
  productId: string;
  offer: OfferWithMerchant | null;
  merchants: AffiliateMerchant[];
  onCancel?: () => void;
}) {
  const [state, formAction, saving] = useActionState<ActionState, FormData>(
    saveOffer,
    {},
  );
  const [isPending, startTransition] = useTransition();
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const id = offer?.id ?? "new";
  const fresh = offer ? isPriceFresh(offer.last_checked_at) : false;
  const priceShown = offer ? canDisplayPrice(offer) : false;

  return (
    <div className="rounded-card border border-line bg-white p-4">
      <form action={formAction} className="space-y-3">
        {offer ? <input type="hidden" name="offerId" value={offer.id} /> : null}
        <input type="hidden" name="productId" value={productId} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`merchant-${id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Merchant
            </label>
            <select
              id={`merchant-${id}`}
              name="merchant"
              required
              defaultValue={offer?.merchant ?? ""}
              className={`mt-1.5 ${inputClass} bg-white`}
            >
              <option value="">Pick a merchant</option>
              {merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.slug}>
                  {merchant.name}
                </option>
              ))}
              {/* An offer whose merchant row was archived still has to be
                  editable, so its current value stays selectable. */}
              {offer && !merchants.some((m) => m.slug === offer.merchant) ? (
                <option value={offer.merchant}>{offer.merchant}</option>
              ) : null}
            </select>
          </div>

          <div>
            <label
              htmlFor={`merchantProductId-${id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Merchant product ID
            </label>
            <input
              id={`merchantProductId-${id}`}
              name="merchantProductId"
              type="text"
              placeholder="ASIN, SKU or item number"
              defaultValue={offer?.merchant_product_id ?? ""}
              className={`mt-1.5 ${inputClass} font-mono`}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={`affiliateUrl-${id}`}
            className="block text-xs font-semibold text-navy-900"
          >
            Affiliate URL
          </label>
          <input
            id={`affiliateUrl-${id}`}
            name="affiliateUrl"
            type="url"
            placeholder="https://"
            defaultValue={offer?.affiliate_url ?? ""}
            className={`mt-1.5 ${inputClass}`}
          />
          <p className="mt-1 text-xs text-ink-500">
            Paste the tagged link from the network dashboard. Leave blank and the
            button links the plain URL below with no tracking.
          </p>
        </div>

        <div>
          <label
            htmlFor={`directUrl-${id}`}
            className="block text-xs font-semibold text-navy-900"
          >
            Direct URL
          </label>
          <input
            id={`directUrl-${id}`}
            name="directUrl"
            type="url"
            placeholder="https://"
            defaultValue={offer?.direct_url ?? ""}
            className={`mt-1.5 ${inputClass}`}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label
              htmlFor={`price-${id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Price
            </label>
            <input
              id={`price-${id}`}
              name="price"
              type="text"
              inputMode="decimal"
              placeholder="74.00"
              defaultValue={offer?.price != null ? String(offer.price) : ""}
              className={`mt-1.5 ${inputClass} tabular-nums`}
            />
          </div>

          <div>
            <label
              htmlFor={`currency-${id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Currency
            </label>
            <input
              id={`currency-${id}`}
              name="currency"
              type="text"
              maxLength={3}
              defaultValue={offer?.currency ?? "USD"}
              className={`mt-1.5 ${inputClass} uppercase`}
            />
          </div>

          <div>
            <label
              htmlFor={`availability-${id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Availability
            </label>
            <select
              id={`availability-${id}`}
              name="availability"
              defaultValue={offer?.availability ?? ""}
              className={`mt-1.5 ${inputClass} bg-white`}
            >
              <option value="">Unknown</option>
              <option value="in_stock">In stock</option>
              <option value="out_of_stock">Out of stock</option>
              <option value="preorder">Pre-order</option>
              <option value="discontinued">Discontinued</option>
            </select>
          </div>
        </div>

        {/* Why a price an editor typed may still not appear on the page. */}
        {offer && offer.price != null ? (
          <p
            className={`rounded-md border px-3 py-2 text-xs ${
              priceShown
                ? "border-brand-200 bg-brand-50 text-ink-700"
                : "border-line bg-sand-50 text-ink-500"
            }`}
          >
            {priceShown
              ? `This price is shown on the public page. It will be hidden automatically ${PRICE_FRESHNESS_DAYS} days after it was last checked.`
              : !fresh
                ? `This price is older than ${PRICE_FRESHNESS_DAYS} days and is hidden on the public page. Saving this offer re-checks it.`
                : `Prices from ${offer.merchantRecord?.name ?? offer.merchant} are not republished, because that network only permits displaying prices pulled live from its API. The button shows the current price instead.`}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full border border-navy-300 px-4 py-1.5 text-xs font-semibold text-navy-900 hover:bg-sand-50 disabled:opacity-60"
          >
            {saving ? (
              <span className="flex items-center gap-1.5">
                <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                Saving
              </span>
            ) : offer ? (
              "Save offer"
            ) : (
              "Add offer"
            )}
          </button>

          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-semibold text-ink-500 hover:text-navy-900"
            >
              Cancel
            </button>
          ) : null}

          {offer ? (
            <button
              type="button"
              disabled={isPending}
              aria-label={`Remove the ${offer.merchantRecord?.name ?? offer.merchant} offer`}
              onClick={() => {
                if (!confirmingRemove) {
                  setConfirmingRemove(true);
                  return;
                }
                startTransition(() => {
                  void removeOffer(offer.id, productId);
                });
              }}
              className={`ml-auto rounded-md border p-1.5 disabled:opacity-40 ${
                confirmingRemove
                  ? "border-red-300 bg-red-50 text-red-600"
                  : "border-line text-ink-700 hover:bg-sand-50"
              }`}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          ) : null}

          {state.ok && !saving ? (
            <span role="status" className="flex items-center gap-1 text-xs text-brand-600">
              <Check aria-hidden="true" className="size-3.5" />
              Saved
            </span>
          ) : null}
          {state.error ? (
            <span role="alert" className="text-xs text-red-600">
              {state.error}
            </span>
          ) : null}
        </div>

        {confirmingRemove ? (
          <p className="text-xs text-red-600">
            Click the bin again to remove this offer.{" "}
            <button
              type="button"
              onClick={() => setConfirmingRemove(false)}
              className="font-semibold underline"
            >
              Cancel
            </button>
          </p>
        ) : null}
      </form>
    </div>
  );
}
