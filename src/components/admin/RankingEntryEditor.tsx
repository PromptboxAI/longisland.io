"use client";

import {
  ArrowDown,
  ArrowUp,
  Globe,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState, useTransition } from "react";

import {
  moveEntry,
  removeEntry,
  saveEntry,
  setBusinessMedia,
} from "@/app/admin/rankings/actions";
import { MediaField } from "@/components/admin/MediaField";
import {
  applyEntryDraft,
  discardEntryDraft,
  fetchOfficialWebsite,
  generateEntryCopy,
  type StagedEntryDraft,
} from "@/app/admin/rankings/ai-actions";
import {
  applyEntryChanges,
  discardEntryChanges,
} from "@/app/admin/rankings/actions";
import { AiReviewPanel } from "@/components/admin/AiReviewPanel";
import { PendingChangesBar } from "@/components/admin/PendingChangesBar";
import { displayValue, isLongForm } from "@/lib/editorial/field-policy";
import { assessResearchContext } from "@/lib/ai/context";
import { classifyLocation } from "@/lib/yelp/areas";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import { useAutosave } from "@/components/admin/useAutosave";
import { RANKING_BADGES, type RankingEntryWithBusiness } from "@/types/database";
import type { MediaAsset } from "@/types/media";

/** Column name to the words on the form. */
const ENTRY_FIELD_LABELS: Record<string, string> = {
  editorial_reason: "Why we picked it",
};

export interface RankingEntryEditorProps {
  entry: RankingEntryWithBusiness;
  rankingId: string;
  isFirst: boolean;
  isLast: boolean;
  /** The media library, for setting this business's photo without leaving. */
  library: MediaAsset[];
  /** Whether saves here reach the public page. */
  rankingPublished?: boolean;
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
  rankingPublished = false,
  rankingPlaceName = null,
  hasYelpReference = false,
  aiConfigured = false,
}: RankingEntryEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  /*
   * The editor sees the pending value when there is one.
   *
   * That is the whole trick behind staging: what you typed is what you see, and
   * the live page keeps the previous text until you say otherwise. Reading the
   * live value here instead would make an edit look lost on every reload.
   */
  const pending = (entry.pending_changes ?? null) as Record<string, string> | null;

  const [fields, setFields] = useState({
    bestFor: entry.best_for ?? "",
    badge: entry.badge ?? "",
    editorialReason: displayValue("editorial_reason", entry.editorial_reason, pending),
    editorNotes: entry.editor_notes ?? "",
  });

  /** The AI's proposal, if one is waiting. Never an editorial field. */
  const [aiDraft, setAiDraft] = useState<StagedEntryDraft | null>(
    (entry.ai_draft ?? null) as StagedEntryDraft | null,
  );

  const set = (key: keyof typeof fields) => (value: string) =>
    setFields((current) => ({ ...current, [key]: value }));

  const [drafting, startDraft] = useTransition();
  const [draftNote, setDraftNote] = useState("");

  const [findingSite, startFindSite] = useTransition();
  const [website, setWebsite] = useState(entry.business.website ?? "");
  const [confirmingDraft, setConfirmingDraft] = useState(false);

  /*
   * What a draft would be written from, worked out from what is already on this
   * page — no extra requests. Ratings and review counts are absent because we
   * deliberately never persist them.
   */
  const inArea =
    rankingPlaceName && entry.business.city
      ? entry.business.city.trim().toLowerCase() ===
        rankingPlaceName.trim().toLowerCase()
      : null;

  /*
   * Whether this business is on Long Island at all.
   *
   * Separate from the town check above, and it fires on rankings that have no
   * town — which is exactly where it was needed. A live "Best Bagel Shops in
   * Long Island" went out with a New Haven, Connecticut business at number
   * three, and nothing in this editor said a word about it. The town check
   * could not have caught it: an island-wide ranking has no town to compare to.
   */
  const onLongIsland = entry.business.city
    ? classifyLocation(entry.business.city, null) === "long_island"
    : null;

  const research = assessResearchContext({
    hasLocation: Boolean(entry.business.city?.trim()),
    hasAddress: Boolean(entry.business.address?.trim()),
    hasPhone: Boolean(entry.business.phone?.trim()),
    hasCategories: Boolean(entry.business.subcategory?.trim()),
    hasWebsite: Boolean(website.trim()),
    hasDescription: Boolean(entry.business.description?.trim()),
    hasEditorialSummary: Boolean(entry.business.editorial_summary?.trim()),
    hasEditorNotes: Boolean(fields.editorNotes.trim()),
    hasReviewExcerpts: hasYelpReference,
  });

  function draftCopy() {
    startDraft(async () => {
      setDraftNote("");
      setConfirmingDraft(false);
      const result = await generateEntryCopy(rankingId, entry.id);
      const first = result.results?.[0];

      // The proposal comes back to the panel. Nothing editorial has changed,
      // and nothing will until the editor presses Apply.
      if (first?.draft) setAiDraft(first.draft);
      setDraftNote(result.error ?? (first?.draft ? "" : (first?.detail ?? "")));
    });
  }

  const {
    status,
    error,
    destination,
    stagedFields,
    setStagedFields,
    saveNow,
  } = useAutosave(
    fields,
    async (values) => {
      const form = new FormData();
      form.set("entryId", entry.id);
      form.set("rankingId", rankingId);
      for (const [key, value] of Object.entries(values)) form.set(key, value);
      return saveEntry({}, form);
    },
    { published: rankingPublished },
  );

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

      {/*
        What a draft would be written from.

        Two lists rather than one verdict. We almost always know who and where a
        business is; what is usually missing is anything to base a judgement on,
        and an editor needs to see which of the two is short before they trust a
        paragraph about the food.
      */}
      <div className="mt-4 rounded-md border border-line bg-white px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p className="text-xs font-semibold text-navy-900">
            AI research context:{" "}
            <span
              className={
                research.level === "good"
                  ? "text-emerald-700"
                  : research.level === "limited"
                    ? "text-amber-700"
                    : "text-red-700"
              }
            >
              {research.levelLabel}
            </span>
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {hasYelpReference && !website.trim() ? (
              <button
                type="button"
                disabled={findingSite}
                onClick={() =>
                  startFindSite(async () => {
                    setDraftNote("");
                    const result = await fetchOfficialWebsite(
                      entry.business.id,
                      rankingId,
                    );
                    if (result.website) setWebsite(result.website);
                    setDraftNote(result.error ?? result.detail ?? "");
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-sand-50 disabled:opacity-50"
              >
                {findingSite ? (
                  <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                ) : (
                  <Globe aria-hidden="true" className="size-3.5 text-ink-500" />
                )}
                Find website
              </button>
            ) : null}

            <button
              type="button"
              disabled={!aiConfigured || drafting}
              title={
                aiConfigured
                  ? "Fills Best for and Why we picked it if they are empty"
                  : "Add ANTHROPIC_API_KEY to enable drafting"
              }
              onClick={() =>
                research.needsConfirmation ? setConfirmingDraft(true) : draftCopy()
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
          </div>
        </div>

        <div className="mt-2.5 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <ContextList
            heading="What we know about the business"
            items={research.identity}
          />
          <ContextList
            heading="What a draft can reason from"
            items={research.editorial}
          />
        </div>

        {/*
          The one case where drafting is a genuinely bad idea: nothing but a
          name and an address. The button still works — an editor may want a
          starting shape — but not by accident.
        */}
        {confirmingDraft ? (
          <div className="mt-2.5 rounded-md border border-amber-300 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-navy-900">
              There is nothing here to write from.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-700">
              We have {entry.business.name}&rsquo;s name and location and nothing
              about what it is like. A draft made now is a guess dressed as a
              judgement, and you will have to check every word of it.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={draftCopy}
                className="rounded-full bg-navy-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
              >
                Draft anyway
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDraft(false)}
                className="rounded-full border border-navy-300 px-4 py-1.5 text-xs font-semibold text-navy-900 hover:bg-navy-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {website.trim() ? (
          <p className="mt-2 truncate text-[11px] text-ink-500">
            Official site:{" "}
            <a
              href={website}
              target="_blank"
              rel="noreferrer noopener"
              className="font-semibold text-brand-600 hover:underline"
            >
              {website}
            </a>
          </p>
        ) : null}

        {onLongIsland === false ? (
          <p className="mt-2 rounded border border-red-300 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-800">
            {entry.business.city} is not a town we recognise on Long Island.
            Check this belongs in the ranking before publishing.
          </p>
        ) : inArea === false ? (
          <p className="mt-2 text-[11px] font-semibold text-amber-700">
            This business is in {entry.business.city}, not {rankingPlaceName}.
          </p>
        ) : null}

        {draftNote ? (
          <p className="mt-2 text-[11px] text-ink-500">{draftNote}</p>
        ) : null}
      </div>

      {/*
        AI proposes, a human approves, and only then does a field change. The
        panel sits above the fields it would write into so the comparison is
        one glance rather than a scroll.
      */}
      {aiDraft ? (
        <AiReviewPanel
          note={
            aiDraft.basis
              ? `${aiDraft.confidence} confidence · ${aiDraft.basis}`
              : null
          }
          fields={[
            ...(aiDraft.bestFor !== undefined
              ? [
                  {
                    key: "bestFor",
                    label: "Best for",
                    value: aiDraft.bestFor,
                    kind: "text" as const,
                  },
                ]
              : []),
            ...(aiDraft.whyWePickedIt !== undefined
              ? [
                  {
                    key: "whyWePickedIt",
                    label: "Why we picked it",
                    value: aiDraft.whyWePickedIt,
                    kind: "textarea" as const,
                    staged: rankingPublished && isLongForm("ranking_entry", "editorial_reason"),
                  },
                ]
              : []),
            ...(aiDraft.badge !== undefined
              ? [
                  {
                    key: "badge",
                    label: "Badge",
                    value: aiDraft.badge,
                    kind: "select" as const,
                    options: RANKING_BADGES,
                  },
                ]
              : []),
          ]}
          onApply={async (values) => {
            const result = await applyEntryDraft(rankingId, entry.id, values);
            if (result.error) return { error: result.error };
            setAiDraft(null);
            // The applied text is now what the editor should be looking at.
            setFields((current) => ({
              ...current,
              ...(values.bestFor !== undefined ? { bestFor: values.bestFor } : {}),
              ...(values.badge !== undefined ? { badge: values.badge } : {}),
              ...(values.whyWePickedIt !== undefined
                ? { editorialReason: values.whyWePickedIt }
                : {}),
            }));
            return {};
          }}
          onRegenerate={draftCopy}
          onDiscard={() => {
            setAiDraft(null);
            void discardEntryDraft(rankingId, entry.id);
          }}
        />
      ) : null}

      {/*
        Only on a published entry, and only when something is actually waiting.
        On a draft there is no public page to protect and this would be a step
        to forget.
      */}
      {rankingPublished ? (
        <div className="mt-3">
          <PendingChangesBar
            /*
             * The latest save wins over the server row. Both are correct at
             * different moments: the row is right on load, the save result is
             * right from then on, and preferring the row would hide the bar
             * for the whole session in which the edit was made.
             */
            fieldLabels={(stagedFields ?? Object.keys(pending ?? {})).map(
              (key) => ENTRY_FIELD_LABELS[key] ?? key,
            )}
            onApply={async () => {
              const result = await applyEntryChanges(entry.id, rankingId);
              if (!result.error) setStagedFields([]);
              return result;
            }}
            onDiscard={async () => {
              const result = await discardEntryChanges(entry.id, rankingId);
              if (!result.error) setStagedFields([]);
              return result;
            }}
          />
        </div>
      ) : null}

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
          <SaveIndicator status={status} error={error} destination={destination} />
        </div>
      </div>
    </div>
  );
}

/**
 * One side of the research panel.
 *
 * Present items are ticked and plain; missing ones carry the fix rather than a
 * strikethrough, because a VA reading this needs to know what to do about it,
 * not just that something is absent.
 */
function ContextList({
  heading,
  items,
}: {
  heading: string;
  items: { label: string; present: boolean; fix?: string }[];
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
        {heading}
      </p>
      <ul className="mt-1 space-y-0.5">
        {items.map((item) => (
          <li key={item.label} className="flex gap-1.5 text-[11px] leading-snug">
            <span
              aria-hidden="true"
              className={item.present ? "text-emerald-600" : "text-ink-300"}
            >
              {item.present ? "✓" : "○"}
            </span>
            <span className={item.present ? "text-ink-700" : "text-ink-400"}>
              {item.label}
              {!item.present && item.fix ? (
                <span className="text-ink-400"> — {item.fix}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
