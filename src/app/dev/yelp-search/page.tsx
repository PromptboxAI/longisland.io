"use client";

import { useState } from "react";

import { YELP_SORT_OPTIONS, type YelpSortBy } from "@/lib/yelp/schema";
import type { YelpBusiness } from "@/lib/yelp/types";

/**
 * Throwaway harness for `POST /api/yelp/search`.
 *
 * This exists only so the Yelp integration can be exercised in a browser while
 * /admin is still being built. It is intentionally unstyled beyond the bare
 * minimum and lives under /dev so it does not collide with the public site or
 * the admin design work — delete it once /admin/generate calls the route.
 *
 * `src/middleware.ts` does not gate /dev, but the route itself refuses to run
 * in production without an authenticated session, so this page cannot be used
 * to spend Yelp quota from a deployed environment.
 */

interface SearchResponse {
  businesses: YelpBusiness[];
  count: number;
  total: number;
}

interface ErrorResponse {
  error: { code: string; message: string; details?: unknown };
}

export default function YelpSearchTestPage() {
  const [term, setTerm] = useState("pizza");
  const [location, setLocation] = useState("Huntington, NY");
  const [categories, setCategories] = useState("");
  const [sortBy, setSortBy] = useState<YelpSortBy>("review_count");
  const [limit, setLimit] = useState(20);

  const [result, setResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function runSearch(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/yelp/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Omit the optional fields entirely when blank; the schema rejects
          // empty strings rather than treating them as "no filter".
          ...(term.trim() ? { term: term.trim() } : {}),
          location: location.trim(),
          ...(categories.trim() ? { categories: categories.trim() } : {}),
          sortBy,
          limit,
        }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        const { error: err } = payload as ErrorResponse;
        setError(
          `${response.status} ${err?.code ?? "error"} — ${err?.message ?? "Request failed."}` +
            (err?.details ? `\n${JSON.stringify(err.details, null, 2)}` : ""),
        );
        return;
      }

      setResult(payload as SearchResponse);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-8 font-mono text-sm">
      <h1 className="mb-1 text-lg font-bold">Yelp search — dev harness</h1>
      <p className="mb-6 text-neutral-500">
        POST /api/yelp/search. Not part of the public site.
      </p>

      <form onSubmit={runSearch} className="mb-8 grid gap-3">
        <label className="grid gap-1">
          <span>term (optional)</span>
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="border p-2"
          />
        </label>

        <label className="grid gap-1">
          <span>location (required)</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            className="border p-2"
          />
        </label>

        <label className="grid gap-1">
          <span>categories (optional, comma-separated aliases)</span>
          <input
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
            placeholder="pizza,italian"
            className="border p-2"
          />
        </label>

        <label className="grid gap-1">
          <span>sortBy</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as YelpSortBy)}
            className="border p-2"
          >
            {YELP_SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span>limit (1–50)</span>
          <input
            type="number"
            min={1}
            max={50}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="border p-2"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="border bg-black p-2 text-white disabled:opacity-50"
        >
          {pending ? "Searching…" : "Search"}
        </button>
      </form>

      {error ? (
        <pre className="mb-6 border border-red-400 bg-red-50 p-3 whitespace-pre-wrap text-red-700">
          {error}
        </pre>
      ) : null}

      {result ? (
        <section>
          <p className="mb-3">
            {result.count} returned of {result.total} matches
            {result.count === 0 ? " — no results" : ""}
          </p>
          <ol className="grid gap-4">
            {result.businesses.map((business, index) => (
              <li key={business.id} className="border p-3">
                <p className="font-bold">
                  {index + 1}. {business.name}
                </p>
                <p>
                  {business.rating ?? "—"} stars · {business.reviewCount} reviews
                  {business.distance === null
                    ? ""
                    : ` · ${Math.round(business.distance)}m`}
                </p>
                <p className="text-neutral-600">
                  {[business.address, business.city, business.state, business.zip]
                    .filter(Boolean)
                    .join(", ") || "no address"}
                </p>
                <p className="text-neutral-600">
                  {business.categories.join(", ") || "no categories"}
                </p>
                <p className="text-neutral-600">
                  {business.displayPhone ?? "no phone"}
                </p>
                <a
                  href={business.yelpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Yelp page
                </a>
              </li>
            ))}
          </ol>

          <details className="mt-6">
            <summary className="cursor-pointer">Raw JSON</summary>
            <pre className="mt-2 overflow-x-auto border p-3">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </section>
      ) : null}
    </main>
  );
}
