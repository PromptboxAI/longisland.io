"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import {
  moveEntry,
  removeEntry,
  saveEntry,
  setBusinessMedia,
} from "@/app/admin/rankings/actions";
import { MediaField } from "@/components/admin/MediaField";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import { useAutosave } from "@/components/admin/useAutosave";
import { RANKING_BADGES, type RankingEntryWithBusiness } from "@/types/database";
import type { MediaAsset } from "@/types/media";

export interface RankingEntryEditorProps {
  entry: RankingEntryWithBusiness;
  rankingId: string;
  isFirst: boolean;
  isLast: boolean;
  /** The media library, for setting this business's photo without leaving. */
  library: MediaAsset[];
}

/**
 * One editable ranking entry.
 *
 * Editorial fields autosave. A twenty-entry ranking carries eighty of them,
 * and a Save button on each is eighty clicks and eighty ways to lose an edit by
 * navigating away.
 *
 * Removing an entry stays an explicit two-step action, because that one cannot
 * be undone by typing again.
 *
 * Reordering keeps its up/down buttons, which is how this works with a keyboard
 * and a screen reader — the drag handle in the parent list is the pointer
 * shortcut, not the only way.
 */
export function RankingEntryEditor({
  entry,
  rankingId,
  isFirst,
  isLast,
  library,
}: RankingEntryEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const [fields, setFields] = useState({
    bestFor: entry.best_for ?? "",
    badge: entry.badge ?? "",
    editorialReason: entry.editorial_reason ?? "",
    editorNotes: entry.editor_notes ?? "",
  });

  const set = (key: keyof typeof fields) => (value: string) =>
    setFields((current) => ({ ...current, [key]: value }));

  const { status, error, saveNow } = useAutosave(fields, async (values) => {
    const form = new FormData();
    form.set("entryId", entry.id);
    form.set("rankingId", rankingId);
    for (const [key, value] of Object.entries(values)) form.set(key, value);
    return saveEntry({}, form);
  });

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

      {/*
        The business's own photo, set from here. It saves to the BUSINESS, so
        the same pizzeria shows the same image in every list it appears in and
        one correction fixes all of them — there is deliberately no per-entry
        image field to drift out of step.
      */}
      <div className="mt-4 rounded-md border border-line bg-sand-50 p-3">
        <MediaField
          name={`businessMedia-${entry.id}`}
          value={entry.business.primary_media ?? null}
          library={library}
          label={`Photo for ${entry.business.name}`}
          hint="Saved to the business, so it appears wherever this business is ranked."
          onChange={(mediaId) => {
            void setBusinessMedia(entry.business.id, mediaId, rankingId);
          }}
        />
      </div>

      <div className="mt-4 space-y-3">

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
              type="text"
              placeholder="A late slice on the way home"
              value={fields.bestFor}
              onChange={(event) => set("bestFor")(event.target.value)}
              onBlur={saveNow}
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
              value={fields.badge}
              onChange={(event) => {
                set("badge")(event.target.value);
              }}
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
            rows={3}
            placeholder="What specifically makes this one worth the position?"
            value={fields.editorialReason}
            onChange={(event) => set("editorialReason")(event.target.value)}
            onBlur={saveNow}
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
            rows={2}
            placeholder="Internal only — never published."
            value={fields.editorNotes}
            onChange={(event) => set("editorNotes")(event.target.value)}
            onBlur={saveNow}
            className={`mt-1.5 ${inputClass}`}
          />
        </div>

        <div className="flex items-center gap-3">
          <SaveIndicator status={status} error={error} />
        </div>
      </div>
    </div>
  );
}
