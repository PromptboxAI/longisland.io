"use client";

import { Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteRankings } from "@/app/admin/rankings/actions";
import { StatusPill } from "@/components/admin/StatusPill";

export interface BulkRankingRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  entry_count: number;
  categoryName: string | null;
  areaName: string | null;
}

/**
 * The rankings table, with a way to clear out drafts.
 *
 * Only drafts get a checkbox. Published rows are not selectable at all, which
 * states the existing "unpublish before you delete" rule more plainly than a
 * dialog can — a control that is absent cannot be clicked through on autopilot,
 * and one careless click here would take several rows at once rather than one.
 *
 * The confirmation lists the titles rather than counting them. "Delete 5
 * items?" is the sentence people dismiss without reading; the names are what
 * make someone notice the one they did not mean to tick. It also says what is
 * NOT being deleted, because "delete this ranking" reads like it might take the
 * restaurants with it, and that is the thing worth being unambiguous about.
 */
export function RankingBulkList({ rankings }: { rankings: BulkRankingRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  const deletable = rankings.filter((row) => row.status !== "published");
  const chosen = rankings.filter((row) => selected.has(row.id));
  const allChosen = deletable.length > 0 && chosen.length === deletable.length;

  function toggle(id: string) {
    setError("");
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setError("");
    setConfirming(false);
    setSelected(allChosen ? new Set() : new Set(deletable.map((row) => row.id)));
  }

  function run() {
    startTransition(async () => {
      const result = await deleteRankings([...selected]);
      if (result.error) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      setSelected(new Set());
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {chosen.length > 0 ? (
        <div className="rounded-card border border-amber-300 bg-amber-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-navy-900">
              {chosen.length} draft{chosen.length === 1 ? "" : "s"} selected
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {confirming ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={run}
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
              {/* Named, not counted — the names are what make someone spot a mistake. */}
              <ul className="space-y-0.5">
                {chosen.map((row) => (
                  <li key={row.id} className="text-sm font-semibold text-navy-900">
                    · {row.title}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs leading-relaxed text-ink-700">
                This cannot be undone. The businesses on these lists are{" "}
                <strong className="font-semibold">not</strong> deleted — they are
                shared records and stay everywhere else they appear.
              </p>
            </div>
          ) : null}

          {error ? (
            <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>
          ) : null}
        </div>
      ) : error ? (
        <p className="text-xs font-semibold text-red-700">{error}</p>
      ) : null}

      <div className="overflow-x-auto rounded-card border border-line bg-white">
        <table className="w-full min-w-3xl text-sm">
          <thead className="border-b border-line bg-sand-50 text-left">
            <tr>
              <th scope="col" className="w-10 px-5 py-3">
                {deletable.length > 0 ? (
                  <>
                    <input
                      id="select-all-drafts"
                      type="checkbox"
                      checked={allChosen}
                      onChange={toggleAll}
                      className="size-4 cursor-pointer rounded border-line accent-navy-900"
                    />
                    <label htmlFor="select-all-drafts" className="sr-only">
                      Select every draft
                    </label>
                  </>
                ) : null}
              </th>
              {["Title", "Category", "Area", "Entries", "Status"].map((head) => (
                <th
                  key={head}
                  scope="col"
                  className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rankings.map((ranking) => {
              const isChosen = selected.has(ranking.id);
              return (
                <tr
                  key={ranking.id}
                  className={isChosen ? "bg-amber-50" : "hover:bg-sand-50"}
                >
                  <td className="px-5 py-3">
                    {ranking.status !== "published" ? (
                      <>
                        <input
                          id={`select-${ranking.id}`}
                          type="checkbox"
                          checked={isChosen}
                          onChange={() => toggle(ranking.id)}
                          className="size-4 cursor-pointer rounded border-line accent-navy-900"
                        />
                        <label htmlFor={`select-${ranking.id}`} className="sr-only">
                          Select {ranking.title}
                        </label>
                      </>
                    ) : (
                      /*
                        Published rows have no checkbox rather than a disabled
                        one: there is nothing here for an editor to try and fail
                        at, and the rule reads off the table itself.
                      */
                      <span className="sr-only">
                        Published — unpublish before deleting
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/rankings/${ranking.id}`}
                      className="font-semibold text-navy-900 hover:text-brand-600 hover:underline"
                    >
                      {ranking.title}
                    </Link>
                    <span className="mt-0.5 block font-mono text-xs text-ink-400">
                      /{ranking.slug}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-700">
                    {ranking.categoryName ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-ink-700">{ranking.areaName ?? "—"}</td>
                  <td className="px-5 py-3 tabular-nums text-ink-700">
                    {ranking.entry_count}
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill status={ranking.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
