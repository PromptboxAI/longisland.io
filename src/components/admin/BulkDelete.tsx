"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export interface BulkRow {
  id: string;
  title: string;
  /** Rows that are live are never selectable. */
  deletable: boolean;
}

/**
 * Selecting rows and deleting them together.
 *
 * The state and the confirmation live here rather than in each list, because
 * this is the part that is dangerous and the part worth having exactly one of.
 * The tables keep their own markup — a product row and a business row show
 * genuinely different things, and flattening them into one configurable table
 * would cost more clarity than the duplication does.
 */
export function useBulkSelect(rows: BulkRow[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const deletable = rows.filter((row) => row.deletable);
  const chosen = rows.filter((row) => selected.has(row.id));
  const allChosen = deletable.length > 0 && chosen.length === deletable.length;

  return {
    selected,
    chosen,
    deletable,
    allChosen,
    error,
    setError,
    clear: () => setSelected(new Set()),
    toggle: (id: string) => {
      setError("");
      setSelected((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    toggleAll: () => {
      setError("");
      setSelected(allChosen ? new Set() : new Set(deletable.map((r) => r.id)));
    },
  };
}

/**
 * The bar that appears once something is ticked.
 *
 * Two deliberate choices, both about the moment before an irreversible click:
 *
 * It names what is going rather than counting it. "Delete 5 items?" is the
 * sentence people dismiss without reading; the titles are what make someone
 * spot the one they did not mean to tick.
 *
 * And it says what is NOT going. "Delete this ranking" reads like it might take
 * the restaurants with it, and the answer to that is the thing an editor most
 * needs before clicking, not after.
 */
export function BulkDeleteBar({
  chosen,
  noun,
  keptNote,
  error,
  onConfirm,
  onError,
  onDone,
}: {
  chosen: BulkRow[];
  /** Singular noun for the selection, e.g. "draft", "business". */
  noun: string;
  /** One sentence on what survives the delete. */
  keptNote: React.ReactNode;
  error: string;
  onConfirm: (ids: string[]) => Promise<{ ok?: boolean; error?: string }>;
  onError: (message: string) => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, startTransition] = useTransition();

  if (chosen.length === 0) {
    return error ? (
      <p className="text-xs font-semibold text-red-700">{error}</p>
    ) : null;
  }

  return (
    <div className="rounded-card border border-amber-300 bg-amber-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-navy-900">
          {chosen.length} {noun}
          {chosen.length === 1 ? "" : "s"} selected
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {confirming ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  startTransition(async () => {
                    const result = await onConfirm(chosen.map((r) => r.id));
                    if (result.error) {
                      onError(result.error);
                      setConfirming(false);
                      return;
                    }
                    onDone();
                    setConfirming(false);
                    router.refresh();
                  })
                }
                className="inline-flex items-center gap-2 rounded-full bg-red-700 px-5 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : null}
                Yes, delete {chosen.length === 1 ? "it" : "them"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-sm font-semibold text-navy-900 hover:underline"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
              Delete selected
            </button>
          )}
        </div>
      </div>

      {confirming ? (
        <div className="mt-3 border-t border-amber-300 pt-3">
          <ul className="space-y-0.5">
            {chosen.map((row) => (
              <li key={row.id} className="text-sm font-semibold text-navy-900">
                · {row.title}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-ink-700">
            This cannot be undone. {keptNote}
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>
      ) : null}
    </div>
  );
}

/** The checkbox cell, or the reason there isn't one. */
export function BulkCheckbox({
  id,
  title,
  checked,
  deletable,
  onToggle,
  blockedReason,
}: {
  id: string;
  title: string;
  checked: boolean;
  deletable: boolean;
  onToggle: () => void;
  /** Why this row cannot be selected. Read by screen readers only. */
  blockedReason: string;
}) {
  if (!deletable) {
    /*
      No checkbox at all rather than a disabled one: there is nothing here for
      an editor to try and fail at, and the rule reads off the table itself.
    */
    return <span className="sr-only">{blockedReason}</span>;
  }

  return (
    <>
      <input
        id={`bulk-${id}`}
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="size-4 cursor-pointer rounded border-line accent-navy-900"
      />
      <label htmlFor={`bulk-${id}`} className="sr-only">
        Select {title}
      </label>
    </>
  );
}

/** The header "select everything selectable" box. */
export function BulkSelectAll({
  any,
  allChosen,
  onToggle,
}: {
  any: boolean;
  allChosen: boolean;
  onToggle: () => void;
}) {
  if (!any) return null;
  return (
    <>
      <input
        id="bulk-select-all"
        type="checkbox"
        checked={allChosen}
        onChange={onToggle}
        className="size-4 cursor-pointer rounded border-line accent-navy-900"
      />
      <label htmlFor="bulk-select-all" className="sr-only">
        Select everything that can be deleted
      </label>
    </>
  );
}
