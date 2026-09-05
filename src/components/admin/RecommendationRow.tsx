"use client";

import { ArrowDown, ArrowUp, Check, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import {
  moveRecommendation,
  removeRecommendation,
  saveRecommendation,
  type ActionState,
} from "@/app/admin/recommendations/actions";
import type { RecommendedProduct } from "@/types/products";

export interface RecommendationRowProps {
  recommendation: RecommendedProduct;
  isFirst: boolean;
  isLast: boolean;
  /** Shown on the first row only — it belongs to the module, not the product. */
  showLabelField: boolean;
}

const inputClass =
  "w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";

export function RecommendationRow({
  recommendation,
  isFirst,
  isLast,
  showLabelField,
}: RecommendationRowProps) {
  const [state, formAction, saving] = useActionState<ActionState, FormData>(
    saveRecommendation,
    {},
  );
  const [isPending, startTransition] = useTransition();
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const { product, content_type: contentType, content_id: contentId } = recommendation;
  const offerCount = product.offers.length;

  return (
    <div className="rounded-card border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-bold text-white">
          {recommendation.position}
        </span>

        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-navy-900">
            <Link
              href={`/admin/products/${product.id}`}
              className="hover:text-brand-600 hover:underline"
            >
              {product.name}
            </Link>
          </h4>
          <p className="mt-0.5 text-xs text-ink-500">
            {product.brand ?? "No brand"} ·{" "}
            {offerCount === 0 ? (
              <span className="font-semibold text-red-600">No offers</span>
            ) : (
              `${offerCount} ${offerCount === 1 ? "offer" : "offers"}`
            )}{" "}
            · {product.status}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={isFirst || isPending}
            aria-label={`Move ${product.name} up`}
            onClick={() =>
              startTransition(() => {
                void moveRecommendation(
                  recommendation.id,
                  contentType,
                  contentId,
                  "up",
                );
              })
            }
            className="rounded-md border border-line p-1.5 text-ink-700 hover:bg-sand-50 disabled:opacity-40"
          >
            <ArrowUp aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            disabled={isLast || isPending}
            aria-label={`Move ${product.name} down`}
            onClick={() =>
              startTransition(() => {
                void moveRecommendation(
                  recommendation.id,
                  contentType,
                  contentId,
                  "down",
                );
              })
            }
            className="rounded-md border border-line p-1.5 text-ink-700 hover:bg-sand-50 disabled:opacity-40"
          >
            <ArrowDown aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            disabled={isPending}
            aria-label={`Remove ${product.name} from this module`}
            onClick={() => {
              if (!confirmingRemove) {
                setConfirmingRemove(true);
                return;
              }
              startTransition(() => {
                void removeRecommendation(recommendation.id, contentType, contentId);
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
          Click the bin again to remove this recommendation.{" "}
          <button
            type="button"
            onClick={() => setConfirmingRemove(false)}
            className="font-semibold underline"
          >
            Cancel
          </button>
        </p>
      ) : null}

      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="id" value={recommendation.id} />
        <input type="hidden" name="contentType" value={contentType} />
        <input type="hidden" name="contentId" value={contentId} />
        {/* Every row submits the label so the hidden copy stays in step when a
            different row is the one being saved. */}
        {showLabelField ? null : (
          <input
            type="hidden"
            name="contextLabel"
            value={recommendation.context_label ?? ""}
          />
        )}

        {showLabelField ? (
          <div>
            <label
              htmlFor={`contextLabel-${recommendation.id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Module heading
            </label>
            <input
              id={`contextLabel-${recommendation.id}`}
              name="contextLabel"
              type="text"
              placeholder="Heading to the beach? Here is what we recommend bringing."
              defaultValue={recommendation.context_label ?? ""}
              className={`mt-1.5 ${inputClass}`}
            />
            <p className="mt-1 text-xs text-ink-500">
              Applies to the whole module, not just this product.
            </p>
          </div>
        ) : null}

        <div>
          <label
            htmlFor={`note-${recommendation.id}`}
            className="block text-xs font-semibold text-navy-900"
          >
            Why it belongs here
          </label>
          <textarea
            id={`note-${recommendation.id}`}
            name="editorialNote"
            rows={2}
            placeholder="One trip from the car instead of three."
            defaultValue={recommendation.editorial_note ?? ""}
            className={`mt-1.5 ${inputClass}`}
          />
          <p className="mt-1 text-xs text-ink-500">
            States the connection to this page, rather than leaving the reader to
            infer it from proximity.
          </p>
        </div>

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
              "Save"
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
