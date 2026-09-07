"use client";

import { Loader2, Plus, Search } from "lucide-react";
import { useActionState, useMemo, useState, useTransition } from "react";

import {
  addEntry,
  createBusinessAndAddEntry,
  type ActionState,
} from "@/app/admin/rankings/actions";

/**
 * Adds a business to a ranking.
 *
 * Two routes in, because an editor arrives with one of two problems. Usually
 * the business already exists — it came from a Yelp search for another list, or
 * someone added it by hand — and needs finding. Sometimes it does not exist at
 * all, and the honest answer is to create it here rather than sending the
 * editor to another screen to come back and search again; that round trip is
 * how a list gets published without the place that should have been on it.
 *
 * Either way the entry is appended at the end. Nothing about where a business
 * came from decides where it ranks — that is the editor's job, done with the
 * move controls on each row.
 */

export interface AddRankingEntryProps {
  rankingId: string;
  businesses: { id: string; name: string; city: string | null; status: string }[];
  /** Already on the list — offered but marked, rather than hidden. */
  usedBusinessIds: string[];
}

const INPUT =
  "w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";
const PRIMARY =
  "inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60";

export function AddRankingEntry({
  rankingId,
  businesses,
  usedBusinessIds,
}: AddRankingEntryProps) {
  const [filter, setFilter] = useState("");
  const [adding, startAdd] = useTransition();
  const [addError, setAddError] = useState("");
  const [mode, setMode] = useState<"search" | "create">("search");

  const used = useMemo(() => new Set(usedBusinessIds), [usedBusinessIds]);

  const results = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return businesses.slice(0, 8);
    return businesses
      .filter((b) => `${b.name} ${b.city ?? ""}`.toLowerCase().includes(needle))
      .slice(0, 20);
  }, [businesses, filter]);

  const [createState, createAction, creating] = useActionState<ActionState, FormData>(
    createBusinessAndAddEntry,
    {},
  );

  return (
    <div className="rounded-card border border-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
          Add a business
        </h3>
        <div className="flex gap-1 rounded-full border border-line p-0.5">
          <button
            type="button"
            onClick={() => setMode("search")}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              mode === "search" ? "bg-navy-900 text-white" : "text-ink-700"
            }`}
          >
            Find existing
          </button>
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              mode === "create" ? "bg-navy-900 text-white" : "text-ink-700"
            }`}
          >
            Create new
          </button>
        </div>
      </div>

      {mode === "search" ? (
        <div className="mt-4">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            />
            <input
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Search every business we hold, by name or town"
              className={`${INPUT} pl-9`}
            />
          </div>

          {results.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">
              Nothing matches. Use <strong>Create new</strong> if this place is
              not in the system yet.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-md border border-line">
              {results.map((business) => {
                const already = used.has(business.id);
                return (
                  <li
                    key={business.id}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-navy-900">
                        {business.name}
                      </span>
                      <span className="block truncate text-xs text-ink-500">
                        {business.city ?? "No town set"} · {business.status}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={already || adding}
                      onClick={() =>
                        startAdd(async () => {
                          setAddError("");
                          const result = await addEntry(rankingId, business.id);
                          if (result.error) setAddError(result.error);
                        })
                      }
                      className="shrink-0 rounded-full border border-navy-300 px-3 py-1 text-xs font-semibold text-navy-900 hover:border-navy-500 hover:bg-navy-50 disabled:opacity-50"
                    >
                      {already ? "On the list" : "Add"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {!filter ? (
            <p className="mt-2 text-xs text-ink-400">
              Showing the most recent. Type to search all {businesses.length}.
            </p>
          ) : null}
          {addError ? (
            <p className="mt-2 text-xs font-semibold text-red-600">{addError}</p>
          ) : null}
        </div>
      ) : (
        <form action={createAction} className="mt-4">
          <input type="hidden" name="rankingId" value={rankingId} />

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
            <div>
              <label htmlFor="new-business-name" className="block text-xs font-semibold text-navy-900">
                Business name
              </label>
              <input
                id="new-business-name"
                name="name"
                required
                minLength={2}
                className={`mt-1 ${INPUT}`}
                placeholder="Lombardi's on the Bay"
              />
            </div>
            <div>
              <label htmlFor="new-business-city" className="block text-xs font-semibold text-navy-900">
                Town
              </label>
              <input
                id="new-business-city"
                name="city"
                className={`mt-1 ${INPUT}`}
                placeholder="Patchogue"
              />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={creating} className={PRIMARY}>
                {creating ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <Plus aria-hidden="true" className="size-4" />
                )}
                Create &amp; add
              </button>
            </div>
          </div>

          {createState.error ? (
            <p className="mt-2 text-xs font-semibold text-red-600">{createState.error}</p>
          ) : null}

          <p className="mt-2 text-xs text-ink-400">
            Creates a draft business with just a name and town — enough to rank
            it. Fill in the address, phone and photo on its profile afterwards.
            It stays out of public pages until you publish the profile.
          </p>
        </form>
      )}
    </div>
  );
}
