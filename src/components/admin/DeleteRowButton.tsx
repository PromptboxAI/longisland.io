"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

/**
 * Delete, from the list, with a question first.
 *
 * Two problems it solves at once. Deleting was only possible from inside a
 * record, so clearing four stray drafts meant four trips into an editor and
 * four trips back — which is how a list of "Untitled product" grows instead of
 * shrinking. And the delete inside the record asked nothing before doing
 * something no amount of retyping undoes.
 *
 * The confirm names the thing rather than saying "are you sure", because the
 * question worth answering is whether this is the right row.
 */
export function DeleteRowButton({
  name,
  onDelete,
  /** What else goes with it, when that is not obvious. */
  consequence,
}: {
  name: string;
  onDelete: () => Promise<{ error?: string } | void>;
  consequence?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${name}`}
        title={`Delete ${name}`}
        className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-navy-900">
        Delete {name}?
        {consequence ? (
          <span className="ml-1 font-normal text-ink-500">{consequence}</span>
        ) : null}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          startTransition(async () => {
            setError("");
            const result = await onDelete();
            if (result && "error" in result && result.error) {
              setError(result.error);
              setConfirming(false);
            }
          })
        }
        className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 aria-hidden="true" className="size-3 animate-spin" />
        ) : null}
        Delete
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setConfirming(false)}
        className="text-xs font-semibold text-navy-900 hover:underline"
      >
        Cancel
      </button>
      {error ? (
        <span className="text-xs font-semibold text-red-700">{error}</span>
      ) : null}
    </span>
  );
}
