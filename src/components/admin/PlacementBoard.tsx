"use client";

import { ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AddSectionItem, SectionItemEditor } from "@/components/admin/SectionItemsEditor";
import { PlacementItemList, type PlacementRow } from "@/components/admin/PlacementItemList";
import { PlacementUpdateBar } from "@/components/admin/PlacementUpdateBar";
import { SingleSlotPlacement, type SlotContent } from "@/components/admin/SingleSlotPlacement";
import type { TargetKind } from "@/lib/data/target-search";
import type { PlacementStatus } from "@/lib/editorial/placement-state";
import type { EditorialSectionItemWithTargets } from "@/types/database";
import type { MediaAsset } from "@/types/media";

/**
 * A placement, in whichever of its two shapes it actually is.
 *
 * The Primary Feature is one slot; Top Picks and Trending are short curated
 * lists. Rendering both as "a section with items" is what made the single slot
 * behave like a list of one — with the replaced item lingering underneath as an
 * expanded draft form that had to be individually unpublished.
 *
 * So the shape is chosen here, once, from the placement's own definition, and
 * each branch gets an interface built for what it actually is.
 */
export function PlacementBoard({
  sectionId,
  placementName,
  singleSlot,
  accepts,
  status,
  rows,
  slotContent,
  items,
  library,
  returnTo,
  placementKey,
  emptyBehaviour,
  preview,
}: {
  sectionId: string;
  placementName: string;
  singleSlot: boolean;
  accepts: TargetKind[];
  status: PlacementStatus;
  rows: PlacementRow[];
  slotContent: SlotContent | null;
  items: EditorialSectionItemWithTargets[];
  library: MediaAsset[];
  returnTo: string;
  /** Scopes the picker to what this placement accepts. */
  placementKey: string;
  /** What the page does when this placement is empty, already worded. */
  emptyBehaviour: string;
  /** Where to go and look at the result. Null when there is nowhere useful. */
  preview: { href: string; label: string } | null;
}) {
  /*
   * Which row has its overrides open. One at a time and closed by default: the
   * common tasks are seeing the list, reordering it and taking something out,
   * and a page of five open forms buries all three.
   */
  const [editingId, setEditingId] = useState<string | null>(null);

  if (singleSlot) {
    /*
     * The single slot gets the same override form as every other placement.
     *
     * It had none: the feature showed the chosen item's own headline and
     * standfirst and offered no way to write different ones for the homepage.
     * An editor could change the wording on the ranking itself — which changes
     * it everywhere — or not at all. That is the one placement on the site
     * where a bespoke standfirst matters most, and it was the only one that
     * could not have one.
     */
    const slotItem = items[0] ?? null;

    return (
      <div className="space-y-5">
        <SingleSlotPlacement
          sectionId={sectionId}
          placementName={placementName}
          accepts={accepts}
          current={slotContent}
          returnTo={returnTo}
        />

        {slotItem ? (
          editingId === slotItem.id ? (
            <section className="rounded-card border-2 border-brand-300 bg-brand-50/30 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
                  Customise how this looks on the homepage
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-xs font-semibold text-navy-900 hover:underline"
                >
                  Done
                </button>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-ink-700">
                Everything here is optional and applies to the homepage only.
                Leave a field empty and the feature uses the content&rsquo;s own
                wording and picture; the content itself is not changed.
              </p>
              <SectionItemEditor
                key={slotItem.id}
                item={slotItem}
                sectionId={sectionId}
                library={library}
                isFirst
                isLast
              />
            </section>
          ) : (
            <button
              type="button"
              onClick={() => setEditingId(slotItem.id)}
              className="inline-flex items-center gap-1.5 rounded-full border border-navy-300 bg-white px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-50"
            >
              <Pencil aria-hidden="true" className="size-3.5" />
              Customise headline and description
            </button>
          )
        ) : null}
      </div>
    );
  }

  const editing = items.find((item) => item.id === editingId) ?? null;

  return (
    <div className="space-y-5">
      <PlacementUpdateBar
        sectionId={sectionId}
        placementName={placementName}
        status={status}
        itemCount={rows.length}
        emptyBehaviour={emptyBehaviour}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
          In {placementName}
          {rows.length > 0 ? (
            <span className="ml-2 font-normal normal-case tracking-normal text-ink-500">
              {rows.length} selected
            </span>
          ) : null}
        </h2>

        <PlacementItemList
          sectionId={sectionId}
          placementName={placementName}
          items={rows}
          onEdit={(id) => setEditingId((current) => (current === id ? null : id))}
        />
      </section>

      {/*
        The override form, only for the row asked for. Everything in it is
        optional — leaving it alone means the card uses the content's own
        words and picture.
      */}
      {editing ? (
        <section className="rounded-card border-2 border-brand-300 bg-brand-50/30 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
              Customise this card
            </h2>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="text-xs font-semibold text-navy-900 hover:underline"
            >
              Done
            </button>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-ink-700">
            Everything here is optional. Leave a field empty and the card uses
            the content&rsquo;s own wording and picture.
          </p>
          <SectionItemEditor
            key={editing.id}
            item={editing}
            sectionId={sectionId}
            library={library}
            isFirst
            isLast
          />
        </section>
      ) : null}

      {/*
        The page as it will be, before committing to it. A card preview answers
        a different question from "does the page work with this on it".

        This used to link to the homepage from every placement, including the
        category ones — sending an editor to preview a page their work does not
        appear on. Only the homepage has a draft-aware preview, so a category
        placement gets a plain link to its real page and says so.
      */}
      {preview ? (
        <Link
          href={preview.href}
          target="_blank"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
        >
          {preview.label}
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </Link>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
          Add to {placementName}
        </h2>
        <AddSectionItem
          sectionId={sectionId}
          placementKey={placementKey}
          returnTo={returnTo}
        />
      </section>
    </div>
  );
}
