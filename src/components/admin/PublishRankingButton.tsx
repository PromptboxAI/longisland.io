"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { publishRankingWithBusinesses } from "@/app/admin/rankings/actions";

/**
 * Publish, including whatever the ranking needs to actually be readable.
 *
 * Publishing a ranking whose businesses are still drafts produced something
 * marked PUBLISHED that rendered "no published entries" — correct under RLS and
 * useless to the editor who chose those businesses and then pressed Publish.
 *
 * The draft gate on researched businesses is worth keeping: nothing should
 * reach the site straight from a Yelp search. So the gate stays and clearing it
 * becomes part of the same action, named in the button so it is a decision
 * rather than a side effect.
 */
export function PublishRankingButton({
  rankingId,
  draftBusinessCount,
}: {
  rankingId: string;
  draftBusinessCount: number;
}) {
  const [publishing, startPublish] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const needsBusinesses = draftBusinessCount > 0;

  function publish() {
    startPublish(async () => {
      setError("");
      const result = await publishRankingWithBusinesses(rankingId);
      if (result.error) setError(result.error);
      setConfirming(false);
    });
  }

  if (confirming && needsBusinesses) {
    return (
      <div className="rounded-card border border-amber-300 bg-amber-50 p-3">
        <p className="text-sm font-semibold text-navy-900">
          {draftBusinessCount} business
          {draftBusinessCount === 1 ? " on" : "es on"} this list{" "}
          {draftBusinessCount === 1 ? "is a draft" : "are drafts"}.
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink-700">
          They have to be published too, or the ranking goes live showing
          nothing.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={publishing}
            onClick={publish}
            className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
          >
            {publishing ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : null}
            Publish ranking &amp; {draftBusinessCount} business
            {draftBusinessCount === 1 ? "" : "es"}
          </button>
          <button
            type="button"
            disabled={publishing}
            onClick={() => setConfirming(false)}
            className="rounded-full border border-navy-300 px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-50"
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

  return (
    <div>
      <button
        type="button"
        disabled={publishing}
        onClick={() => (needsBusinesses ? setConfirming(true) : publish())}
        className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
      >
        {publishing ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : null}
        Publish
      </button>
      {error ? (
        <p className="mt-1 text-xs font-semibold text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
