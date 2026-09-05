"use client";

import { ArrowDown, ArrowUp, Check, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import {
  moveGuideEntry,
  removeGuideEntry,
  saveGuideEntry,
  type ActionState,
} from "@/app/admin/product-rankings/actions";
import { PRODUCT_BADGES } from "@/types/products";
import type { ProductRankingEntryWithProduct } from "@/types/products";

export interface ProductGuideEntryEditorProps {
  entry: ProductRankingEntryWithProduct;
  guideId: string;
  isFirst: boolean;
  isLast: boolean;
}

const inputClass =
  "w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";

/**
 * One editable guide entry.
 *
 * Reordering uses explicit up/down buttons rather than drag-and-drop, matching
 * the local ranking editor, so it works with a keyboard and a screen reader.
 */
export function ProductGuideEntryEditor({
  entry,
  guideId,
  isFirst,
  isLast,
}: ProductGuideEntryEditorProps) {
  const [state, formAction, saving] = useActionState<ActionState, FormData>(
    saveGuideEntry,
    {},
  );
  const [isPending, startTransition] = useTransition();
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const offerCount = entry.product.offers.length;

  return (
    <div className="rounded-card border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-navy-900 text-sm font-bold text-white">
          {entry.position}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-navy-900">
            <Link
              href={`/admin/products/${entry.product.id}`}
              className="hover:text-brand-600 hover:underline"
            >
              {entry.product.name}
            </Link>
          </h3>
          <p className="mt-0.5 text-xs text-ink-500">
            {entry.product.brand ?? "No brand"} ·{" "}
            {offerCount === 0 ? (
              <span className="font-semibold text-red-600">No offers</span>
            ) : (
              `${offerCount} ${offerCount === 1 ? "offer" : "offers"}`
            )}{" "}
            · {entry.product.status}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={isFirst || isPending}
            aria-label={`Move ${entry.product.name} up`}
            onClick={() =>
              startTransition(() => {
                void moveGuideEntry(entry.id, guideId, "up");
              })
            }
            className="rounded-md border border-line p-1.5 text-ink-700 hover:bg-sand-50 disabled:opacity-40"
          >
            <ArrowUp aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            disabled={isLast || isPending}
            aria-label={`Move ${entry.product.name} down`}
            onClick={() =>
              startTransition(() => {
                void moveGuideEntry(entry.id, guideId, "down");
              })
            }
            className="rounded-md border border-line p-1.5 text-ink-700 hover:bg-sand-50 disabled:opacity-40"
          >
            <ArrowDown aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            disabled={isPending}
            aria-label={`Remove ${entry.product.name} from this guide`}
            onClick={() => {
              if (!confirmingRemove) {
                setConfirmingRemove(true);
                return;
              }
              startTransition(() => {
                void removeGuideEntry(entry.id, guideId);
              });
            }}
            className={`rounded-md border p-1.5 disabled:opacity-40 ${
              confirmingRemove
                ? "border-red-300 bg-red-50 text-red-600"
                : "border-line text-ink-700 hover:bg-sand-50"
            }`}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      {confirmingRemove ? (
        <p className="mt-2 text-xs text-red-600">
          Click the bin again to remove this pick.{" "}
          <button
            type="button"
            onClick={() => setConfirmingRemove(false)}
            className="font-semibold underline"
          >
            Cancel
          </button>
        </p>
      ) : null}

      {offerCount === 0 ? (
        <p className="mt-2 rounded-md border border-line bg-sand-50 px-3 py-2 text-xs text-ink-500">
          This pick has nowhere to buy it.{" "}
          <Link
            href={`/admin/products/${entry.product.id}`}
            className="font-semibold text-brand-600 hover:underline"
          >
            Add a merchant offer
          </Link>
        </p>
      ) : null}

      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="entryId" value={entry.id} />
        <input type="hidden" name="guideId" value={guideId} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`badge-${entry.id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Badge
            </label>
            <select
              id={`badge-${entry.id}`}
              name="badge"
              defaultValue={entry.badge ?? ""}
              className={`mt-1.5 ${inputClass} bg-white`}
            >
              <option value="">No badge</option>
              {PRODUCT_BADGES.map((badge) => (
                <option key={badge} value={badge}>
                  {badge}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={`bestFor-${entry.id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Best for
            </label>
            <input
              id={`bestFor-${entry.id}`}
              name="bestFor"
              type="text"
              placeholder="Long walks in from an overflow lot"
              defaultValue={entry.best_for ?? ""}
              className={`mt-1.5 ${inputClass}`}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={`reason-${entry.id}`}
            className="block text-xs font-semibold text-navy-900"
          >
            Why we picked it
          </label>
          <textarea
            id={`reason-${entry.id}`}
            name="editorialReason"
            rows={3}
            placeholder="What specifically earns this position?"
            defaultValue={entry.editorial_reason ?? ""}
            className={`mt-1.5 ${inputClass}`}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`pros-${entry.id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Pros
            </label>
            <textarea
              id={`pros-${entry.id}`}
              name="pros"
              rows={4}
              placeholder={"One per line\nCorner pockets hold flat in real wind"}
              defaultValue={entry.pros.join("\n")}
              className={`mt-1.5 ${inputClass}`}
            />
          </div>

          <div>
            <label
              htmlFor={`cons-${entry.id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Cons
            </label>
            <textarea
              id={`cons-${entry.id}`}
              name="cons"
              rows={4}
              placeholder={"One per line\nBulky in a bag once packed"}
              defaultValue={entry.cons.join("\n")}
              className={`mt-1.5 ${inputClass}`}
            />
          </div>
        </div>

        <p className="text-xs text-ink-500">
          One item per line, up to eight each. An entry with pros and no cons
          reads as marketing copy — name the trade-off.
        </p>

        <div className="flex items-center gap-3">
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
            ) : (
              "Save pick"
            )}
          </button>

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
