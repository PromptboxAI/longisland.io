"use client";

import { GripVertical } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { reorderEntries } from "@/app/admin/rankings/actions";
import { RankingEntryEditor } from "@/components/admin/RankingEntryEditor";
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
  const [order, setOrder] = useState(entries);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, startSave] = useTransition();

  // Server state wins whenever it changes — an entry added or removed elsewhere
  // on the page must not be masked by the local copy.
  const signature = entries.map((e) => e.id).join(",");
  const lastSignature = useRef(signature);
  useEffect(() => {
    if (lastSignature.current !== signature) {
      lastSignature.current = signature;
      setOrder(entries);
    }
  }, [signature, entries]);

  function moveTo(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;

    const next = [...order];
    const from = next.findIndex((e) => e.id === sourceId);
    const to = next.findIndex((e) => e.id === targetId);
    if (from === -1 || to === -1) return;

    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    const previous = order;
    setOrder(next);
    setError("");

    startSave(async () => {
      const result = await reorderEntries(
        rankingId,
        next.map((e) => e.id),
      );
      if (result.error) {
        // Put it back rather than leaving the screen disagreeing with the data.
        setOrder(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div>
      {error ? (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      <ul className="space-y-4">
        {order.map((entry, index) => (
          <li
            key={entry.id}
            onDragOver={(event) => {
              event.preventDefault();
              if (dragging && dragging !== entry.id) setOver(entry.id);
            }}
            onDragLeave={() => setOver((current) => (current === entry.id ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              if (dragging) moveTo(dragging, entry.id);
              setDragging(null);
              setOver(null);
            }}
            className={`relative rounded-card transition-shadow ${
              over === entry.id ? "ring-2 ring-brand-500" : ""
            } ${dragging === entry.id ? "opacity-50" : ""}`}
          >
            <div className="flex items-start gap-2">
              {/*
                Pointer-only affordance, and marked as such. Keyboard users
                reorder with the up/down buttons inside each entry, which do the
                same thing and always have.
              */}
              <span
                draggable
                onDragStart={(event) => {
                  setDragging(entry.id);
                  event.dataTransfer.effectAllowed = "move";
                  // Firefox will not start a drag without payload.
                  event.dataTransfer.setData("text/plain", entry.id);
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setOver(null);
                }}
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
                  isLast={index === order.length - 1}
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
