"use client";

import { ArrowDown, ArrowUp, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import {
  moveEntry,
  removeEntry,
  saveEntry,
  setBusinessMedia,
} from "@/app/admin/rankings/actions";
import { MediaField } from "@/components/admin/MediaField";
import { generateEntryCopy } from "@/app/admin/rankings/ai-actions";
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
  /** The town this ranking is about, for the exact-area signal. */
  rankingPlaceName?: string | null;
  /** Whether a Yelp reference exists, so excerpts are obtainable. */
  hasYelpReference?: boolean;
  aiConfigured?: boolean;
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
  rankingPlaceName = null,
  hasYelpReference = false,
  aiConfigured = false,
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

  const [drafting, startDraft] = useTransition();
  const [draftNote, setDraftNote] = useState("");

  /*
   * Evidence, from what is already on this page — no extra requests. Ratings
   * and review counts are absent because we deliberately never persist them,
   * which is worth stating rather than leaving as a blank row.
   */
  const inArea =
    rankingPlaceName && entry.business.city
      ? entry.business.city.trim().toLowerCase() ===
        rankingPlaceName.trim().toLowerCase()
      : null;

  const evidence = [
    { label: "Editorial summary", ok: Boolean(entry.business.editorial_summary?.trim()) },
    { label: "Business description", ok: Boolean(entry.business.description?.trim()) },
    { label: "Editor notes", ok: Boolean(fields.editorNotes.trim()) },
    { label: "Yelp review excerpts", ok: hasYelpReference },
    ...(inArea === null
      ? []
      : [{ label: inArea ? "In the ranking's town" : "Outside the ranking's town", ok: inArea }]),
  ];
  const evidenceScore = evidence.filter((e) => e.ok).length;

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
          hint="1200 × 900 (4:3). The venue, the food, the interior or the storefront — not a logo. Saved to the business, so it appears wherever this business is ranked."
          onChange={(mediaId) => {
            void setBusinessMedia(entry.business.id, mediaId, rankingId);
          }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-line bg-white px-3 py-2">
        <button
          type="button"
          disabled={!aiConfigured || drafting}
          title={
            aiConfigured
              ? "Fills Best for and Why we picked it if they are empty"
              : "Add ANTHROPIC_API_KEY to enable drafting"
          }
          onClick={() =>
            startDraft(async () => {
              setDraftNote("");
              const result = await generateEntryCopy(rankingId, entry.id);
              setDraftNote(
                result.error ??
                  result.results?.[0]?.detail ??
                  "Drafted. Reload to see it.",
              );
            })
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-navy-900 hover:border-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {drafting ? (
            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          ) : (
            <Sparkles aria-hidden="true" className="size-3.5 text-brand-600" />
          )}
          Draft copy
        </button>

        {/*
          What the draft has to work with, so a VA can tell a grounded
          paragraph from a fluent guess before trusting it.
        */}
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
          <span
            className={`font-semibold ${
              evidenceScore >= 3
                ? "text-emerald-700"
                : evidenceScore >= 2
                  ? "text-amber-700"
                  : "text-red-700"
            }`}
          >
            Evidence: {evidenceScore >= 3 ? "good" : evidenceScore >= 2 ? "moderate" : "thin"}
          </span>
          {evidence.map((item) => (
            <span
              key={item.label}
              className={item.ok ? "text-ink-500" : "text-ink-400 line-through"}
            >
              {item.label}
            </span>
          ))}
        </span>

        {draftNote ? (
          <span className="w-full text-[11px] text-ink-500">{draftNote}</span>
        ) : null}
      </div>

      <div className="mt-3 space-y-3">

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
