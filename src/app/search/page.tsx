import type { Metadata } from "next";
import Link from "next/link";

import { BusinessCard } from "@/components/cards/BusinessCard";
import { RankingCard } from "@/components/cards/RankingCard";
import { SearchBar } from "@/components/site/SearchBar";
import { RuleHeading } from "@/components/ui/RuleHeading";
import { searchAll } from "@/lib/data/queries";

export const metadata: Metadata = {
  title: "Search",
  description: "Search LongIsland.io rankings, businesses, categories and places.",
  alternates: { canonical: "/search" },
  // Result pages have no independent value in an index.
  robots: { index: false, follow: true },
};

type PageProps = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = await searchAll(query);

  const total =
    results.rankings.length +
    results.businesses.length +
    results.categories.length +
    results.places.length;

  return (
    <>
      <div className="border-b border-line bg-sand-50">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">
            {query ? `Results for “${query}”` : "Search LongIsland.io"}
          </h1>
          <div className="mt-5">
            <SearchBar variant="hero" defaultValue={query} autoFocus={!query} />
          </div>
          {query ? (
            <p className="mt-3 text-sm text-ink-500">
              {total} {total === 1 ? "result" : "results"}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        {!query ? (
          <p className="text-sm text-ink-700">
            Search for a category like pizza or roofers, a town like Huntington, or
            a business by name.
          </p>
        ) : total === 0 ? (
          <div className="rounded-card border border-line bg-sand-50 p-10 text-center">
            <h2 className="text-lg font-bold text-navy-900">
              Nothing matched “{query}”
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-700">
              Try a broader term, or nominate the business you were looking for and
              we will take a look.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href="/best"
                className="rounded-full border border-navy-300 px-5 py-2.5 text-sm font-semibold text-navy-900 hover:bg-white"
              >
                Browse all rankings
              </Link>
              <Link
                href="/nominate"
                className="rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
              >
                Nominate a business
              </Link>
            </div>
          </div>
        ) : (
          <>
            {results.rankings.length > 0 ? (
              <section aria-labelledby="search-rankings">
                <RuleHeading id="search-rankings" title="Rankings" uppercase />
                <div className="mt-7 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                  {results.rankings.map((ranking) => (
                    <RankingCard key={ranking.id} ranking={ranking} />
                  ))}
                </div>
              </section>
            ) : null}

            {results.businesses.length > 0 ? (
              <section aria-labelledby="search-businesses">
                <RuleHeading id="search-businesses" title="Businesses" uppercase />
                <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {results.businesses.map((business) => (
                    <BusinessCard key={business.id} business={business} />
                  ))}
                </div>
              </section>
            ) : null}

            {results.categories.length > 0 ? (
              <section aria-labelledby="search-categories">
                <RuleHeading id="search-categories" title="Categories" uppercase />
                <div className="mt-5 flex flex-wrap gap-2">
                  {results.categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/category/${category.slug}`}
                      className="rounded-full border border-navy-200 px-4 py-2 text-sm font-medium text-navy-900 transition-colors hover:border-brand-500 hover:text-brand-600"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {results.places.length > 0 ? (
              <section aria-labelledby="search-places">
                <RuleHeading id="search-places" title="Places" uppercase />
                <div className="mt-5 flex flex-wrap gap-2">
                  {results.places.map((place) => (
                    <Link
                      key={place.id}
                      href={`/place/${place.slug}`}
                      className="rounded-full border border-navy-200 px-4 py-2 text-sm font-medium text-navy-900 transition-colors hover:border-brand-500 hover:text-brand-600"
                    >
                      {place.name}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
