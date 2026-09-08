"use client";

import { AlertCircle, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CandidateCard } from "@/components/admin/CandidateCard";
import {
  suggestRankingSlug,
  suggestRankingTitle,
} from "@/lib/rankings/naming";
import {
  SEARCH_AREAS,
  SEARCH_TOWNS,
  classifyLocation,
  isOnLongIsland,
  resolveArea,
} from "@/lib/yelp/areas";
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
  /*
   * Two different numbers, deliberately separate.
   *
   * `rankingSize` is how many businesses the published list holds.
   * `batchSize` is how many candidates Yelp is asked for at a time.
   *
   * They used to be one, which meant asking for a ten-item list capped the
   * research pool at ten — and a strong candidate sitting at Yelp's 40th result
   * was unreachable no matter how many matches Yelp reported.
   */
  const [rankingSize, setRankingSize] = useState(10);
  const [batchSize, setBatchSize] = useState(25);
  const [minReviews, setMinReviews] = useState(100);
  // Rating rather than best_match: for a local "best of" list, Yelp's adjusted
  // rating is the closest thing it offers to the question we are asking.
  const [sortBy, setSortBy] = useState<YelpSortBy>("rating");

  const [candidates, setCandidates] = useState<YelpBusiness[]>([]);
  // Insertion order is the ranking order, so this is an array, not a Set.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);

  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  /** How many rows the last request actually returned. */
  const [fetchedSoFar, setFetchedSoFar] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [nameSearching, setNameSearching] = useState(false);
  const [displaySort, setDisplaySort] = useState<
    "yelp" | "rating" | "reviews" | "distance"
  >("yelp");
  // Empty means "use the suggestion". An editor who types here owns the value.
  const [titleOverride, setTitleOverride] = useState("");
  const [slugOverride, setSlugOverride] = useState("");

  /*
   * The town or region being searched, for comparison against where each
   * candidate actually is. A region ("Suffolk County") has no single town to
   * compare against, so it stays null and the cards show plain geography.
   */
  const searchAreaLabel = SEARCH_TOWNS.includes(area) ? area : null;

  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;
  const currentAreaLabel =
    SEARCH_AREAS.find((option) => option.value === area)?.label ?? area;
  const suggestedTitle = suggestRankingTitle({
    count: selectedIds.length,
    categorySlug: selectedCategory?.slug ?? null,
    categoryName: selectedCategory?.name ?? null,
    topic,
    areaLabel: currentAreaLabel,
  });
  const suggestedSlug = suggestRankingSlug({
    categorySlug: selectedCategory?.slug ?? null,
    topic,
    areaSlug: area,
  });

  /**
   * One request to Yelp, shared by the initial search, Load More, and the
   * search-by-name box.
   *
   * `append` is what makes deeper research possible without losing work:
   * selections, exclusions and the order they were made in are untouched, and
   * candidates already on screen are not duplicated.
   */
  async function runSearch({
    term,
    nextOffset,
    append,
  }: {
    term: string;
    nextOffset: number;
    append: boolean;
  }): Promise<number | null> {
    const { location } = resolveArea(area);

    try {
      const response = await fetch("/api/yelp/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: term || undefined,
          location,
          sortBy,
          limit: Math.min(50, Math.max(batchSize, 1)),
          offset: nextOffset,
        }),
      });

      const body = (await response.json()) as SearchResponse | ErrorResponse;

      if (!response.ok) {
        setError("error" in body ? body.error.message : "The search could not be run.");
        if (!append) setCandidates([]);
        return null;
      }

      const result = body as SearchResponse;
      setTotal(result.total);
      setCandidates((current) => {
        if (!append) return result.businesses;
        const seen = new Set(current.map((c) => c.id));
        return [...current, ...result.businesses.filter((c) => !seen.has(c.id))];
      });
      return result.businesses.length;
    } catch {
      setError("Could not reach the server.");
      return null;
    }
  }

  async function findCandidates(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setError("");

    const fetched = await runSearch({ term: topic, nextOffset: 0, append: false });
    if (fetched !== null) {
      setFetchedSoFar(fetched);
      setOffset(0);
      // A fresh search is a fresh slate; Load More is what preserves choices.
      setSelectedIds([]);
      setExcludedIds([]);
      setSearched(true);
    }
    setSearching(false);
  }

  /**
   * The next page starts where Yelp actually stopped.
   *
   * It used to advance by the batch size we asked for. Those are the same
   * number right up until they are not — Yelp returns short near the end of a
   * result set, and near the 240 ceiling — and every row in the gap is one an
   * editor never sees and cannot know they missed. Advancing by what came back
   * cannot skip a record.
   *
   * Note this is the FETCHED count, deliberately, not the eligible one. The
   * geography and review filters run on our side, after the fact; treating a
   * filtered-out row as un-fetched would ask Yelp for it again forever.
   */
  async function loadMore() {
    setLoadingMore(true);
    setError("");
    const nextOffset = offset + fetchedSoFar;
    const fetched = await runSearch({ term: topic, nextOffset, append: true });
    if (fetched !== null) {
      setOffset(nextOffset);
      setFetchedSoFar(fetched);
    }
    setLoadingMore(false);
  }

  /**
   * Finds one business by name and adds it to the pool.
   *
   * For the case where an editor already knows the answer — a place with 458
   * reviews that happens to sit at Yelp's 40th result — and should not have to
   * page through to reach it.
   */
  async function findByName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nameQuery.trim()) return;

    setNameSearching(true);
    setError("");

    // `!== null` rather than truthy: a name that matches nothing returns 0, and
    // that is a completed search, not a failed one.
    const found = await runSearch({
      term: nameQuery.trim(),
      nextOffset: 0,
      append: true,
    });
    if (found !== null) {
      setSearched(true);
      setNameQuery("");
    }
    setNameSearching(false);
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length >= rankingSize
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
    const category = categories.find((c) => c.id === categoryId) ?? null;

    const title =
      titleOverride.trim() ||
      suggestRankingTitle({
        count: ordered.length,
        categorySlug: category?.slug ?? null,
        categoryName: category?.name ?? null,
        topic,
        areaLabel,
      });
    const slug =
      slugOverride.trim() ||
      suggestRankingSlug({
        categorySlug: category?.slug ?? null,
        topic,
        areaSlug: area,
      });

    try {
      const response = await fetch("/api/admin/rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
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
  /*
   * Three groups, not one list.
   *
   * Yelp's location search is a radius, not a boundary: asking for Long Island
   * returns New Haven and Sunnyside. Those are not Long Island in the sense
   * this publication means, so they are separated out rather than silently
   * mixed into the pool an editor is choosing from — and separated rather than
   * dropped, because seeing what was excluded is how you notice a filter that
   * is wrong.
   */
  const passesReviews = (candidate: YelpBusiness) =>
    candidate.reviewCount >= minReviews;

  const eligibleArea = (candidate: YelpBusiness) =>
    // A specific town is its own test; a region check falls back to the county
    // derivation, which is null for anywhere outside Nassau and Suffolk.
    area === "long-island" || SEARCH_AREAS.some((a) => a.value === area)
      ? isOnLongIsland(candidate.city, candidate.state)
      : true;

  const afterReviews = candidates.filter(passesReviews);
  const filteredOutByReviews = candidates.length - afterReviews.length;

  /*
   * The two ways a candidate can fail the area test, kept apart.
   *
   * "Outside" is a confident exclusion — a Connecticut address. "Unrecognised"
   * is our town list admitting it has never heard of somewhere in New York,
   * which is a different statement and needs a different answer from the
   * editor. Collapsing them is what hid every Fire Island business behind the
   * same wording as New Haven.
   */
  const rejected = afterReviews.filter((c) => !eligibleArea(c));
  const outsideArea = rejected.filter(
    (c) => classifyLocation(c.city, c.state) === "outside_ny",
  );
  const unrecognisedArea = rejected.filter(
    (c) => classifyLocation(c.city, c.state) === "unrecognised",
  );

  const eligible = afterReviews
    .filter(eligibleArea)
    .filter((candidate) => !excludedIds.includes(candidate.id));

  /*
   * Display order only. It reorders what the editor is looking at and never
   * touches the ranking, which is always their selection order.
   */
  const visible = [...eligible].sort((a, b) => {
    if (displaySort === "rating") {
      const byRating = (b.rating ?? 0) - (a.rating ?? 0);
      if (byRating !== 0) return byRating;
      return b.reviewCount - a.reviewCount;
    }
    if (displaySort === "reviews") return b.reviewCount - a.reviewCount;
    if (displaySort === "distance") {
      return (a.distance ?? Number.MAX_SAFE_INTEGER) - (b.distance ?? Number.MAX_SAFE_INTEGER);
    }
    return 0;
  });

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
              Final ranking size
            </label>
            <input
              id="count"
              type="number"
              min={1}
              max={50}
              step={1}
              value={rankingSize}
              onChange={(event) => setRankingSize(Number(event.target.value))}
              className={`mt-2 ${inputClass}`}
            />
            <p className="mt-1 text-xs text-ink-500">How many make the list.</p>
          </div>

          <div>
            <label htmlFor="batch" className="block text-sm font-semibold text-navy-900">
              Candidates per batch
            </label>
            <input
              id="batch"
              type="number"
              min={5}
              max={50}
              step={1}
              value={batchSize}
              onChange={(event) => setBatchSize(Number(event.target.value))}
              className={`mt-2 ${inputClass}`}
            />
            <p className="mt-1 text-xs text-ink-500">
              How many to research at a time. Load more below.
            </p>
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
              step={1}
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
                Selected {selectedIds.length} / {rankingSize}
              </p>
              {/*
                Says what happened to the batch, and accounts for ALL of it.
                "10 shown" after asking for 25 looks like the batch size was
                ignored; naming the filters shows it was not — but only if
                every filter is named. The unrecognised-town bucket was missing
                here, so a search could read "34 fetched · 26 eligible · 4
                outside" and leave four candidates unexplained on the one line
                an editor actually reads.
              */}
              <p className="text-xs text-ink-500">
                {candidates.length} fetched from Yelp · {visible.length} eligible
                {filteredOutByReviews > 0
                  ? ` · ${filteredOutByReviews} under ${minReviews} reviews`
                  : ""}
                {outsideArea.length > 0
                  ? ` · ${outsideArea.length} outside the area`
                  : ""}
                {unrecognisedArea.length > 0
                  ? ` · ${unrecognisedArea.length} in an unrecognised town`
                  : ""}
                {excludedIds.length > 0 ? ` · ${excludedIds.length} excluded` : ""}
                {total > 0 ? ` · ${total.toLocaleString()} matched on Yelp` : ""}
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-ink-500">
              Show by
              <select
                value={displaySort}
                onChange={(event) =>
                  setDisplaySort(
                    event.target.value as "yelp" | "rating" | "reviews" | "distance",
                  )
                }
                className="rounded-md border border-line px-2 py-1 text-xs"
              >
                <option value="yelp">Yelp order</option>
                <option value="rating">Rating, high to low</option>
                <option value="reviews">Review count, high to low</option>
                <option value="distance">Distance, near to far</option>
              </select>
            </label>

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
                    searchAreaLabel={searchAreaLabel}
                    topicHint={selectedCategory?.slug ?? (topic.trim() || null)}
                    onToggle={() => toggleSelected(candidate.id)}
                    onExclude={() => toggleExcluded(candidate.id)}
                  />
                );
              })}
            </div>
          )}

          {/*
            Title and slug, suggested and editable. The suggestion follows the
            category's own grammar — "Pizza Places", not "Pizza" — and the slug
            deliberately carries neither the count nor the word "best": the
            /best/ route says the second, and the first breaks the URL the day a
            top ten becomes a top twelve.
          */}
          {selectedIds.length > 0 ? (
            <div className="grid gap-4 border-t border-line px-5 py-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="ranking-title"
                  className="block text-xs font-semibold text-navy-900"
                >
                  Title
                </label>
                <input
                  id="ranking-title"
                  value={titleOverride}
                  onChange={(event) => setTitleOverride(event.target.value)}
                  placeholder={suggestedTitle}
                  className={`mt-1 ${inputClass}`}
                />
              </div>
              <div>
                <label
                  htmlFor="ranking-slug"
                  className="block text-xs font-semibold text-navy-900"
                >
                  Slug
                </label>
                <input
                  id="ranking-slug"
                  value={slugOverride}
                  onChange={(event) => setSlugOverride(event.target.value)}
                  placeholder={suggestedSlug}
                  className={`mt-1 ${inputClass} font-mono`}
                />
                <p className="mt-1 font-mono text-xs text-ink-400">
                  /best/{slugOverride.trim() || suggestedSlug}
                </p>
              </div>
            </div>
          ) : null}

          {outsideArea.length > 0 ? (
            <div className="border-t border-line px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-500">
                Outside Long Island ({outsideArea.length})
              </p>
              <p className="mt-1 text-xs text-ink-400">
                Yelp searches a radius, not a boundary, so a Long Island search
                reaches Connecticut. Shown so a wrong filter is visible.
              </p>
              <ul className="mt-2 space-y-1">
                {outsideArea.slice(0, 12).map((candidate) => (
                  <li key={candidate.id} className="text-xs text-ink-500">
                    <span className="font-semibold text-ink-700">{candidate.name}</span>
                    {" — "}
                    {[candidate.city, candidate.state].filter(Boolean).join(", ")}
                    <span className="ml-1.5 text-ink-400">not in New York</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/*
            The list admitting what it does not know.
            Separate from the section above because the answer is different: an
            unrecognised New York place might be a hamlet we have never listed,
            and the only way that gets found is if somebody sees it.
          */}
          {unrecognisedArea.length > 0 ? (
            <div className="border-t border-line bg-amber-50/60 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                New York, but we do not recognise the town ({unrecognisedArea.length})
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">
                These are in New York and did not match our Nassau or Suffolk
                town list — so they are either off the Island (a Queens or
                Westchester address) or somewhere our list is missing. If one of
                these belongs on Long Island, say so and it gets added.
              </p>
              <ul className="mt-2 space-y-1">
                {unrecognisedArea.slice(0, 12).map((candidate) => (
                  <li key={candidate.id} className="text-xs text-ink-500">
                    <span className="font-semibold text-ink-700">{candidate.name}</span>
                    {" — "}
                    <span className="font-semibold text-amber-800">
                      {[candidate.city, candidate.state].filter(Boolean).join(", ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/*
            Deeper research and direct lookup, together at the foot of the list.
            Both add to the pool rather than replacing it, so nothing selected
            or excluded so far is lost.
          */}
          <div className="border-t border-line px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore || candidates.length >= total}
                className="inline-flex items-center gap-2 rounded-full border border-navy-300 px-5 py-2 text-sm font-semibold text-navy-900 transition-colors hover:border-navy-500 hover:bg-navy-50 disabled:opacity-50"
              >
                {loadingMore ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : null}
                Load more candidates
              </button>
              <p className="text-xs text-ink-500">
                {candidates.length >= total
                  ? "Every match Yelp will return is loaded."
                  : `${(total - candidates.length).toLocaleString()} more matched on Yelp.`}
              </p>
            </div>

            <form onSubmit={findByName} className="mt-4 flex flex-wrap items-end gap-3">
              <div className="min-w-56 flex-1">
                <label
                  htmlFor="find-by-name"
                  className="block text-xs font-semibold text-navy-900"
                >
                  Find another business by name
                </label>
                <input
                  id="find-by-name"
                  type="search"
                  value={nameQuery}
                  onChange={(event) => setNameQuery(event.target.value)}
                  placeholder="O Sole Mio"
                  className={`mt-1 ${inputClass}`}
                />
              </div>
              <button
                type="submit"
                disabled={nameSearching || !nameQuery.trim()}
                className="inline-flex items-center gap-2 rounded-full border border-navy-300 px-5 py-2 text-sm font-semibold text-navy-900 hover:border-navy-500 hover:bg-navy-50 disabled:opacity-50"
              >
                {nameSearching ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <Search aria-hidden="true" className="size-4" />
                )}
                Add to candidates
              </button>
            </form>
            <p className="mt-1.5 text-xs text-ink-400">
              For a place you already know belongs on the list but that sits
              deep in Yelp&rsquo;s results. Matches are added to the pool above.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

