"use client";

import { GripVertical } from "lucide-react";
import { useState, useTransition } from "react";

import { reorderEntries } from "@/app/admin/rankings/actions";
import { RankingEntryEditor } from "@/components/admin/RankingEntryEditor";
import { useDragOrder } from "@/components/admin/useDragOrder";
import type { RankingEntryWithBusiness } from "@/types/database";
import type { MediaAsset } from "@/types/media";

/**
 * The ordered list of ranking entries.
 *
 * Drag to reorder, because up/down buttons are fine for three entries and
 * unusable for twenty — moving a new pick from last to second is nineteen
 * clicks and nineteen writes.
 *
 * The buttons stay. They are not a fallback: they are how this works with a
 * keyboard, and the drag handle is explicitly hidden from assistive technology
 * rather than being given a fake accessible name that suggests it can be
 * operated without a pointer.
 *
 * Order is applied optimistically and saved as one complete list, so the
 * positions the server writes are always 1..n and never a half-applied
 * sequence of swaps.
 */
export function RankingEntryList({
  entries,
  rankingId,
  library,
  rankingPlaceName = null,
  yelpReferencedBusinessIds = [],
  aiConfigured = false,
  rankingPublished = false,
}: {
  entries: RankingEntryWithBusiness[];
  rankingId: string;
  library: MediaAsset[];
  rankingPlaceName?: string | null;
  yelpReferencedBusinessIds?: string[];
  aiConfigured?: boolean;
  rankingPublished?: boolean;
}) {
  const [error, setError] = useState("");
  const [saving, startSave] = useTransition();

  /*
   * No local mirror of `entries`.
   *
   * The old copy needed an effect watching a joined-id signature to notice when
   * the server list changed under it, or an entry added elsewhere on the page
   * stayed invisible. The hook holds an order only while a drag is in flight,
   * so props are the source of truth the rest of the time and there is nothing
   * to resynchronise.
   */
  const drag = useDragOrder(
    entries,
    (orderedIds) =>
      new Promise<void>((resolve) => {
        setError("");
        startSave(async () => {
          const result = await reorderEntries(rankingId, orderedIds);
          // Left to the server's list rather than patched locally: a refused
          // reorder should show what the database actually has.
          if (result.error) setError(result.error);
          resolve();
        });
      }),
  );

  return (
    <div>
      {error ? (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      <ul className="space-y-4">
        {drag.ordered.map((entry, index) => (
          <li
            key={entry.id}
            ref={(el) => drag.registerRow(entry.id, el)}
            className={`relative rounded-card transition-shadow ${
              drag.draggingId === entry.id ? "opacity-60 ring-2 ring-brand-500" : ""
            }`}
          >
            <div className="flex items-start gap-2">
              {/*
                Pointer-only affordance, and marked as such. Keyboard users
                reorder with the up/down buttons inside each entry, which do the
                same thing and always have.
              */}
              <span
                {...drag.handleProps(entry.id)}
                aria-hidden="true"
                title="Drag to reorder"
                className="mt-6 flex cursor-grab select-none flex-col items-center gap-1 rounded px-1 py-2 text-ink-400 hover:bg-sand-100 hover:text-navy-900 active:cursor-grabbing"
              >
                <GripVertical className="size-4" />
                <span className="font-mono text-[11px] font-semibold tabular-nums">
                  {index + 1}
                </span>
              </span>

              <div className="min-w-0 flex-1">
                <RankingEntryEditor
                  entry={entry}
                  rankingId={rankingId}
                  isFirst={index === 0}
                  isLast={index === entries.length - 1}
                  library={library}
                  rankingPlaceName={rankingPlaceName}
                  hasYelpReference={yelpReferencedBusinessIds.includes(
                    entry.business.id,
                  )}
                  aiConfigured={aiConfigured}
                  rankingPublished={rankingPublished}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-ink-400" aria-live="polite">
        {saving
          ? "Saving order…"
          : "Drag the handle to reorder, or use the arrows on any entry."}
      </p>
    </div>
  );
}
