"use client";

import { ArrowDown, ArrowUp, Check, Loader2, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import {
  moveEntry,
  removeEntry,
  saveEntry,
  type ActionState,
} from "@/app/admin/rankings/actions";
import { RANKING_BADGES, type RankingEntryWithBusiness } from "@/types/database";

export interface RankingEntryEditorProps {
  entry: RankingEntryWithBusiness;
  rankingId: string;
  isFirst: boolean;
  isLast: boolean;
}

/**
 * One editable ranking entry.
 *
 * Reordering uses explicit up/down buttons rather than drag-and-drop, so it
 * works with a keyboard and a screen reader. That is the accessible baseline
 * the brief asks for, not a fallback bolted onto a drag handle.
 */
export function RankingEntryEditor({
  entry,
  rankingId,
  isFirst,
  isLast,
}: RankingEntryEditorProps) {
  const [state, formAction, saving] = useActionState<ActionState, FormData>(
    saveEntry,
    {},
  );
  const [isPending, startTransition] = useTransition();
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const inputClass =
    "w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="rounded-card border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-navy-900 text-sm font-bold text-white">
          {entry.position}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-navy-900">{entry.business.name}</h3>
          <p className="mt-0.5 text-xs text-ink-500">
            {[entry.business.city, entry.business.county].filter(Boolean).join(", ") ||
              "No location recorded"}
          </p>
        </div>

        {/* Reorder + remove */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={isFirst || isPending}
            aria-label={`Move ${entry.business.name} up`}
            onClick={() =>
              startTransition(() => {
                void moveEntry(entry.id, rankingId, "up");
              })
            }
            className="rounded-md border border-line p-1.5 text-ink-700 hover:bg-sand-50 disabled:opacity-40"
          >
            <ArrowUp aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            disabled={isLast || isPending}
            aria-label={`Move ${entry.business.name} down`}
            onClick={() =>
              startTransition(() => {
                void moveEntry(entry.id, rankingId, "down");
              })
            }
            className="rounded-md border border-line p-1.5 text-ink-700 hover:bg-sand-50 disabled:opacity-40"
          >
            <ArrowDown aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            disabled={isPending}
            aria-label={`Remove ${entry.business.name} from this ranking`}
            onClick={() => {
              if (!confirmingRemove) {
                setConfirmingRemove(true);
                return;
              }
              startTransition(() => {
                void removeEntry(entry.id, rankingId);
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
          Click the bin again to remove this entry.{" "}
          <button
            type="button"
            onClick={() => setConfirmingRemove(false)}
            className="font-semibold underline"
          >
            Cancel
          </button>
        </p>
      ) : null}

      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="entryId" value={entry.id} />
        <input type="hidden" name="rankingId" value={rankingId} />

        <div className="grid gap-3 sm:grid-cols-2">
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
              placeholder="A late slice on the way home"
              defaultValue={entry.best_for ?? ""}
              className={`mt-1.5 ${inputClass}`}
            />
          </div>

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
              {RANKING_BADGES.map((badge) => (
                <option key={badge} value={badge}>
                  {badge}
                </option>
              ))}
            </select>
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
            placeholder="What specifically makes this one worth the position?"
            defaultValue={entry.editorial_reason ?? ""}
            className={`mt-1.5 ${inputClass}`}
          />
        </div>

        <div>
          <label
            htmlFor={`notes-${entry.id}`}
            className="block text-xs font-semibold text-navy-900"
          >
            Editor notes
          </label>
          <textarea
            id={`notes-${entry.id}`}
            name="editorNotes"
            rows={2}
            placeholder="Internal only — never published."
            defaultValue={entry.editor_notes ?? ""}
            className={`mt-1.5 ${inputClass}`}
          />
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
              "Save entry"
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
