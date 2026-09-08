"use client";

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteRanking } from "@/app/admin/rankings/actions";

/**
 * Deleting a ranking, which is the most expensive thing in here to rebuild.
 *
 * A ranking is hours of work: candidates researched, entries ordered, copy
 * written per entry, images chosen. Everywhere else in admin a two-click
 * confirm is proportionate. Here it is not — a stray click on a list of
 * similarly named drafts should not be able to destroy an afternoon.
 *
 * So it asks for the word to be typed. That is not friction for its own sake:
 * typing forces the eyes back to the title above it, which is the actual
 * question being asked — not "are you sure" but "is this the right one".
 *
 * A published ranking is refused outright by the action. Unpublishing first is
 * one click, reversible, and takes the page down immediately; this is not
 * reversible at all. Splitting them keeps "get it off the site now" from
 * meaning "destroy the record", which are different intentions.
 */
export function DeleteRankingButton({
  rankingId,
  title,
  entryCount,
  isPublished,
}: {
  rankingId: string;
  title: string;
  entryCount: number;
  isPublished: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");

  const armed = typed.trim().toUpperCase() === "DELETE";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-500 transition-colors hover:border-red-300 hover:text-red-600"
      >
        <Trash2 aria-hidden="true" className="size-4" />
        Delete ranking
      </button>
    );
  }

  /*
   * The published case is answered here rather than by letting someone type
   * DELETE and then be refused. Telling them at the end what they could have
   * been told at the start is how a confirmation earns its reputation for
   * being in the way.
   */
  if (isPublished) {
    return (
      <div className="rounded-card border border-amber-300 bg-amber-50 p-4">
        <p className="flex items-center gap-1.5 text-sm font-bold text-navy-900">
          <AlertTriangle aria-hidden="true" className="size-4 text-amber-700" />
          Unpublish it first
        </p>
        <p className="mt-1 max-w-prose text-xs leading-relaxed text-ink-700">
          This ranking is live. Unpublishing takes it off the site immediately
          and can be undone; deleting cannot. Use Unpublish above, then delete
          it if you still want to.
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-3 rounded-full border border-navy-300 px-4 py-1.5 text-xs font-semibold text-navy-900 hover:bg-navy-50"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-card border-2 border-red-300 bg-red-50 p-4">
      <p className="flex items-center gap-1.5 text-sm font-bold text-navy-900">
        <AlertTriangle aria-hidden="true" className="size-4 text-red-600" />
        Delete &ldquo;{title}&rdquo; permanently?
      </p>

      <ul className="mt-2 space-y-1 text-xs leading-relaxed text-ink-700">
        <li>
          The ranking and its {entryCount} {entryCount === 1 ? "entry" : "entries"}{" "}
          are removed, along with the copy written for each one.
        </li>
        <li>
          Any editorial placement curating it loses that item, so no section is
          left pointing at nothing.
        </li>
        <li className="font-semibold text-navy-900">
          The businesses are kept. They are shared records with profiles of
          their own and appearances on other lists.
        </li>
        <li>This cannot be undone.</li>
      </ul>

      <label
        htmlFor={`confirm-delete-${rankingId}`}
        className="mt-3 block text-xs font-semibold text-navy-900"
      >
        Type DELETE to confirm
      </label>
      <input
        id={`confirm-delete-${rankingId}`}
        type="text"
        value={typed}
        autoComplete="off"
        onChange={(event) => setTyped(event.target.value)}
        className="mt-1 w-40 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!armed || busy}
          onClick={() =>
            startTransition(async () => {
              setError("");
              const result = await deleteRanking(rankingId);
              if (result.error) {
                setError(result.error);
                return;
              }
              // The editor's own URL no longer exists; go where the list is.
              router.push("/admin/rankings");
            })
          }
          className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : null}
          Delete permanently
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setTyped("");
            setError("");
          }}
          className="rounded-full border border-navy-300 bg-white px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-50"
        >
          Cancel
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
