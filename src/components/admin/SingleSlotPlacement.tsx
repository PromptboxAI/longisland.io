"use client";

import { Check, Loader2, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { clearPlacement, setSingleSlotTarget } from "@/app/admin/editorial/actions";
import { TargetPicker } from "@/components/admin/TargetPicker";
import type { TargetKind, TargetResult } from "@/lib/data/target-search";

/**
 * A placement that holds exactly one thing.
 *
 * The Primary Feature is one slot, and treating it as a list of one was the
 * source of most of the confusion around it. Adding produced a second item with
 * the old one lingering underneath as an expanded draft form, which then had to
 * be individually unpublished — three decisions to answer a question that has
 * one: what should the homepage lead with right now.
 *
 * So there is no list here, no per-item status, and no add. There is what is
 * live, and a way to change it.
 */

export interface SlotContent {
  headline: string;
  dek: string | null;
  kicker: string | null;
  imageUrl: string | null;
  typeLabel: string;
  targetStatus: string;
}

export function SingleSlotPlacement({
  sectionId,
  placementName,
  accepts,
  current,
  returnTo,
}: {
  sectionId: string;
  placementName: string;
  accepts: TargetKind[];
  current: SlotContent | null;
  returnTo: string;
}) {
  const router = useRouter();
  const [choosing, setChoosing] = useState(current === null);
  const [chosen, setChosen] = useState<TargetResult | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);

  function apply(result: TargetResult) {
    startTransition(async () => {
      setError("");
      const outcome = await setSingleSlotTarget(sectionId, result.kind, result.id);
      if (outcome.error) {
        setError(outcome.error);
        return;
      }
      setChoosing(false);
      setChosen(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------ what readers see */}
      {current ? (
        <section className="rounded-card border border-line bg-white p-5">
          <div className="flex items-center gap-2">
            <Check aria-hidden="true" className="size-4 text-emerald-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Currently live
            </h2>
          </div>

          <SlotCard content={current} className="mt-3" />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setChoosing((open) => !open)}
              className="rounded-full bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800"
            >
              {choosing ? "Keep what is there" : `Change ${placementName.toLowerCase()}`}
            </button>

            {confirmingClear ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    startTransition(async () => {
                      const outcome = await clearPlacement(sectionId);
                      if (outcome.error) setError(outcome.error);
                      setConfirmingClear(false);
                      router.refresh();
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  ) : null}
                  Yes, clear it
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingClear(false)}
                  className="text-sm font-semibold text-navy-900 hover:underline"
                >
                  Cancel
                </button>
                {/*
                  Says what clearing does NOT do, because that is the fear —
                  people assume removing something from the homepage deletes it.
                */}
                <p className="w-full text-xs text-ink-500">
                  This empties the slot. The {current.typeLabel.toLowerCase()}{" "}
                  itself stays published and stays everywhere else it appears.
                </p>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-navy-300 px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-50"
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                Clear
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-card border border-dashed border-line bg-sand-50 p-6 text-center">
          <p className="text-sm font-semibold text-navy-900">
            Nothing is featured right now
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-ink-500">
            The homepage hides this area until something is chosen. It is never
            filled automatically — the lead story is the one decision on the page
            that should not be made by a sort order.
          </p>
        </section>
      )}

      {/* ------------------------------------------------------- choose one */}
      {choosing ? (
        <section className="rounded-card border border-line bg-white p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-navy-900">
            Choose content
          </h2>

          <div className="mt-3">
            <TargetPicker
              accepts={accepts}
              selectedId={chosen?.id ?? null}
              onSelect={setChosen}
              returnTo={returnTo}
            />
          </div>

          {chosen ? (
            <div className="mt-4 rounded-card border border-brand-300 bg-brand-50/40 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-navy-900">
                Feature preview
              </h3>
              <SlotCard
                className="mt-3"
                content={{
                  headline: chosen.title,
                  dek: chosen.dek,
                  kicker: chosen.kicker,
                  imageUrl: chosen.imageUrl,
                  typeLabel: chosen.typeLabel,
                  targetStatus: chosen.status,
                }}
              />

              {chosen.status !== "published" ? (
                <p className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                  This is still a draft, so readers will not see it here until it
                  is published.
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => apply(chosen)}
                  className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  ) : null}
                  Set as {placementName}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setChosen(null)}
                  className="text-sm font-semibold text-navy-900 hover:underline"
                >
                  Choose something else
                </button>
              </div>

              {current ? (
                <p className="mt-2 text-xs text-ink-500">
                  This replaces &ldquo;{current.headline}&rdquo; here.{" "}
                  {current.headline} stays published and stays everywhere else it
                  appears.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {error ? (
        <p className="text-sm font-semibold text-red-700">{error}</p>
      ) : null}
    </div>
  );
}

/**
 * The card as a reader would see it.
 *
 * Not headed "what this will inherit" — that names a mechanism. The editor is
 * looking at a preview of a card, so it says so, and the fact that the words
 * come from the chosen content rather than from an override is a footnote
 * rather than the title.
 */
function SlotCard({
  content,
  className = "",
}: {
  content: SlotContent;
  className?: string;
}) {
  return (
    <div className={`flex gap-4 ${className}`}>
      {content.imageUrl ? (
        <span className="h-24 w-36 shrink-0 overflow-hidden rounded border border-line bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={content.imageUrl} alt="" className="size-full object-cover" />
        </span>
      ) : (
        <span className="grid h-24 w-36 shrink-0 place-items-center rounded border border-dashed border-line bg-white px-2 text-center text-[11px] font-semibold text-amber-700">
          No image yet
        </span>
      )}

      <div className="min-w-0 flex-1">
        {content.kicker ? (
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
            {content.kicker}
          </p>
        ) : null}
        <p className="mt-0.5 text-lg font-bold leading-snug text-navy-900">
          {content.headline}
        </p>
        {content.dek ? (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-700">
            {content.dek}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-ink-500">
          {content.typeLabel}
          {" · "}
          <span
            className={
              content.targetStatus === "published"
                ? "text-emerald-700"
                : "text-amber-700"
            }
          >
            {content.targetStatus === "published" ? "Published" : "Draft"}
          </span>
          <span className="ml-2 text-ink-400">
            <Pencil aria-hidden="true" className="mr-1 inline size-3" />
            Using the content&rsquo;s own words and picture
          </span>
        </p>
      </div>
    </div>
  );
}
