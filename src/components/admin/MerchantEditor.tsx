"use client";

import { Check, Loader2, Plus } from "lucide-react";
import { useActionState, useState } from "react";

import { saveMerchant, type ActionState } from "@/app/admin/affiliate-offers/actions";
import type { AffiliateMerchant } from "@/types/products";

export interface MerchantEditorProps {
  merchants: AffiliateMerchant[];
}

const inputClass =
  "w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";

const NETWORKS: { value: string; label: string }[] = [
  { value: "amazon", label: "Amazon" },
  { value: "tiktok_shop", label: "TikTok Shop" },
  { value: "walmart", label: "Walmart" },
  { value: "target", label: "Target" },
  { value: "home_depot", label: "The Home Depot" },
  { value: "lowes", label: "Lowe's" },
  { value: "impact", label: "Impact" },
  { value: "cj", label: "CJ" },
  { value: "shareasale", label: "ShareASale" },
  { value: "awin", label: "Awin" },
  { value: "rakuten", label: "Rakuten" },
  { value: "direct", label: "Direct / manufacturer" },
];

/**
 * Merchants and the colours their buy buttons wear.
 *
 * This is what makes "an Amazon-looking button" a row rather than a code change:
 * set the colours here and every offer from that merchant, on every guide and
 * every recommendation module, repaints.
 */
export function MerchantEditor({ merchants }: MerchantEditorProps) {
  const [addingNew, setAddingNew] = useState(false);

  return (
    <div className="space-y-4">
      {merchants.map((merchant) => (
        <MerchantForm key={merchant.id} merchant={merchant} />
      ))}

      {addingNew ? (
        <MerchantForm merchant={null} onCancel={() => setAddingNew(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAddingNew(true)}
          className="inline-flex items-center gap-2 rounded-full border border-navy-300 px-5 py-2.5 text-sm font-semibold text-navy-900 hover:bg-sand-50"
        >
          <Plus aria-hidden="true" className="size-4" />
          Add merchant
        </button>
      )}
    </div>
  );
}

function MerchantForm({
  merchant,
  onCancel,
}: {
  merchant: AffiliateMerchant | null;
  onCancel?: () => void;
}) {
  const [state, formAction, saving] = useActionState<ActionState, FormData>(
    saveMerchant,
    {},
  );

  const id = merchant?.id ?? "new";

  // Live preview of the button this merchant will render on the public site.
  const [bg, setBg] = useState(merchant?.brand_color ?? "");
  const [fg, setFg] = useState(merchant?.brand_text_color ?? "");
  const [label, setLabel] = useState(merchant?.cta_label ?? "Check Price");
  const [name, setName] = useState(merchant?.name ?? "");

  const validHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);
  const previewStyle = validHex(bg)
    ? { backgroundColor: bg, color: validHex(fg) ? fg : "#ffffff" }
    : undefined;

  return (
    <div className="rounded-card border border-line bg-white p-4">
      <form action={formAction} className="space-y-3">
        {merchant ? <input type="hidden" name="id" value={merchant.id} /> : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label
              htmlFor={`name-${id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Name
            </label>
            <input
              id={`name-${id}`}
              name="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`mt-1.5 ${inputClass}`}
            />
          </div>

          <div>
            <label
              htmlFor={`slug-${id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Slug
            </label>
            <input
              id={`slug-${id}`}
              name="slug"
              type="text"
              required
              defaultValue={merchant?.slug ?? ""}
              className={`mt-1.5 ${inputClass} font-mono`}
            />
            <p className="mt-1 text-xs text-ink-500">
              Offers reference this. Changing it orphans existing offers.
            </p>
          </div>

          <div>
            <label
              htmlFor={`network-${id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Network
            </label>
            <select
              id={`network-${id}`}
              name="network"
              defaultValue={merchant?.network ?? "direct"}
              className={`mt-1.5 ${inputClass} bg-white`}
            >
              {NETWORKS.map((network) => (
                <option key={network.value} value={network.value}>
                  {network.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-500">
              Amazon suppresses price display — their terms only allow live
              API-sourced prices.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`homepageUrl-${id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Homepage URL
            </label>
            <input
              id={`homepageUrl-${id}`}
              name="homepageUrl"
              type="url"
              placeholder="https://"
              defaultValue={merchant?.homepage_url ?? ""}
              className={`mt-1.5 ${inputClass}`}
            />
          </div>

          <div>
            <label
              htmlFor={`ctaLabel-${id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Button wording
            </label>
            <input
              id={`ctaLabel-${id}`}
              name="ctaLabel"
              type="text"
              list="cta-label-options"
              placeholder="Check Price"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={`mt-1.5 ${inputClass}`}
            />
            <datalist id="cta-label-options">
              <option value="Check Price" />
              <option value="View Deal" />
              <option value="Shop Now" />
            </datalist>
            <p className="mt-1 text-xs text-ink-500">
              Keep it merchant-neutral. Never &ldquo;Buy now&rdquo; or a price
              claim we cannot stand behind.
            </p>
          </div>
        </div>

        {/* Button branding */}
        <fieldset className="rounded-md border border-line p-3">
          <legend className="px-1 text-xs font-semibold text-navy-900">
            Button branding
          </legend>

          <div className="grid gap-3 sm:grid-cols-3">
            <ColorInput
              id={`brandColor-${id}`}
              name="brandColor"
              label="Background"
              value={bg}
              onChange={setBg}
            />
            <ColorInput
              id={`brandTextColor-${id}`}
              name="brandTextColor"
              label="Text"
              value={fg}
              onChange={setFg}
            />
            <ColorInput
              id={`brandHoverColor-${id}`}
              name="brandHoverColor"
              label="Hover"
              defaultValue={merchant?.brand_hover_color ?? ""}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
            <span className="text-xs text-ink-500">Preview:</span>
            <span
              style={previewStyle}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold ${
                previewStyle ? "border border-black/10" : "bg-navy-900 text-white"
              }`}
            >
              {label || "Check Price"} at{" "}
              <span className="font-bold">{name || "Merchant"}</span>
            </span>
            {!previewStyle ? (
              <span className="text-xs text-ink-500">
                No background set — this merchant uses the house navy button.
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-xs text-ink-500">
            Colours only, never a merchant logo or wordmark — those carry
            separate brand-guideline and licensing terms per network.
          </p>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`disclosureNote-${id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Network-required disclosure
            </label>
            <textarea
              id={`disclosureNote-${id}`}
              name="disclosureNote"
              rows={2}
              placeholder="As an Amazon Associate, LongIsland.io earns from qualifying purchases."
              defaultValue={merchant?.disclosure_note ?? ""}
              className={`mt-1.5 ${inputClass}`}
            />
            <p className="mt-1 text-xs text-ink-500">
              Shown in addition to the site-wide disclosure, never instead of it.
            </p>
          </div>

          <div>
            <label
              htmlFor={`status-${id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Status
            </label>
            <select
              id={`status-${id}`}
              name="status"
              defaultValue={merchant?.status ?? "draft"}
              className={`mt-1.5 ${inputClass} bg-white`}
            >
              <option value="draft">Draft</option>
              <option value="review">In review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <p className="mt-1 text-xs text-ink-500">
              An unpublished merchant still links, but its name, wording and
              colours are not readable by the public site.
            </p>
          </div>
        </div>

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
            ) : merchant ? (
              "Save merchant"
            ) : (
              "Add merchant"
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
      </form>
    </div>
  );
}

/** Colour swatch picker paired with the hex field the action actually reads. */
function ColorInput({
  id,
  name,
  label,
  value,
  defaultValue,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}) {
  const controlled = value !== undefined && onChange !== undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-navy-900">
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} colour picker`}
          value={
            /^#[0-9a-f]{6}$/i.test(controlled ? (value as string) : (defaultValue ?? ""))
              ? controlled
                ? value
                : defaultValue
              : "#000000"
          }
          onChange={(e) => onChange?.(e.target.value)}
          // The picker is a convenience; the hex field beside it is the value
          // that submits, so a merchant can also be left deliberately unbranded.
          className="size-9 shrink-0 cursor-pointer rounded border border-line bg-white"
        />
        <input
          id={id}
          name={name}
          type="text"
          placeholder="#ffd814"
          maxLength={7}
          {...(controlled
            ? { value, onChange: (e) => onChange?.(e.target.value) }
            : { defaultValue })}
          className={`${inputClass} font-mono`}
        />
      </div>
    </div>
  );
}
