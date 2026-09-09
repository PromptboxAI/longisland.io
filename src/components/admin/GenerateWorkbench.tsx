"use client";

import { AlertCircle, Check, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { CandidateCard } from "@/components/admin/CandidateCard";
import {
  suggestRankingSlug,
  suggestRankingTitle,
} from "@/lib/rankings/naming";
import {
  SEARCH_AREAS,
  SEARCH_TOWNS,
  YELP_MAX_OFFSET,
  areaCounty,
  classifyLocation,
  inferCounty,
  isOnLongIsland,
  isRegionPreset,
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

/**
 * The review floors the adaptive ladder walks, strictest first.
 *
 * Each rung is a FULL sweep to Yelp's 240-record ceiling, and the results are
 * merged rather than replaced. That is the whole point: two sweeps of the same
 * query do not return the same 240 records, so a business found under a strict
 * floor can be absent from the next sweep entirely. Replacing the pool threw
 * those away — Vulcano 081, Salvatore's Coal Oven and That Pizza Place all
 * qualified at 150 and vanished at 75, not because they stopped qualifying but
 * because the later sample never contained them.
 */
const REVIEW_LADDER = [250, 150, 100, 75] as const;

/** One rung's outcome, kept so the run can account for itself on screen. */
interface LadderStage {
  floor: number;
  fetched: number;
  added: number;
  qualified: number;
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
  /*
   * The STARTING rung of the ladder, not a fixed filter. The run descends from
   * here through REVIEW_LADDER and stops as soon as the qualified pool is big
   * enough, so this is the strictest bar we try rather than the only one.
   */
  const [minReviews, setMinReviews] = useState(250);
  const [minRating, setMinRating] = useState(4.2);
  /** How many qualified candidates the ladder is trying to reach. */
  const [targetPool, setTargetPool] = useState(15);
  /** The rung the ladder actually finished on; what the pool is filtered by. */
  const [effectiveFloor, setEffectiveFloor] = useState(250);
  /** External id -> the strictest review floor that candidate was found under. */
  const [foundAt, setFoundAt] = useState<Record<string, number>>({});
  const [stages, setStages] = useState<LadderStage[]>([]);
  // Rating rather than best_match: for a local "best of" list, Yelp's adjusted
  // rating is the closest thing it offers to the question we are asking.
  const [sortBy, setSortBy] = useState<YelpSortBy>("rating");

  const [candidates, setCandidates] = useState<YelpBusiness[]>([]);
  // Insertion order is the ranking order, so this is an array, not a Set.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);

  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  /** Set once a ranking exists, so the button never invites a second POST. */
  const [created, setCreated] = useState<{ id: string; slug: string } | null>(null);
  /*
   * A ref, not the `creating` flag, because state updates are asynchronous: two
   * clicks in the same tick both read `creating === false` and both POST, which
   * is how one press of a button became two rankings and twenty businesses.
   */
  const inFlight = useRef(false);
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
   * One page from Yelp. Returns the rows plus the reported total, or null when
   * the request failed (the error is already on screen by then).
   */
  async function fetchPage(
    term: string,
    nextOffset: number,
    limit: number,
  ): Promise<{ rows: YelpBusiness[]; total: number } | null> {
    const { location } = resolveArea(area);

    try {
      const response = await fetch("/api/yelp/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: term || undefined,
          location,
          sortBy,
          limit,
          offset: nextOffset,
        }),
      });

      const body = (await response.json()) as SearchResponse | ErrorResponse;

      if (!response.ok) {
        setError(
          "error" in body ? body.error.message : "The search could not be run.",
        );
        return null;
      }

      const result = body as SearchResponse;
      return { rows: result.businesses, total: result.total };
    } catch {
      setError("Could not reach the server.");
      return null;
    }
  }

  /**
   * One request to Yelp, shared by Load More and the search-by-name box.
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
    const page = await fetchPage(
      term,
      nextOffset,
      Math.min(50, Math.max(batchSize, 1)),
    );
    if (page === null) {
      if (!append) setCandidates([]);
      return null;
    }

    setTotal(page.total);
    setCandidates((current) => {
      if (!append) return page.rows;
      const seen = new Set(current.map((c) => c.id));
      return [...current, ...page.rows.filter((c) => !seen.has(c.id))];
    });
    // Anything arriving outside the ladder is recorded at the floor the pool is
    // currently being judged by, so provenance never claims a stricter origin
    // than the candidate actually earned.
    setFoundAt((current) => {
      const next = { ...current };
      for (const row of page.rows) {
        if (next[row.id] === undefined) next[row.id] = effectiveFloor;
      }
      return next;
    });
    return page.rows.length;
  }

  /**
   * The adaptive ladder: descending review floors, one accumulating pool.
   *
   * Each rung sweeps to Yelp's ceiling and MERGES what it finds, deduplicated
   * by external id. Merging rather than replacing is the fix for the failure
   * this was written after: the review floor is applied here, on our side, so
   * every rung sends Yelp an identical query — and Yelp still answers with a
   * different 240 records each time. A pool that gets replaced therefore loses
   * strong candidates for no reason an editor could ever see.
   *
   * It stops at the first rung that reaches the target, so a category with
   * plenty of well-reviewed businesses never drops its standards to fill a list.
   */
  async function findCandidates(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setError("");
    // A fresh search is a fresh slate; Load More is what preserves choices.
    setSelectedIds([]);
    setExcludedIds([]);
    setCreated(null);

    const rungs = [
      minReviews,
      ...REVIEW_LADDER.filter((rung) => rung < minReviews),
    ];

    const pool: YelpBusiness[] = [];
    const seen = new Set<string>();
    const found: Record<string, number> = {};
    const log: LadderStage[] = [];

    let lastTotal = 0;
    let lastFloor = rungs[0];
    let lastOffset = 0;
    let failed = false;

    for (const floor of rungs) {
      lastFloor = floor;
      const before = pool.length;
      let fetched = 0;
      let offset = 0;

      while (offset < YELP_MAX_OFFSET) {
        const limit = Math.min(
          50,
          Math.max(batchSize, 1),
          YELP_MAX_OFFSET - offset,
        );
        const page = await fetchPage(topic, offset, limit);
        if (page === null) {
          failed = true;
          break;
        }

        lastTotal = page.total;
        fetched += page.rows.length;
        for (const row of page.rows) {
          if (seen.has(row.id)) continue;
          seen.add(row.id);
          pool.push(row);
          // First rung to see it wins, and rungs run strictest first, so this
          // records the strictest floor the candidate was found under.
          found[row.id] = floor;
        }

        // Advance by what came back, never by what was asked for: Yelp returns
        // short near the end of a set, and the gap would be records nobody sees.
        if (page.rows.length === 0) break;
        offset += page.rows.length;
        if (offset >= page.total) break;
      }

      lastOffset = offset;
      const qualified = pool.filter(
        (candidate) =>
          candidate.reviewCount >= floor &&
          (candidate.rating ?? 0) >= minRating &&
          eligibleArea(candidate),
      ).length;

      log.push({ floor, fetched, added: pool.length - before, qualified });
      if (failed || qualified >= targetPool) break;
    }

    setCandidates(pool);
    setFoundAt(found);
    setStages(log);
    setEffectiveFloor(lastFloor);
    setTotal(lastTotal);
    setOffset(lastOffset);
    setFetchedSoFar(0);
    setSearched(true);
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

  /**
   * Creates the ranking, then leaves for its editor and does not come back.
   *
   * Two failures are being fixed here, and they compound. The navigation was a
   * bare `router.push` issued from an async handler whose `finally` immediately
   * set state again; the re-render could land first and the transition was
   * simply lost, leaving an editor on a screen that looked like nothing had
   * happened — next to a re-enabled button. Pressing it again was the obvious
   * thing to do, and it created a second ranking and a second set of businesses.
   *
   * So: a ref guard that cannot be raced by two clicks in one tick, a success
   * state that never re-enables the button, and a banner carrying a real link
   * to the record. The push is still the navigation; the banner is what makes
   * the outcome legible if it is slow, and what stops a second press either way.
   */
  async function createRanking() {
    if (inFlight.current || created) return;
    inFlight.current = true;
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

      const body = (await response.json()) as {
        id?: string;
        slug?: string;
        error?: string;
      };

      if (!response.ok || !body.id) {
        setError(body.error ?? "Could not create the ranking.");
        inFlight.current = false;
        setCreating(false);
        return;
      }

      /*
       * Deliberately NOT clearing `creating` on the way out. The ranking exists
       * now; re-enabling the button while the browser is still navigating is
       * the exact window in which a second one gets made.
       */
      setCreated({ id: body.id, slug: body.slug ?? "" });
      router.push(`/admin/rankings/${body.id}`);
    } catch {
      setError("Could not reach the server.");
      inFlight.current = false;
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
    candidate.reviewCount >= effectiveFloor;

  const passesRating = (candidate: YelpBusiness) =>
    (candidate.rating ?? 0) >= minRating;

  /*
   * The county the selected area confines results to, if any.
   *
   * This is the fix for a Nassau list built from a Nassau-and-Suffolk pool.
   * Yelp searches a radius, so "Nassau County, NY" at 24km reaches Huntington
   * and Melville, and the old test asked only "is this on Long Island?" — which
   * Suffolk answers yes to. The selected geography is now authoritative.
   */
  const requiredCounty = areaCounty(area);

  const eligibleArea = (candidate: YelpBusiness) => {
    // Nassau or Suffolk chosen explicitly: that county, and nothing else.
    if (requiredCounty) {
      return inferCounty(candidate.city, candidate.state) === requiredCounty;
    }
    // Long Island and the sub-regions are radii with no county to check, so
    // they keep the island-wide test.
    if (isRegionPreset(area)) {
      return isOnLongIsland(candidate.city, candidate.state);
    }
    // A town is its own test, handled per-card as exact/nearby.
    return true;
  };

  const afterReviews = candidates.filter(passesReviews);
  const filteredOutByReviews = candidates.length - afterReviews.length;

  const afterRating = afterReviews.filter(passesRating);
  const filteredOutByRating = afterReviews.length - afterRating.length;

  /*
   * The three ways a candidate can fail the area test, kept apart.
   *
   * "Outside" is a confident exclusion — a Connecticut address. "Unrecognised"
   * is our town list admitting it has never heard of somewhere in New York,
   * which is a different statement and needs a different answer from the
   * editor. Collapsing them is what hid every Fire Island business behind the
   * same wording as New Haven.
   *
   * "Wrong county" is the third, added with the county rule: a real Long
   * Island business in the county you did not ask for. It has to be its own
   * bucket, because it is neither an error nor a gap — and because a filtered
   * candidate that appears in no bucket at all is one the summary line cannot
   * account for, which is exactly the silent drop this screen exists to avoid.
   */
  const rejected = afterRating.filter((c) => !eligibleArea(c));
  const outsideArea = rejected.filter(
    (c) => classifyLocation(c.city, c.state) === "outside_ny",
  );
  const unrecognisedArea = rejected.filter(
    (c) => classifyLocation(c.city, c.state) === "unrecognised",
  );
  const wrongCounty = rejected.filter(
    (c) =>
      classifyLocation(c.city, c.state) === "long_island" &&
      inferCounty(c.city, c.state) !== requiredCounty,
  );

  const eligible = afterRating
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
              Starting review floor
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
            <p className="mt-1 text-xs text-ink-500">
              Strictest rung. Drops through {REVIEW_LADDER.join(" → ")} until the
              target is met, keeping everything found on the way.
            </p>
          </div>

          <div>
            <label
              htmlFor="min-rating"
              className="block text-sm font-semibold text-navy-900"
            >
              Minimum rating
            </label>
            <input
              id="min-rating"
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={minRating}
              onChange={(event) => setMinRating(Number(event.target.value))}
              className={`mt-2 ${inputClass}`}
            />
            <p className="mt-1 text-xs text-ink-500">
              Held constant across the ladder. Only the review floor moves.
            </p>
          </div>

          <div>
            <label
              htmlFor="target-pool"
              className="block text-sm font-semibold text-navy-900"
            >
              Target qualified pool
            </label>
            <input
              id="target-pool"
              type="number"
              min={1}
              step={1}
              value={targetPool}
              onChange={(event) => setTargetPool(Number(event.target.value))}
              className={`mt-2 ${inputClass}`}
            />
            <p className="mt-1 text-xs text-ink-500">
              The ladder stops at the first rung that reaches this.
            </p>
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

      {/*
        The ranking exists whether or not the browser has moved yet. Saying so,
        with a link, means a slow or blocked navigation leaves an editor
        informed rather than guessing — and pointed at the record that was
        already created, instead of making another one.
      */}
      {created ? (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-card border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            <strong className="font-bold">Ranking created.</strong> Opening the
            editor now — if nothing happens,{" "}
            <a
              href={`/admin/rankings/${created.id}`}
              className="font-semibold underline"
            >
              open it here
            </a>
            . Do not press Create again; it already exists.
          </p>
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
                {candidates.length} unique fetched · {visible.length} qualified
                {filteredOutByReviews > 0
                  ? ` · ${filteredOutByReviews} under ${effectiveFloor} reviews`
                  : ""}
                {filteredOutByRating > 0
                  ? ` · ${filteredOutByRating} under ${minRating}`
                  : ""}
                {wrongCounty.length > 0
                  ? ` · ${wrongCounty.length} wrong county`
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
              {/*
                The ladder accounting for itself. Without this an editor cannot
                tell a pool that stopped at 250 because it was rich enough from
                one that fell to 75 because it was not, and those are very
                different lists.
              */}
              {stages.length > 0 ? (
                <p className="mt-0.5 text-xs text-ink-400">
                  Ladder:{" "}
                  {stages
                    .map(
                      (stage) =>
                        `${stage.floor} (+${stage.added} new, ${stage.qualified} qualified)`,
                    )
                    .join(" → ")}
                  {" · rating floor "}
                  {minRating}
                </p>
              ) : null}
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
              disabled={selectedIds.length === 0 || creating || created !== null}
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {created ? (
                <>
                  <Check aria-hidden="true" className="size-4" />
                  Created — opening
                </>
              ) : creating ? (
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
                    foundAtFloor={foundAt[candidate.id] ?? null}
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

          {/*
            On Long Island, in the wrong county. Listed rather than dropped for
            the same reason as everything else on this screen: a candidate that
            disappears without being counted is indistinguishable from one the
            search never found.
          */}
          {wrongCounty.length > 0 ? (
            <div className="border-t border-line bg-sand-50 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-500">
                Long Island, but not {requiredCounty} ({wrongCounty.length})
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">
                Yelp searches a radius, not a county line, so a {requiredCounty}{" "}
                search reaches over the border. These are excluded from the pool
                because you asked for {requiredCounty}.
              </p>
              <ul className="mt-2 space-y-1">
                {wrongCounty.slice(0, 12).map((candidate) => (
                  <li key={candidate.id} className="text-xs text-ink-500">
                    <span className="font-semibold text-ink-700">
                      {candidate.name}
                    </span>
                    {" — "}
                    {candidate.city}
                    <span className="ml-1.5 text-ink-400">
                      {inferCounty(candidate.city, candidate.state)}
                    </span>
                  </li>
                ))}
              </ul>
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
                disabled={
                  loadingMore ||
                  candidates.length >= total ||
                  offset + fetchedSoFar >= YELP_MAX_OFFSET
                }
                className="inline-flex items-center gap-2 rounded-full border border-navy-300 px-5 py-2 text-sm font-semibold text-navy-900 transition-colors hover:border-navy-500 hover:bg-navy-50 disabled:opacity-50"
              >
                {loadingMore ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : null}
                Load more candidates
              </button>
              <p className="text-xs text-ink-500">
                {offset + fetchedSoFar >= YELP_MAX_OFFSET
                  ? `Yelp returns at most ${YELP_MAX_OFFSET} records per search, and the ladder has read them all.`
                  : candidates.length >= total
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

