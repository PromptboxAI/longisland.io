import type { Metadata } from "next";
import Link from "next/link";

import { RankingCard } from "@/components/cards/RankingCard";
import { NominationCTA } from "@/components/cta/NominationCTA";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { RuleHeading } from "@/components/ui/RuleHeading";
import {
  listCategories,
  listPlaces,
  listRankings,
  type RankingSort,
} from "@/lib/data/queries";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Best of Long Island — All Rankings",
  description:
    "Every LongIsland.io ranking: restaurants, things to do, home services, family, health and shopping, by category and by town.",
  alternates: { canonical: "/best" },
};

const SORTS: { value: RankingSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most complete" },
  { value: "alphabetical", label: "A–Z" },
];

/** Top-level groupings for the index, mirroring the category tree. */
const GROUPS = [
  { slug: "eat-drink", title: "Food & Drink" },
  { slug: "things-to-do", title: "Things to Do" },
  { slug: "home-services", title: "Home & Services" },
  { slug: "family", title: "Family" },
  { slug: "health-beauty", title: "Health & Beauty" },
  { slug: "shopping", title: "Shopping" },
] as const;

type PageProps = {
  searchParams: Promise<{ category?: string; place?: string; sort?: string; q?: string }>;
};

export default async function BestIndexPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sort: RankingSort =
    params.sort === "popular" || params.sort === "alphabetical"
      ? params.sort
      : "newest";

  const [rankings, categories, places] = await Promise.all([
    listRankings({
      categorySlug: params.category,
      placeSlug: params.place,
      query: params.q,
      sort,
    }),
    listCategories(),
    listPlaces(),
  ]);

  const isFiltered = Boolean(params.category || params.place || params.q);
  const topLevel = categories.filter((c) => !c.parent_id);
  const regions = places.filter(
    (p) => p.type === "county" || p.type === "region",
  );

  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Best Of", href: "/best" },
  ];

  /** Preserves other filters when one control changes. */
  function hrefWith(patch: Record<string, string | undefined>): string {
    const next = new URLSearchParams();
    const merged = { ...params, ...patch };
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value);
    }
    const query = next.toString();
    return query ? `/best?${query}` : "/best";
  }

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(crumbs))} />

      <div className="border-b border-line bg-sand-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-3 text-3xl font-extrabold uppercase tracking-tight text-navy-900 sm:text-4xl">
            Best of Long Island
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-700">
            Every ranking we publish, independently researched and editorially
            ordered. Filter by category or by the part of the island you actually
            go to.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6 lg:px-8">
          <FilterRow label="Category">
            <FilterChip href={hrefWith({ category: undefined })} active={!params.category}>
              All
            </FilterChip>
            {topLevel.map((category) => (
              <FilterChip
                key={category.id}
                href={hrefWith({ category: category.slug })}
                active={params.category === category.slug}
              >
                {category.name}
              </FilterChip>
            ))}
          </FilterRow>

          <FilterRow label="Location">
            <FilterChip href={hrefWith({ place: undefined })} active={!params.place}>
              All
            </FilterChip>
            {regions.map((place) => (
              <FilterChip
                key={place.id}
                href={hrefWith({ place: place.slug })}
                active={params.place === place.slug}
              >
                {place.name}
              </FilterChip>
            ))}
          </FilterRow>

          <FilterRow label="Sort">
            {SORTS.map((option) => (
              <FilterChip
                key={option.value}
                href={hrefWith({ sort: option.value })}
                active={sort === option.value}
              >
                {option.label}
              </FilterChip>
            ))}
          </FilterRow>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {rankings.length === 0 ? (
          <div className="rounded-card border border-line bg-sand-50 p-10 text-center">
            <h2 className="text-lg font-bold text-navy-900">No rankings match that</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-700">
              Try removing a filter, or nominate a business you think belongs on a
              list.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href="/best"
                className="rounded-full border border-navy-300 px-5 py-2.5 text-sm font-semibold text-navy-900 hover:bg-white"
              >
                Clear filters
              </Link>
              <Link
                href="/nominate"
                className="rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
              >
                Nominate a business
              </Link>
            </div>
          </div>
        ) : isFiltered ? (
          <>
            <p className="mb-6 text-sm text-ink-500">
              {rankings.length} {rankings.length === 1 ? "ranking" : "rankings"}
            </p>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {rankings.map((ranking) => (
                <RankingCard key={ranking.id} ranking={ranking} />
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-12">
            <section aria-labelledby="trending-index">
              <RuleHeading id="trending-index" title="Trending" uppercase />
              <div className="mt-7 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {rankings.slice(0, 4).map((ranking) => (
                  <RankingCard key={ranking.id} ranking={ranking} />
                ))}
              </div>
            </section>

            {GROUPS.map((group) => {
              const parent = categories.find((c) => c.slug === group.slug);
              if (!parent) return null;

              const childSlugs = new Set(
                categories.filter((c) => c.parent_id === parent.id).map((c) => c.slug),
              );
              childSlugs.add(parent.slug);

              const groupRankings = rankings.filter(
                (r) => r.category && childSlugs.has(r.category.slug),
              );
              if (groupRankings.length === 0) return null;

              return (
                <section key={group.slug} aria-labelledby={`group-${group.slug}`}>
                  <RuleHeading
                    id={`group-${group.slug}`}
                    title={group.title}
                    href={`/category/${parent.slug}`}
                    linkLabel={`Browse ${group.title}`}
                    uppercase
                  />
                  <div className="mt-7 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    {groupRankings.map((ranking) => (
                      <RankingCard key={ranking.id} ranking={ranking} />
                    ))}
                  </div>
                </section>
              );
            })}

            <section aria-labelledby="by-location">
              <RuleHeading
                id="by-location"
                title="By Location"
                description="Rankings scoped to a county, region or town."
                href="/places"
                linkLabel="All places"
                uppercase
              />
              <div className="mt-5 flex flex-wrap gap-2">
                {regions.map((place) => (
                  <Link
                    key={place.id}
                    href={hrefWith({ place: place.slug })}
                    className="rounded-full border border-navy-200 px-4 py-2 text-sm font-medium text-navy-900 transition-colors hover:border-brand-500 hover:text-brand-600"
                  >
                    {place.name}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      <NominationCTA />
    </>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] font-bold uppercase tracking-wider text-ink-400">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-navy-900 bg-navy-900 text-white"
          : "border-navy-200 text-navy-900 hover:border-brand-500 hover:text-brand-600"
      }`}
    >
      {children}
    </Link>
  );
}
