"use client";

import { AlertTriangle, Check, CloudOff, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { clearPlacement, updatePlacement } from "@/app/admin/editorial/actions";
import type { PlacementStatus } from "@/lib/editorial/placement-state";

/**
 * One state, and one action that resolves it.
 *
 * The database keeps three publication states for a placement — the section's,
 * each item's, and the status of whatever each item points at. Asking an editor
 * to reconcile those produced the failure that started this work: a placement
 * reading "1 item · 0 published" while both the section and the ranking said
 * Published, and an empty homepage underneath.
 *
 * Here there are two answers — Live, or Changes not live — and one button. The
 * button sets the section and every item live together.
 *
 * It deliberately does NOT publish the CONTENT an item points at. Making a
 * homepage change should never quietly publish a half-finished ranking, so that
 * case is reported in words instead: it is a decision about the content, made
 * on the content's own screen.
 */
export function PlacementUpdateBar({
  sectionId,
  placementName,
  status,
  itemCount,
  surfaceName = "homepage",
}: {
  sectionId: string;
  placementName: string;
  /**
   * The page this placement sits on, in an editor's words.
   *
   * A category placement was telling people "the homepage hides it" while they
   * stood on a category page. Wrong, and the kind of wrong that makes someone
   * doubt everything else on the screen.
   */
  surfaceName?: string;
  status: PlacementStatus;
  itemCount: number;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);

  const live = status.state === "live";
  const empty = status.state === "empty";

  return (
    <div
      className={`rounded-card border p-4 ${
        live
          ? "border-emerald-300 bg-emerald-50/60"
          : empty
            ? "border-line bg-sand-50"
            : "border-amber-300 bg-amber-50"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold text-navy-900">
            {live ? (
              <>
                <Check aria-hidden="true" className="size-4 text-emerald-600" />
                Live
              </>
            ) : empty ? (
              <>
                <CloudOff aria-hidden="true" className="size-4 text-ink-400" />
                Nothing here yet
              </>
            ) : (
              <>
                <AlertTriangle aria-hidden="true" className="size-4 text-amber-700" />
                Changes not live
              </>
            )}
          </p>

          <p className="mt-1 text-xs leading-relaxed text-ink-700">
            {live
              ? `Readers are seeing ${status.liveCount} item${status.liveCount === 1 ? "" : "s"} in ${placementName}.`
              : empty
                ? `${placementName} is empty, so the ${surfaceName} hides it.`
                : `${status.pendingCount} of ${itemCount} ${status.pendingCount === 1 ? "item is" : "items are"} not visible to readers yet.`}
          </p>

          {/*
            Named rather than counted. "2 not live" sends someone hunting; "one
            points at a draft product" tells them what to do about it.
          */}
          {status.reasons.length > 0 ? (
            <ul className="mt-2 space-y-0.5">
              {status.reasons.map((reason) => (
                <li key={reason} className="text-xs text-ink-700">
                  · {reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {!live && !empty ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                startTransition(async () => {
                  setError("");
                  const result = await updatePlacement(sectionId);
                  if (result.error) setError(result.error);
                  router.refresh();
                })
              }
              className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : null}
              Update {placementName}
            </button>
          ) : null}

          {itemCount > 0 ? (
            confirmingClear ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await clearPlacement(sectionId);
                      if (result.error) setError(result.error);
                      setConfirmingClear(false);
                      router.refresh();
                    })
                  }
                  className="rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  Yes, clear it
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingClear(false)}
                  className="text-sm font-semibold text-navy-900 hover:underline"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-navy-300 bg-white px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-50"
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                Clear {placementName}
              </button>
            )
          ) : null}
        </div>
      </div>

      {confirmingClear ? (
        <p className="mt-2 text-xs leading-relaxed text-ink-700">
          This empties {placementName}. Everything in it stays published and
          stays everywhere else it appears — clearing a placement is not deleting
          content.
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
