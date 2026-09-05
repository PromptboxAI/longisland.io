import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { BusinessCard } from "@/components/cards/BusinessCard";
import { PlaceCard } from "@/components/cards/PlaceCard";
import { RankingCard } from "@/components/cards/RankingCard";
import { AdvertiseCTA } from "@/components/cta/AdvertiseCTA";
import { NewsletterSignup } from "@/components/cta/NewsletterSignup";
import { NominationCTA } from "@/components/cta/NominationCTA";
import { SearchBar } from "@/components/site/SearchBar";
import { EmptyRail } from "@/components/ui/EmptyRail";
import { RuleHeading } from "@/components/ui/RuleHeading";
import { EditorialImage } from "@/components/ui/EditorialImage";
import {
  listBadgedBusinesses,
  listCategories,
  listPlaces,
  listRankings,
} from "@/lib/data/queries";
import type { Category } from "@/types/database";

export const revalidate = 3600;

const SEARCH_EXAMPLES = [
  "Pizza",
  "Bagels",
  "Date Night",
  "Roofers",
  "Beaches",
  "Huntington",
  "North Fork",
];

const REGION_SLUGS = [
  "nassau-county",
  "suffolk-county",
  "north-shore",
  "south-shore",
  "north-fork",
  "hamptons",
  "fire-island",
  "east-end",
];

/** Discovery blocks, in page order. Children come from the category tree. */
const CATEGORY_SECTIONS = [
  { parent: "eat-drink", title: "Eat & Drink" },
  { parent: "things-to-do", title: "Things to Do" },
  { parent: "home-services", title: "Home & Services" },
  { parent: "family", title: "Family" },
  { parent: "health-beauty", title: "Health & Beauty" },
  { parent: "shopping", title: "Shopping" },
] as const;

export default async function HomePage() {
  const [rankings, categories, places, hiddenGems] = await Promise.all([
    listRankings({}),
    listCategories(),
    listPlaces(),
    listBadgedBusinesses("Hidden Gem", 4),
  ]);

  const byParent = new Map<string, Category[]>();
  for (const category of categories) {
    if (!category.parent_id) continue;
    const list = byParent.get(category.parent_id) ?? [];
    list.push(category);
    byParent.set(category.parent_id, list);
  }

  const [lead, ...rest] = rankings;
  const latest = rest.slice(0, 4);
  const topPicks = rankings.slice(0, 5);
  const trending = rankings.slice(0, 3);

  const regions = REGION_SLUGS.map((slug) =>
    places.find((place) => place.slug === slug),
  ).filter((place) => place !== undefined);

  const towns = places.filter((place) => place.type === "town");

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="border-b border-line bg-sand-50">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16 lg:px-8">
          <h1 className="text-3xl font-extrabold leading-tight text-navy-900 sm:text-[42px]">
            Discover the best of Long Island.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-700">
            Rankings, reviews, local finds and hidden gems across Nassau, Suffolk
            and beyond.
          </p>

          <div className="mx-auto mt-7 max-w-xl">
            <SearchBar variant="hero" />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-ink-500">Popular:</span>
            {SEARCH_EXAMPLES.map((example) => (
              <Link
                key={example}
                href={`/search?q=${encodeURIComponent(example)}`}
                className="rounded-full border border-navy-200 bg-white px-3 py-1 font-medium text-navy-900 transition-colors hover:border-brand-500 hover:text-brand-600"
              >
                {example}
              </Link>
            ))}
          </div>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/best"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-navy-900 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
            >
              Explore Rankings
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link
              href="/nominate"
              className="inline-flex items-center justify-center rounded-full border border-navy-300 bg-white px-7 py-3 text-sm font-semibold text-navy-900 transition-colors hover:border-navy-500"
            >
              Nominate a Business
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------- Magazine row: rails + lead story */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/*
          The three-column magazine row always renders, so the page keeps its
          shape before any ranking is published: The Latest on the left, the
          feature in the centre, Top Rankings on the right. All three are fed by
          the same table, so they fill together the moment a list ships.

          Columns engage at `md` (768px) rather than `lg` — at the old
          breakpoint a 1000px window still stacked, dropping Top Rankings
          underneath The Latest instead of beside the feature.
        */}
        <div className="grid gap-6 md:grid-cols-[minmax(0,170px)_minmax(0,1fr)_minmax(0,190px)] lg:gap-8 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)_minmax(0,260px)]">
          <aside aria-labelledby="the-latest" className="order-2 md:order-1">
            <RuleHeading id="the-latest" title="The Latest" size="sm" />
            <div className="mt-4 space-y-4">
              {latest.length > 0 ? (
                latest.map((ranking) => (
                  <RankingCard key={ranking.id} ranking={ranking} variant="text" />
                ))
              ) : (
                <p className="text-sm leading-relaxed text-ink-500">
                  New rankings and guides will appear here as they publish.
                </p>
              )}
            </div>
          </aside>

          <div className="order-1 md:order-2">
            {lead ? (
              <RankingCard ranking={lead} variant="feature" priority />
            ) : (
              /*
               * The lead slot is the page's main visual push, so it keeps a
               * full-bleed image even before the first ranking exists. Swaps
               * for the real feature card the moment one publishes.
               */
              <article className="relative overflow-hidden rounded-card border border-line">
                <div className="relative aspect-[16/9]">
                  <EditorialImage
                    src={null}
                    alt=""
                    seed="longisland-feature"
                    priority
                    sizes="(max-width: 768px) 100vw, 60vw"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/55 to-navy-950/20" />
                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                    <p className="eyebrow text-gold-400">Coming soon</p>
                    <h2 className="mt-2 text-2xl leading-tight text-white sm:text-3xl">
                      The first rankings are being researched
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-navy-100">
                      We publish a list once we have done the work — visited the
                      places, compared them against a consistent standard, and
                      written down why each one earned its position.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href="/nominate"
                        className="rounded-full bg-gold-400 px-6 py-2.5 text-sm font-semibold text-navy-950 transition-colors hover:bg-gold-300"
                      >
                        Nominate a business
                      </Link>
                      <Link
                        href="/categories"
                        className="rounded-full border border-white/40 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                      >
                        Browse categories
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            )}
          </div>

          <aside aria-labelledby="top-rankings" className="order-3">
            <RuleHeading id="top-rankings" title="Top Rankings" size="sm" />
            <div className="mt-4">
              {rankings.length > 0 ? (
                rankings
                  .slice(0, 5)
                  .map((ranking) => (
                    <RankingCard key={ranking.id} ranking={ranking} variant="compact" />
                  ))
              ) : (
                <p className="text-sm leading-relaxed text-ink-500">
                  Our most-read lists will be collected here.
                </p>
              )}
              <Link
                href="/best"
                className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline"
              >
                View all rankings &rsaquo;
              </Link>
            </div>
          </aside>
        </div>
      </div>

      {/* ---------------------------------------------------------- Top picks */}
      <section aria-labelledby="top-picks" className="border-y border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <RuleHeading
            id="top-picks"
            title="Our Top Picks"
            description="The lists our editors send people to first, updated as places change."
          />
          {topPicks.length > 0 ? (
            <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {topPicks.map((ranking) => (
                <RankingCard key={ranking.id} ranking={ranking} />
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm leading-relaxed text-ink-500">
              Our editors&rsquo; first picks will be collected here once the
              opening rankings publish.
            </p>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------- Search band */}
      <section className="bg-navy-900">
        <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Know before you go. Every time.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-navy-200">
            Search hundreds of Long Island businesses, rankings, towns and
            categories.
          </p>
          <div className="mx-auto mt-6 max-w-lg">
            <SearchBar variant="hero" placeholder="Search rankings, places, businesses" />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- Trending */}
      <section
        aria-labelledby="trending"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      >
        <RuleHeading
          id="trending"
          title="What's Trending Now"
          description="The rankings Long Islanders are reading this week."
        />
        {trending.length > 0 ? (
          <div className="mt-7 grid gap-8 md:grid-cols-3">
            {trending.map((ranking) => (
              <RankingCard key={ranking.id} ranking={ranking} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm leading-relaxed text-ink-500">
            Nothing is trending yet — this fills in from real readership once
            rankings are live.
          </p>
        )}
      </section>

      {/* ------------------------------------------------------- Newsletter */}
      <section className="bg-navy-950">
        <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white">
            Get the best of Long Island every week
          </h2>
          <p className="mt-2 text-sm text-navy-300">
            One email every Thursday. New rankings, seasonal guides and the places
            we found that week.
          </p>
          <div className="mx-auto mt-6 max-w-md text-left">
            <NewsletterSignup variant="footer" source="homepage" />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Category discovery */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm text-ink-500">Browse our most popular categories</p>

        <div className="mt-6 divide-y divide-line">
          {CATEGORY_SECTIONS.map((section) => {
            const parent = categories.find((c) => c.slug === section.parent);
            if (!parent) return null;
            const children = byParent.get(parent.id) ?? [];
            const sectionRankings = rankings
              .filter((r) => r.category?.slug === parent.slug)
              .slice(0, 2);

            return (
              <section
                key={section.parent}
                aria-labelledby={`cat-${section.parent}`}
                className="py-10 first:pt-0"
              >
                <RuleHeading
                  id={`cat-${section.parent}`}
                  title={section.title}
                  href={`/category/${parent.slug}`}
                  linkLabel={`All ${section.title}`}
                  uppercase
                />

                {/* Every category in this group, as inline links. */}
                <p className="mt-3 text-sm leading-7 text-ink-700">
                  {children.map((child, index) => (
                    <span key={child.id}>
                      <Link
                        href={`/category/${child.slug}`}
                        className="text-brand-600 hover:underline"
                      >
                        {child.name}
                      </Link>
                      {index < children.length - 1 ? (
                        <span className="text-ink-400"> · </span>
                      ) : null}
                    </span>
                  ))}
                </p>

                {sectionRankings.length > 0 ? (
                  <div className="mt-6 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
                    {sectionRankings.map((ranking) => (
                      <RankingCard key={ranking.id} ranking={ranking} />
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>

      {/* --------------------------------------------------- Explore by area */}
      <section
        aria-labelledby="explore-by-area"
        className="border-y border-line bg-sand-50"
      >
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <RuleHeading
            id="explore-by-area"
            title="Explore by Area"
            description="Long Island is not one place. Start with the county, shore or fork you actually go to."
            href="/places"
            linkLabel="All places"
            uppercase
          />
          <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {regions.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>

          {towns.length > 0 ? (
            <div className="mt-10">
              <h3 className="text-sm font-bold uppercase tracking-wide text-navy-900">
                Popular towns
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {towns.map((town) => (
                  <PlaceCard key={town.id} place={town} variant="town" />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* ------------------------------------------------------ Hidden gems */}
      {/*
       * Fed by businesses an editor badged "Hidden Gem" on a published
       * ranking, so it fills in as soon as the first list ships. The rail keeps
       * its place in the page rather than disappearing while that is pending.
       */}
      <section
        aria-labelledby="hidden-gems"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      >
        <RuleHeading
          id="hidden-gems"
          title="Hidden Gems"
          description="The places that do not advertise, do not need to, and are worth the detour anyway."
          uppercase
        />
        {hiddenGems.length > 0 ? (
          <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {hiddenGems.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        ) : (
          <div className="mt-7">
            <EmptyRail
              title="No gems flagged yet"
              actions={[{ label: "Nominate a hidden gem", href: "/nominate" }]}
            >
              An editor marks a place a hidden gem while building a ranking, so
              this fills in with the first published list. Know somewhere that
              belongs here? Tell us.
            </EmptyRail>
          </div>
        )}
      </section>

      <NominationCTA />
      <AdvertiseCTA />
    </>
  );
}
