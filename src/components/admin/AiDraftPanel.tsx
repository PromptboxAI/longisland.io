"use client";

import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import {
  generateAllEntryCopy,
  generateRankingCopy,
  type AiActionState,
} from "@/app/admin/rankings/ai-actions";

/**
 * Ranking-level AI drafting.
 *
 * Two separate jobs, kept visibly separate because they carry different risk.
 * Filling empty fields is safe and is the default; regenerating overwrites work
 * an editor may have spent an afternoon on, so it is a distinct button that
 * says what it will do.
 *
 * Nothing here writes an editorial field. A run produces PROPOSALS, which
 * appear as review panels on the entries below — editable, applied one at a
 * time or together, and discardable. That is the point: generated copy used to
 * land straight in the fields, which on a published ranking meant readers saw
 * it before anyone had read it.
 */

export interface AiDraftPanelProps {
  rankingId: string;
  entryCount: number;
  entriesMissingCopy: number;
  configured: boolean;
}

const BUTTON =
  "inline-flex items-center gap-1.5 rounded-full border border-navy-300 px-4 py-2 text-sm font-semibold text-navy-900 transition-colors hover:border-navy-500 hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-50";

export function AiDraftPanel({
  rankingId,
  entryCount,
  entriesMissingCopy,
  configured,
}: AiDraftPanelProps) {
  const [running, startRun] = useTransition();
  const [state, setState] = useState<AiActionState>({});
  const [label, setLabel] = useState("");
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);

  function run(what: string, action: () => Promise<AiActionState>) {
    setLabel(what);
    setState({});
    startRun(async () => {
      setState(await action());
      setLabel("");
    });
  }

  if (!configured) {
    return (
      <div className="rounded-card border border-line bg-sand-50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
          <Sparkles aria-hidden="true" className="size-4 text-ink-400" />
          AI drafting is not configured
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink-700">
          Add <code className="font-mono">ANTHROPIC_API_KEY</code> to enable it.
          Every field stays editable by hand either way.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-brand-200 bg-brand-50 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
        <Sparkles aria-hidden="true" className="size-4 text-brand-600" />
        Draft with AI
      </p>
      <p className="mt-1 text-xs leading-relaxed text-ink-700">
        Drafts appear below as proposals for you to read, edit and apply.
        Nothing reaches an editorial field, or the public page, until you apply
        it — and nothing you have already written is proposed over unless you
        choose Regenerate.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={running || entriesMissingCopy === 0}
          className={BUTTON}
          onClick={() =>
            run("entries", () => generateAllEntryCopy(rankingId, "missing"))
          }
          title={
            entriesMissingCopy === 0
              ? "Every entry already has copy"
              : `Fills ${entriesMissingCopy} entr${entriesMissingCopy === 1 ? "y" : "ies"}`
          }
        >
          {running && label === "entries" ? (
            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          ) : null}
          Generate missing entry copy
          {entriesMissingCopy > 0 ? ` (${entriesMissingCopy})` : ""}
        </button>

        <button
          type="button"
          disabled={running || entryCount === 0}
          className={BUTTON}
          onClick={() => setConfirmingRegenerate(true)}
          title="Proposes new copy for every entry, including ones already written"
        >
          {running && label === "regen" ? (
            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          ) : null}
          Regenerate all entries
        </button>

        <button
          type="button"
          disabled={running}
          className={BUTTON}
          onClick={() => run("ranking", () => generateRankingCopy(rankingId))}
        >
          {running && label === "ranking" ? (
            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          ) : null}
          Generate ranking copy
        </button>
      </div>

      {/*
        Regenerating is the one destructive-feeling action here, even though it
        writes nothing: it proposes over copy an editor may have spent an
        afternoon on, and the proposals replace any earlier ones. Worth a
        sentence and a second click.
      */}
      {confirmingRegenerate ? (
        <div className="mt-3 rounded-card border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-navy-900">
            Regenerate all {entryCount} entr{entryCount === 1 ? "y" : "ies"}?
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-700">
            This proposes new copy for every entry, including the ones you have
            already written. Your existing copy is not touched — the proposals
            wait for you to apply them — but any AI drafts already waiting for
            review are replaced.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={running}
              onClick={() => {
                setConfirmingRegenerate(false);
                run("regen", () => generateAllEntryCopy(rankingId, "all"));
              }}
              className="rounded-full bg-navy-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
            >
              Regenerate all
            </button>
            <button
              type="button"
              disabled={running}
              onClick={() => setConfirmingRegenerate(false)}
              className="rounded-full border border-navy-300 px-4 py-1.5 text-xs font-semibold text-navy-900 hover:bg-navy-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {state.error ? (
        <p className="mt-3 flex items-start gap-1.5 text-xs font-semibold text-red-700">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {state.error}
        </p>
      ) : null}

      {/*
        Per-entry outcomes rather than one summary. A bulk run that half-works
        needs to say which half, or the editor has to re-read ten entries to
        find out.
      */}
      {state.results && state.results.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs">
          {state.results.map((result) => (
            <li key={result.entryId} className="flex gap-2">
              <span
                className={`shrink-0 font-mono font-semibold ${
                  result.status === "staged"
                    ? "text-brand-600"
                    : result.status === "failed"
                      ? "text-red-700"
                      : "text-ink-400"
                }`}
              >
                {result.status}
              </span>
              <span className="min-w-0 text-ink-700">
                {result.name}
                {result.detail ? (
                  <span className="text-ink-400"> — {result.detail}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {/*
        Counted before it is listed. "7 drafts ready, 3 skipped" is the shape of
        the answer; the per-entry list underneath is for when one of them
        failed.
      */}
      {state.results && state.results.length > 0 ? (
        <p className="mt-3 text-xs font-semibold text-navy-900">
          {state.results.filter((r) => r.status === "staged").length} AI draft
          {state.results.filter((r) => r.status === "staged").length === 1
            ? ""
            : "s"}{" "}
          ready for review
          {state.results.some((r) => r.status === "skipped")
            ? ` · ${state.results.filter((r) => r.status === "skipped").length} skipped — editorial copy already exists`
            : ""}
          {state.results.some((r) => r.status === "failed")
            ? ` · ${state.results.filter((r) => r.status === "failed").length} failed`
            : ""}
          . Reload to review them on each entry.
        </p>
      ) : null}

      {state.ok && (state.results?.length ?? 0) === 0 && !state.error ? (
        <p className="mt-3 text-xs font-semibold text-ink-700">
          Nothing to draft — every entry already has editorial copy.
        </p>
      ) : null}
    </div>
  );
}
