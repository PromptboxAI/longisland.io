import Link from "next/link";

import { BusinessCard } from "@/components/cards/BusinessCard";
import { PickCard } from "@/components/cards/PickCard";
import { PlaceCard } from "@/components/cards/PlaceCard";
import { FeatureCard } from "@/components/cards/FeatureCard";
import { RankingCard } from "@/components/cards/RankingCard";
import { AdvertiseCTA } from "@/components/cta/AdvertiseCTA";
import { NewsletterSignup } from "@/components/cta/NewsletterSignup";
import { NominationCTA } from "@/components/cta/NominationCTA";
import { AffiliateDisclosure } from "@/components/products/AffiliateDisclosure";
import { ProductCard } from "@/components/products/ProductCard";
import { TopRail, rankingsToRailItems } from "@/components/rankings/TopRail";
import { hasAffiliateLinks, merchantDisclosures } from "@/lib/affiliate";
import { deriveRelatedFallback } from "@/lib/editorial/related-fallback";
import { SearchBar } from "@/components/site/SearchBar";
import { EditorialEmpty } from "@/components/ui/EditorialEmpty";
import { RuleHeading } from "@/components/ui/RuleHeading";
import {
  getSection,
  listBadgedBusinesses,
  listCategories,
  listPlaces,
  listRankings,
} from "@/lib/data/queries";
import {
  pickedProducts,
  pickRankingSummaries,
  rankingToFeature,
  toFeature,
  toPickCards,
  toRailItems,
  toRelatedLinks,
  type SectionPick,
} from "@/lib/editorial/section-adapters";
import type { Category } from "@/types/database";

export const revalidate = 3600;

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
  const [
    rankings,
    categories,
    places,
    hiddenGems,
    primarySection,
    latestSection,
    railSection,
    picksSection,
    trendingSection,
    relatedSection,
  ] = await Promise.all([
    listRankings({}),
    listCategories(),
    listPlaces(),
    listBadgedBusinesses("Hidden Gem", 4),
    getSection("homepage_primary"),
    getSection("homepage_latest"),
    getSection("homepage_top_rail"),
    getSection("homepage_top_picks"),
    getSection("homepage_trending"),
    getSection("related_content"),
  ]);

  const byParent = new Map<string, Category[]>();
  for (const category of categories) {
    if (!category.parent_id) continue;
    const list = byParent.get(category.parent_id) ?? [];
    list.push(category);
    byParent.set(category.parent_id, list);
  }

  /*
   * Each slot prefers what an editor curated. The feed slices below survive
   * only as a fallback for a section nobody has configured yet — configure the
   * section and the slice stops being consulted. They are the last automatic
   * selection left on this page and should go when curation is populated.
   */
  const [feedLead, ...rest] = rankings;

  /*
   * The feature well takes ANY curated target — a ranking, an article, a buying
   * guide — because it renders from the resolved item rather than from a
   * ranking record. Falls back to the newest ranking while nothing is curated.
   */
  const lead =
    toFeature(primarySection, rankings) ??
    (feedLead ? rankingToFeature(feedLead) : null);

  const curatedLatest = pickRankingSummaries(latestSection, rankings);
  const latest = curatedLatest.length > 0 ? curatedLatest : rest.slice(0, 5);

  // The rail takes any target type, so a product guide can sit here already.
  const curatedRail = toRailItems(railSection);
  const railItems =
    curatedRail.length > 0 ? curatedRail : rankingsToRailItems(rankings.slice(0, 5));

  /*
   * Five is the row's rhythm, enforced in the adapter as well as here so a
   * section configured with a larger max cannot break the grid.
   */
  /*
   * Top Picks is a commerce row: curated non-product targets are skipped rather
   * than rendered as editorial cards, so the five tiles agree on image ratio,
   * height and where the button sits. Mixed targets remain supported in every
   * other section.
   */
  const curatedPicks = toPickCards(picksSection, 5, { productsOnly: true });
  const fallbackPicks: SectionPick[] = rankings.slice(0, 5).map((ranking) => ({
    kind: "editorial",
    key: ranking.id,
    title: ranking.title,
    subtitle: ranking.geography,
    href: `/best/${ranking.slug}`,
    imageUrl: ranking.hero_image_url,
    imageSeed: ranking.slug,
  }));
  const topPicks = curatedPicks.length > 0 ? curatedPicks : fallbackPicks;

  /*
   * Disclosure follows the monetised links actually on the page, never the name
   * of the section — a Top Picks row of rankings claims no commercial
   * relationship, and one gaining a tagged product discloses without anyone
   * remembering to add a component.
   */
  const pickProducts = pickedProducts(topPicks);
  const picksNeedDisclosure = hasAffiliateLinks(pickProducts);
  const picksMerchantNotes = merchantDisclosures(pickProducts);

  const curatedTrending = pickRankingSummaries(trendingSection, rankings);
  const trending = curatedTrending.length > 0 ? curatedTrending : rankings.slice(0, 3);

  /*
   * Curated related content wins; deriveRelatedFallback stays only until a
   * related_content section is populated, then it can be deleted outright.
   */
  const curatedRelated = toRelatedLinks(relatedSection);
  const relatedToLead =
    curatedRelated.length > 0 ? curatedRelated : deriveRelatedFallback(feedLead, rest);

  const regions = REGION_SLUGS.map((slug) =>
    places.find((place) => place.slug === slug),
  ).filter((place) => place !== undefined);

  const towns = places.filter((place) => place.type === "town");

  return (
    <>
      {/*
       * The homepage leads with the magazine row rather than a hero band, so
       * every visible heading is section-level. This carries the document
       * outline for assistive tech and search without painting a title.
       */}
      <h1 className="sr-only">
        Long Island rankings, reviews and local finds
      </h1>

      {/* ------------------------------- Primary editorial row: 3 columns */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/*
          * Columns engage at md (768px), not lg. At the lg breakpoint a 1000px
          * window still stacked, dropping Top Rankings underneath The Latest
          * instead of beside the feature — the composition this row exists for.
          */}
        <div className="grid gap-6 md:grid-cols-[minmax(0,170px)_minmax(0,1fr)_minmax(0,190px)] lg:grid-cols-[minmax(0,230px)_minmax(0,1fr)_minmax(0,270px)] lg:gap-10">
          {/* LEFT — narrow news rail */}
          <aside
            aria-labelledby="the-latest"
            className="order-2 md:order-1 lg:border-r lg:border-line lg:pr-8"
          >
            <RuleHeading id="the-latest" title="The Latest" size="sm" />
            {latest.length > 0 ? (
              <div className="mt-4 space-y-4">
                {latest.map((ranking) => (
                  <RankingCard key={ranking.id} ranking={ranking} variant="text" />
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EditorialEmpty
                  variant="rail"
                  title="New guides and rankings land here as we publish them."
                  href="/categories"
                  linkLabel="Browse categories"
                />
              </div>
            )}
          </aside>

          {/* CENTER — the dominant slot on the page */}
          <div className="order-1 md:order-2">
            {lead ? (
              <FeatureCard
                href={lead.href}
                headline={lead.headline}
                kicker={lead.kicker}
                dek={lead.dek}
                imageUrl={lead.imageUrl}
                imageSeed={lead.imageSeed}
                objectPosition={lead.objectPosition ?? undefined}
                meta={lead.meta}
                relatedItems={relatedToLead}
                priority
              />
            ) : (
              <EditorialEmpty
                variant="feature"
                eyebrow="Featured"
                title="The best of Long Island, ranked."
                description="Our flagship list runs here — the top ten we send people to first, from pizza and bagels to the trades worth calling."
              />
            )}
          </div>

          {/* RIGHT — configurable leaderboard: rankings now, deals later */}
          <div className="order-3 lg:border-l lg:border-line lg:pl-8">
            <TopRail id="top-rankings" mode="rankings" items={railItems} />
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- Top picks */}
      {/*
        * No band of its own: this shares the white ground of the editorial row
        * above it so the two read as one continuous front page. Curated
        * highlights only — deliberately no "all rankings" link, since this is
        * not a directory block.
        */}
      <section
        aria-labelledby="top-picks"
        className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8"
      >
        <RuleHeading
          id="top-picks"
          title="Our Top Picks"
          description="Rankings from across our categories."
        />
        {picksNeedDisclosure ? (
          <div className="mt-3">
            <AffiliateDisclosure variant="inline" merchantNotes={picksMerchantNotes} />
          </div>
        ) : null}
        {topPicks.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-7 lg:grid-cols-5">
            {topPicks.map((pick) =>
              pick.kind === "product" ? (
                <ProductCard
                  key={pick.key}
                  product={pick.product}
                  badge={pick.badge}
                  note={pick.note}
                />
              ) : (
                <PickCard
                  key={pick.key}
                  title={pick.title}
                  subtitle={pick.subtitle}
                  href={pick.href}
                  imageUrl={pick.imageUrl}
                  imageSeed={pick.imageSeed}
                />
              ),
            )}
          </div>
        ) : (
          /*
           * Holds the five-card rhythm so the row keeps its shape unpublished.
           *
           * Two-up on mobile, unlike the populated grid: a real card earns a
           * full-width row with its headline, but five wordless tiles at one per
           * row is a screen and a half of nothing to scroll past.
           */
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-7 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((rank) => (
              <EditorialEmpty key={rank} variant="card" index={rank} />
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------- Search band */}
      <section
        aria-labelledby="know-before-you-go"
        className="border-y border-line bg-sand-50"
      >
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <h2
            id="know-before-you-go"
            className="text-2xl leading-tight text-navy-900 sm:text-3xl"
          >
            Know before you go. Every time.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink-700">
            Search Long Island businesses, rankings, towns and categories.
          </p>
          <div className="mx-auto mt-6 max-w-xl">
            <SearchBar variant="band" placeholder="Search rankings, places, businesses" />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- Trending */}
      {/* Stays its own rail. Behaviour untouched; only the empty state is new. */}
      <section
        aria-labelledby="trending"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      >
        <RuleHeading
          id="trending"
          title="What's Trending Now"
          description="Recently published rankings."
        />
        {trending.length > 0 ? (
          <div className="mt-6 grid gap-8 md:grid-cols-3">
            {trending.map((ranking) => (
              <RankingCard key={ranking.id} ranking={ranking} />
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <EditorialEmpty
              title="Nothing is trending yet."
              description="Once readers start moving through our rankings, the week's most-read lists surface here."
            />
          </div>
        )}
      </section>

      {/* ------------------------------------------------------- Newsletter */}
      <section aria-labelledby="newsletter" className="bg-navy-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:gap-10 lg:px-8">
          <div className="shrink-0">
            <h2 id="newsletter" className="text-xl leading-tight text-white sm:text-2xl">
              Sign up for our <span className="text-gold-400">newsletter</span>
            </h2>
            <p className="eyebrow mt-1 text-navy-300">Weekly</p>
          </div>

          <p className="max-w-md text-sm leading-relaxed text-white lg:flex-1">
            New rankings, seasonal guides and the local places we found that
            week, delivered to your inbox every Thursday.
          </p>

          <div className="w-full lg:ml-auto lg:w-auto lg:min-w-88">
            <NewsletterSignup variant="band" source="homepage" />
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
      {hiddenGems.length > 0 ? (
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
          <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {hiddenGems.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        </section>
      ) : null}

      <NominationCTA />
      <AdvertiseCTA />
    </>
  );
}
