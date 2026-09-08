"use client";

import { ArrowDown, ArrowUp, Check, Loader2, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  moveSectionItem,
  removeSectionItem,
} from "@/app/admin/editorial/actions";

/**
 * The contents of a placement, as a list you can read at a glance.
 *
 * Every item used to render as a full override form — kicker, headline, dek,
 * image picker, badge, sponsored flag, scheduling, status — so a five-product
 * Top Picks was five of those stacked down the page, and finding the third one
 * meant scrolling past two forms nobody was editing.
 *
 * The common tasks are seeing what is in the list, changing the order, and
 * taking something out. Those are the only things on screen. Overrides are a
 * rarer act and open on request.
 *
 * "Remove" is worded and coloured as removal from THIS PLACEMENT, never as
 * deletion. Taking a product out of Top Picks is not deleting the product, and
 * the wording has to make that obvious before the click rather than after.
 */

export interface PlacementRow {
  id: string;
  position: number;
  headline: string;
  typeLabel: string;
  imageUrl: string | null;
  /** Status of the ranking/product/article this points at. */
  targetStatus: string;
  /** Status of the placement item itself. */
  itemStatus: string;
  context: string | null;
  hasOverrides: boolean;
}

export function PlacementItemList({
  sectionId,
  placementName,
  items,
  onEdit,
}: {
  sectionId: string;
  placementName: string;
  items: PlacementRow[];
  /** Opens the override form for one row. */
  onEdit: (itemId: string) => void;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-line bg-sand-50 p-8 text-center text-sm text-ink-500">
        Nothing in {placementName} yet. Search below to add something.
      </p>
    );
  }

  function move(itemId: string, direction: "up" | "down") {
    setBusyId(itemId);
    startTransition(async () => {
      await moveSectionItem(itemId, sectionId, direction);
      setBusyId(null);
      router.refresh();
    });
  }

  return (
    <ol className="space-y-2">
      {items.map((item, index) => {
        const draftTarget = item.targetStatus !== "published";
        const notLive = item.itemStatus !== "published";

        return (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-card border border-line bg-white p-3"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-bold text-white">
              {index + 1}
            </span>

            {item.imageUrl ? (
              <span className="size-12 shrink-0 overflow-hidden rounded border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt="" className="size-full object-cover" />
              </span>
            ) : (
              <span className="grid size-12 shrink-0 place-items-center rounded border border-dashed border-line text-[9px] font-semibold uppercase text-ink-400">
                No image
              </span>
            )}

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-navy-900">
                {item.headline}
              </span>
              <span className="block text-xs text-ink-500">
                {item.typeLabel}
                {" · "}
                <span className={draftTarget ? "text-amber-700" : "text-emerald-700"}>
                  {draftTarget ? "Draft" : "Published"}
                </span>
                {item.context ? ` · ${item.context}` : ""}
                {item.hasOverrides ? (
                  <span className="ml-1.5 text-brand-600">· customised</span>
                ) : null}
              </span>
              {/*
                Only ever shown when it is actually true. A row that is fine
                says nothing, so a row that says something is worth reading.
              */}
              {draftTarget ? (
                <span className="mt-0.5 block text-[11px] font-semibold text-amber-700">
                  Will not appear publicly until this {item.typeLabel.toLowerCase()} is
                  published
                </span>
              ) : notLive ? (
                <span className="mt-0.5 block text-[11px] font-semibold text-amber-700">
                  Not live yet — use Update {placementName}
                </span>
              ) : null}
            </span>

            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={index === 0 || busyId === item.id}
                aria-label={`Move ${item.headline} up`}
                onClick={() => move(item.id, "up")}
                className="rounded-md border border-line p-1.5 text-ink-700 hover:bg-sand-50 disabled:opacity-40"
              >
                <ArrowUp aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                disabled={index === items.length - 1 || busyId === item.id}
                aria-label={`Move ${item.headline} down`}
                onClick={() => move(item.id, "down")}
                className="rounded-md border border-line p-1.5 text-ink-700 hover:bg-sand-50 disabled:opacity-40"
              >
                <ArrowDown aria-hidden="true" className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => onEdit(item.id)}
                className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-navy-900 hover:bg-sand-50"
              >
                <Pencil aria-hidden="true" className="size-3.5" />
                Customise
              </button>

              {confirmingId === item.id ? (
                <span className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => {
                      setBusyId(item.id);
                      startTransition(async () => {
                        await removeSectionItem(item.id, sectionId);
                        setBusyId(null);
                        setConfirmingId(null);
                        router.refresh();
                      });
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
                  >
                    {busyId === item.id ? (
                      <Loader2 aria-hidden="true" className="size-3 animate-spin" />
                    ) : null}
                    Remove from {placementName}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    aria-label="Cancel"
                    className="rounded-md p-1.5 text-ink-400 hover:text-navy-900"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingId(item.id)}
                  className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-500 hover:border-navy-300 hover:text-navy-900"
                >
                  Remove
                </button>
              )}
            </span>
          </li>
        );
      })}

      {confirmingId ? (
        <li className="rounded-card border border-line bg-sand-50 px-4 py-2.5 text-xs text-ink-700">
          <Check aria-hidden="true" className="mr-1.5 inline size-3.5 text-emerald-600" />
          Removing takes it out of {placementName} only. The content itself stays
          published and stays everywhere else it appears.
        </li>
      ) : null}
    </ol>
  );
}
