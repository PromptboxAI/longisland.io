"use client";

import { Loader2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { searchTargetsAction } from "@/app/admin/editorial/actions";
import type { TargetKind, TargetResult, TargetSort } from "@/lib/data/target-search";

/**
 * Finding one piece of content among thousands.
 *
 * The picker this replaces loaded every ranking, article, business, category,
 * place, guide and product into the browser and filtered them with a substring
 * match. At forty records that is fine. At four thousand the page carries the
 * whole catalogue before an editor has typed anything, and the list is too long
 * to read even once it matches.
 *
 * Four things make this scale, and only one of them is the server-side query:
 *
 * It asks a narrower question. A placement declares what it accepts, so Top
 * Picks searches products and buying guides and does not touch the rankings
 * table. Half of "too many results" is asking for things that could never have
 * been the answer.
 *
 * It shows enough to choose. Three products can share a name and differ only by
 * brand; two rankings can share a title and differ by town. Every row carries
 * the thumbnail, type, status and the one contextual field that tells them
 * apart, because a list you cannot choose from is not shorter for being right.
 *
 * It opens on recent work. Sorted by what was last touched, because the thing
 * being looked for is usually the thing just finished.
 *
 * It offers the way out. If the product does not exist yet, the answer is not a
 * better search — it is a link to create one that comes back here afterwards.
 */

const SORTS: { value: TargetSort; label: string }[] = [
  { value: "updated", label: "Recently updated" },
  { value: "published", label: "Recently published" },
  { value: "alpha", label: "A–Z" },
];

/**
 * Where an editor goes to make the thing that does not exist yet.
 *
 * These are the LIST pages, not a `/new` route — there isn't one. A record is
 * created by a POST to a server action, so the list page, which carries that
 * button, is the honest destination. It receives `returnTo` and hands it to
 * the action, which threads it to the new record's editor.
 */
const CREATE_ROUTES: Partial<Record<TargetKind, { href: string; label: string }>> = {
  product: { href: "/admin/products", label: "Create product" },
  product_ranking: { href: "/admin/product-rankings", label: "Create buying guide" },
  article: { href: "/admin/articles", label: "Create article" },
  ranking: { href: "/admin/generate", label: "Create ranking" },
};

const TYPE_LABELS: Record<TargetKind, string> = {
  ranking: "Rankings",
  article: "Articles",
  product_ranking: "Buying guides",
  product: "Products",
  business: "Businesses",
  category: "Categories",
  place: "Places",
};

export function TargetPicker({
  accepts,
  selectedId,
  onSelect,
  /** Where to come back to after creating something. */
  returnTo,
}: {
  accepts: TargetKind[];
  selectedId: string | null;
  onSelect: (result: TargetResult | null) => void;
  returnTo?: string;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<TargetKind | "all">("all");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [sort, setSort] = useState<TargetSort>("updated");

  const [results, setResults] = useState<TargetResult[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const kinds = kind === "all" ? accepts : [kind];
  const kindsKey = kinds.join(",");

  /*
   * One effect, keyed on every input that changes the question.
   *
   * The debounce is on the effect rather than on the input handler so typing
   * stays instant and only the request waits. `cancelled` is what stops a slow
   * early response overwriting a fast later one — the classic way a search box
   * ends up showing results for a query the user has already moved past.
   */
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      // Inside the timeout rather than the effect body: the spinner belongs to
      // the request, and setting state synchronously in an effect costs an
      // extra render pass before paint for no visible gain.
      if (!cancelled) setLoading(true);

      const page = await searchTargetsAction({
        kinds: kindsKey ? (kindsKey.split(",") as TargetKind[]) : [],
        query,
        status,
        sort,
        offset: 0,
      });
      if (cancelled) return;
      setResults(page.results);
      setHasMore(page.hasMore);
      setOffset(0);
      setLoading(false);
    }, query ? 250 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, kindsKey, status, sort]);

  async function loadMore() {
    setLoadingMore(true);
    const next = offset + 20;
    const page = await searchTargetsAction({
      kinds: kindsKey.split(",") as TargetKind[],
      query,
      status,
      sort,
      offset: next,
    });
    setResults((current) => [...current, ...page.results]);
    setHasMore(page.hasMore);
    setOffset(next);
    setLoadingMore(false);
  }

  const createLinks = accepts
    .map((k) => ({ kind: k, route: CREATE_ROUTES[k] }))
    .filter((entry) => entry.route !== undefined);

  const control =
    "rounded-md border border-line bg-white px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${accepts.map((k) => TYPE_LABELS[k].toLowerCase()).join(", ")}…`}
          aria-label="Search for a target"
          className="w-full rounded-md border border-line py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {/* Only offered when the placement takes more than one thing. */}
        {accepts.length > 1 ? (
          <select
            aria-label="Content type"
            value={kind}
            onChange={(event) => setKind(event.target.value as TargetKind | "all")}
            className={control}
          >
            <option value="all">All types</option>
            {accepts.map((k) => (
              <option key={k} value={k}>
                {TYPE_LABELS[k]}
              </option>
            ))}
          </select>
        ) : null}

        <select
          aria-label="Publication status"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as "all" | "published" | "draft")
          }
          className={control}
        >
          <option value="all">Any status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        <select
          aria-label="Sort order"
          value={sort}
          onChange={(event) => setSort(event.target.value as TargetSort)}
          className={control}
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {loading ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin text-ink-400" />
        ) : (
          <span className="text-xs text-ink-400" aria-live="polite">
            {results.length}
            {hasMore ? "+" : ""} result{results.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="mt-2 max-h-80 overflow-y-auto rounded-md border border-line">
        {loading && results.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-ink-500">Searching…</p>
        ) : results.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-ink-500">
              {query ? `Nothing matching “${query}”.` : "Nothing here yet."}
            </p>
            {createLinks.length > 0 ? (
              <p className="mt-1 text-xs text-ink-400">
                If it does not exist yet, create it below.
              </p>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {results.map((result) => {
              const chosen = result.id === selectedId;
              return (
                <li key={`${result.kind}-${result.id}`}>
                  <button
                    type="button"
                    aria-pressed={chosen}
                    onClick={() => onSelect(chosen ? null : result)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      chosen ? "bg-brand-50" : "hover:bg-sand-50"
                    }`}
                  >
                    {result.imageUrl ? (
                      <span className="size-11 shrink-0 overflow-hidden rounded border border-line bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={result.imageUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      </span>
                    ) : (
                      <span className="grid size-11 shrink-0 place-items-center rounded border border-dashed border-line text-[9px] font-semibold uppercase text-ink-400">
                        No image
                      </span>
                    )}

                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm ${
                          chosen ? "font-bold text-brand-600" : "font-semibold text-navy-900"
                        }`}
                      >
                        {result.title || "Untitled"}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {result.typeLabel}
                        {" · "}
                        <span
                          className={
                            result.status === "published"
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }
                        >
                          {result.status === "published" ? "Published" : "Draft"}
                        </span>
                      </span>
                      {result.categoryName || result.context ? (
                        <span className="block truncate text-xs text-ink-400">
                          {[result.categoryName, result.context]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {hasMore ? (
          <button
            type="button"
            disabled={loadingMore}
            onClick={loadMore}
            className="inline-flex items-center gap-1.5 rounded-full border border-navy-300 px-3.5 py-1.5 text-xs font-semibold text-navy-900 hover:bg-navy-50 disabled:opacity-60"
          >
            {loadingMore ? (
              <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            ) : null}
            Load more
          </button>
        ) : null}

        {/*
          The way out of a search that cannot succeed. The link goes to the
          real creation flow rather than a second copy of the form living here,
          and carries a return path so the editor lands back on this placement
          with the new item ready to pick.
        */}
        {createLinks.map(({ kind: k, route }) => (
          <Link
            key={k}
            href={
              returnTo
                ? `${route!.href}?returnTo=${encodeURIComponent(returnTo)}`
                : route!.href
            }
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-navy-300 px-3.5 py-1.5 text-xs font-semibold text-navy-900 hover:border-navy-500 hover:bg-navy-50"
          >
            <Plus aria-hidden="true" className="size-3.5" />
            {route!.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
