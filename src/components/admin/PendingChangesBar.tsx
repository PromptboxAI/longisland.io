"use client";

import { CloudOff, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

/**
 * The deliberate act that puts staged text on the public page.
 *
 * It exists because autosave and publishing were the same event, so a pause
 * mid-sentence put half a thought in front of readers. Long-form text on a
 * published record is now saved somewhere safe and waits here.
 *
 * Two things it does not do, on purpose. It is not Publish — that decides
 * whether the page exists at all, and conflating the two would leave an editor
 * unable to fix a typo without thinking about visibility. And it never appears
 * on a draft record, where there is nothing to protect and an extra button
 * would only be a step to forget.
 *
 * The field list is named rather than counted. "3 changes waiting" tells an
 * editor to go looking; "Intro, Methodology" tells them what they did.
 */
export function PendingChangesBar({
  fieldLabels,
  onApply,
  onDiscard,
}: {
  /** Human names of the fields waiting, in the order they appear on the form. */
  fieldLabels: string[];
  onApply: () => Promise<{ ok?: boolean; error?: string }>;
  onDiscard: () => Promise<{ ok?: boolean; error?: string }>;
}) {
  const [busy, startTransition] = useTransition();
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [error, setError] = useState("");

  if (fieldLabels.length === 0) return null;

  function run(action: () => Promise<{ ok?: boolean; error?: string }>) {
    startTransition(async () => {
      setError("");
      const result = await action();
      if (result.error) setError(result.error);
      setConfirmingDiscard(false);
    });
  }

  return (
    <div className="rounded-card border border-amber-300 bg-amber-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold text-navy-900">
            <CloudOff aria-hidden="true" className="size-4 text-amber-700" />
            Changes saved, not yet live
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-700">
            {fieldLabels.join(", ")}{" "}
            {fieldLabels.length === 1 ? "has" : "have"} been edited. Readers are
            still seeing the previous version.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => run(onApply)}
            className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : null}
            Update live page
          </button>

          {confirmingDiscard ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(onDiscard)}
                className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                Discard them
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmingDiscard(false)}
                className="text-sm font-semibold text-navy-900 hover:underline"
              >
                Keep editing
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmingDiscard(true)}
              className="rounded-full border border-navy-300 px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-50 disabled:opacity-60"
            >
              Discard
            </button>
          )}
        </div>
      </div>

      {confirmingDiscard ? (
        <p className="mt-2 text-xs font-semibold text-red-700">
          Discarding throws away the edits above and leaves the live page as it
          is. This cannot be undone by typing again.
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
