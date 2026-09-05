"use client";

import { AlertCircle, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CandidateCard } from "@/components/admin/CandidateCard";
import { SEARCH_AREAS, SEARCH_TOWNS, resolveArea } from "@/lib/yelp/areas";
import { YELP_SORT_OPTIONS, type YelpSortBy } from "@/lib/yelp/schema";
import type { YelpBusiness } from "@/lib/yelp/types";
import type { Category, Place } from "@/types/database";

export interface GenerateWorkbenchProps {
  categories: Category[];
  places: Place[];
  yelpConfigured: boolean;
}

const SORT_LABELS: Record<YelpSortBy, string> = {
  best_match: "Best match",
  rating: "Rating",
  review_count: "Review count",
  distance: "Distance",
};

interface SearchResponse {
  businesses: YelpBusiness[];
  count: number;
  total: number;
}

interface ErrorResponse {
  error: { code: string; message: string; details?: unknown };
}

export function GenerateWorkbench({
  categories,
  places,
  yelpConfigured,
}: GenerateWorkbenchProps) {
  const router = useRouter();

  const [topic, setTopic] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [area, setArea] = useState("long-island");
  const [resultCount, setResultCount] = useState(10);
  const [minReviews, setMinReviews] = useState(100);
  const [sortBy, setSortBy] = useState<YelpSortBy>("best_match");

  const [candidates, setCandidates] = useState<YelpBusiness[]>([]);
  // Insertion order is the ranking order, so this is an array, not a Set.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);

  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [total, setTotal] = useState(0);

  async function findCandidates(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setError("");

    const { location } = resolveArea(area);

    try {
      const response = await fetch("/api/yelp/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: topic,
          location,
          sortBy,
          // Over-fetch so the review floor still leaves a full slate to pick
          // from; Yelp caps a page at 50.
          limit: Math.min(50, Math.max(resultCount * 2, 20)),
        }),
      });

      const body = (await response.json()) as SearchResponse | ErrorResponse;

      if (!response.ok) {
        setError(
          "error" in body ? body.error.message : "The search could not be run.",
        );
        setCandidates([]);
        return;
      }

      const result = body as SearchResponse;
      setCandidates(result.businesses);
      setTotal(result.total);
      setSelectedIds([]);
      setExcludedIds([]);
      setSearched(true);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSearching(false);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length >= resultCount
          ? current
          : [...current, id],
    );
  }

  function toggleExcluded(id: string) {
    setExcludedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
    setSelectedIds((current) => current.filter((value) => value !== id));
  }

  async function createRanking() {
    setCreating(true);
    setError("");

    const ordered = selectedIds
      .map((id) => candidates.find((candidate) => candidate.id === id))
      .filter((candidate) => candidate !== undefined);

    const areaLabel =
      SEARCH_AREAS.find((option) => option.value === area)?.label ?? area;

    try {
      const response = await fetch("/api/admin/rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `The ${ordered.length} Best ${titleCase(topic)} in ${areaLabel}`,
          categoryId: categoryId || null,
          placeId: places.find((place) => place.slug === area)?.id ?? null,
          geography: areaLabel,
          candidates: ordered.map((candidate) => ({
            externalId: candidate.id,
            provider: "yelp" as const,
            name: candidate.name,
            city: candidate.city,
            county: candidate.county,
            address: candidate.address,
            zip: candidate.zip,
            phone: candidate.displayPhone ?? candidate.phone,
            latitude: candidate.latitude,
            longitude: candidate.longitude,
            externalUrl: candidate.yelpUrl,
          })),
        }),
      });

      const body = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !body.id) {
        setError(body.error ?? "Could not create the ranking.");
        return;
      }

      router.push(`/admin/rankings/${body.id}`);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setCreating(false);
    }
  }

  // The review floor is applied here rather than in the API so the route stays
  // a thin Yelp proxy — one contract, with no editorial policy baked into it.
  const visible = candidates.filter(
    (candidate) =>
      !excludedIds.includes(candidate.id) && candidate.reviewCount >= minReviews,
  );

  const inputClass =
    "w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="space-y-6">
      {!yelpConfigured ? (
        <div className="flex items-start gap-2.5 rounded-card border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            <strong className="font-bold">YELP_API_KEY is not set.</strong> Add it
            to <code className="rounded bg-amber-100 px-1">.env.local</code> and
            restart the dev server to search for candidates.
          </p>
        </div>
      ) : null}

      {/* Search form */}
      <form
        onSubmit={findCandidates}
        className="rounded-card border border-line bg-white p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="topic" className="block text-sm font-semibold text-navy-900">
              Topic
            </label>
            <input
              id="topic"
              type="text"
              required
              placeholder="Pizza"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className={`mt-2 ${inputClass}`}
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-semibold text-navy-900">
              Category
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={`mt-2 ${inputClass} bg-white`}
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="area" className="block text-sm font-semibold text-navy-900">
              Area
            </label>
            <select
              id="area"
              value={area}
              onChange={(event) => setArea(event.target.value)}
              className={`mt-2 ${inputClass} bg-white`}
            >
              <optgroup label="Regions">
                {SEARCH_AREAS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Towns">
                {SEARCH_TOWNS.map((town) => (
                  <option key={town} value={town}>
                    {town}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label htmlFor="count" className="block text-sm font-semibold text-navy-900">
              Number of results
            </label>
            <input
              id="count"
              type="number"
              min={3}
              max={25}
              value={resultCount}
              onChange={(event) => setResultCount(Number(event.target.value))}
              className={`mt-2 ${inputClass}`}
            />
          </div>

          <div>
            <label
              htmlFor="min-reviews"
              className="block text-sm font-semibold text-navy-900"
            >
              Minimum reviews
            </label>
            <input
              id="min-reviews"
              type="number"
              min={0}
              step={25}
              value={minReviews}
              onChange={(event) => setMinReviews(Number(event.target.value))}
              className={`mt-2 ${inputClass}`}
            />
          </div>

          <div>
            <label htmlFor="sort" className="block text-sm font-semibold text-navy-900">
              Sort preference
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as YelpSortBy)}
              className={`mt-2 ${inputClass} bg-white`}
            >
              {YELP_SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {SORT_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={searching || !yelpConfigured}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
        >
          {searching ? (
            <>
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              Searching
            </>
          ) : (
            <>
              <Search aria-hidden="true" className="size-4" />
              Find Candidates
            </>
          )}
        </button>

        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          Results come from the Yelp Fusion API and are research input only.
          Ratings shown belong to Yelp, are never stored on our business records,
          and never appear on the public site. You choose and order the final
          list.
        </p>
      </form>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {/* Results */}
      {searched ? (
        <div className="rounded-card border border-line bg-white">
          <div className="sticky top-14 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-5 py-3.5">
            <div>
              <p className="text-sm font-semibold text-navy-900">
                Selected {selectedIds.length} / {resultCount}
              </p>
              <p className="text-xs text-ink-500">
                {visible.length} shown
                {minReviews > 0 ? ` · ${minReviews}+ reviews` : ""}
                {total > candidates.length ? ` · ${total} matched on Yelp` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={createRanking}
              disabled={selectedIds.length === 0 || creating}
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  Creating
                </>
              ) : (
                "Create Ranking"
              )}
            </button>
          </div>

          {visible.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-500">
              No candidates matched. Try a broader topic, a wider area, or a lower
              review minimum.
            </p>
          ) : (
            <div className="space-y-3 p-5">
              {visible.map((candidate) => {
                const selectionIndex = selectedIds.indexOf(candidate.id);

                return (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    selected={selectionIndex !== -1}
                    excluded={excludedIds.includes(candidate.id)}
                    position={selectionIndex === -1 ? undefined : selectionIndex + 1}
                    onToggle={() => toggleSelected(candidate.id)}
                    onExclude={() => toggleExcluded(candidate.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
