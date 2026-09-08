"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { openPlacement } from "@/app/admin/editorial/actions";

/**
 * Choosing which category a category placement belongs to.
 *
 * The Featured Module and Heading Links exist once per category, not once for
 * the site. The dashboard offered a plain "Set up" button that passed no
 * category — so it tried to create a row with `scope_type = 'category'` and no
 * `category_id`, the database check constraint rejected it, and the editor was
 * redirected back to the same page with nothing created and nothing said.
 *
 * Silently doing nothing is the worst possible answer, and it meant category
 * placements could not be configured from admin at all.
 *
 * The missing question is simply which category, so it is asked. Existing ones
 * are listed alongside, because "configured on 3 categories" is a fact an
 * editor can do nothing with — the useful thing is a way in to each.
 */
export function ScopedPlacementPicker({
  placementKey,
  placementName,
  categories,
  configured,
}: {
  placementKey: string;
  placementName: string;
  categories: { id: string; name: string }[];
  /** Categories that already have this placement, with the row to open. */
  configured: { sectionId: string; categoryId: string; categoryName: string }[];
}) {
  const [categoryId, setCategoryId] = useState("");
  const [busy, startTransition] = useTransition();

  const taken = new Set(configured.map((row) => row.categoryId));
  const available = categories.filter((category) => !taken.has(category.id));

  return (
    <div className="space-y-2">
      {configured.length > 0 ? (
        <ul className="space-y-1">
          {configured.map((row) => (
            <li key={row.sectionId}>
              <Link
                href={`/admin/editorial/${row.sectionId}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
              >
                {row.categoryName}
                <ArrowRight aria-hidden="true" className="size-3" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-ink-700">
          Not set up on any category yet.
        </p>
      )}

      {available.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`scope-${placementKey}`} className="sr-only">
            Category for {placementName}
          </label>
          <select
            id={`scope-${placementKey}`}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-line bg-white px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Choose a category…</option>
            {available.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={!categoryId || busy}
            onClick={() =>
              startTransition(async () => {
                // Navigates to the new placement on success.
                await openPlacement(placementKey, { categoryId });
              })
            }
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-navy-300 px-3.5 py-1.5 text-xs font-semibold text-navy-900 hover:border-navy-500 hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? (
              <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            ) : null}
            Set up
          </button>
        </div>
      ) : (
        <p className="text-xs text-ink-400">
          Every category already has one.
        </p>
      )}
    </div>
  );
}
