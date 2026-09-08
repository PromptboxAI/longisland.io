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
import { TopRail } from "@/components/rankings/TopRail";
import { hasAffiliateLinks, merchantDisclosures } from "@/lib/affiliate";
import { deriveRelatedFallback } from "@/lib/editorial/related-fallback";
import { findPlacement } from "@/lib/editorial/placements";
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
  toFeature,
  toPickCards,
  toRailItems,
  toRelatedLinks,
} from "@/lib/editorial/section-adapters";
import type { Category } from "@/types/database";

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

/**
 * The homepage, composed once and rendered twice.
 *
 * `draft` is the only difference between the live page and the editor preview.
 * It is passed straight through to `getSection`, which swaps the anonymous
 * database client for the signed-in editor's own — so an unpublished placement,
 * and an unpublished ranking curated into one, resolve exactly as they will on
 * the day they go live.
 *
 * Rendering the real composition is the whole point. A mock-up of the homepage
 * answers a different question from the one an editor is asking, which is
 * "what will the front page look like when I press publish".
 */
export async function HomeComposition({ draft = false }: { draft?: boolean }) {

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
    getSection("homepage_primary", {}, { draft }),
    getSection("homepage_latest", {}, { draft }),
    getSection("homepage_top_rail", {}, { draft }),
    getSection("homepage_top_picks", {}, { draft }),
    getSection("homepage_trending", {}, { draft }),
    getSection("related_content", {}, { draft }),
  ]);

  const byParent = new Map<string, Category[]>();
  for (const category of categories) {
    if (!category.parent_id) continue;
    const list = byParent.get(category.parent_id) ?? [];
    list.push(category);
    byParent.set(category.parent_id, list);
  }

  /*
   * HOMEPAGE COMPOSITION RULES
   *
   * One published ranking used to appear in Latest, Top Rankings, Top Picks and
   * Trending at once, because every slot fell back to the same feed slice. That
   * made an editorial homepage behave like an automatic feed with one item in
   * it, repeated.
   *
   * So fallback is now a per-placement decision rather than a house default:
   *
   *   Primary Feature   curated only        · hidden when empty
   *   Latest            automatic           · newest published, chronological
   *   Top Rankings      curated only        · hidden when empty
   *   Top Picks         curated, products   · hidden when empty
   *   Trending          curated only        · hidden when empty
   *   Related Content   curated, then derived from the feature
   *
   * Only Latest is designed as an automatic feed, because "the newest thing we
   * published" is a fact. "Trending" and "Top" are claims, and a claim nobody
   * made is not one worth printing.
   */
  /*
   * SECTION HEADINGS COME FROM THE SECTION.
   *
   * They used to be string literals here, which made the Title and Description
   * fields in Section Settings look editable and do nothing — an editor
   * changing "Our Top Picks" to "Our Top Pick" saw no change on the homepage
   * and had no way to tell whether the save failed or the field was decorative.
   *
   * The placement table supplies the default, so a section that has never been
   * touched still reads properly, and `showsHeading` is what decides whether a
   * heading is drawn at all — the Primary Feature does not have one, because
   * the item it holds supplies the headline.
   */
  const headingFor = (
    key: string,
    section: { title: string | null; description: string | null } | null,
  ) => {
    const placement = findPlacement(key);
    if (!placement?.showsHeading) return null;
    return {
      title: section?.title?.trim() || placement.publicHeading || "",
      description: section?.description?.trim() || null,
    };
  };

  const latestHeading = headingFor("homepage_latest", latestSection);
  const railHeading = headingFor("homepage_top_rail", railSection);
  const picksHeading = headingFor("homepage_top_picks", picksSection);
  const trendingHeading = headingFor("homepage_trending", trendingSection);

  const [feedLead, ...rest] = rankings;

  /*
   * The feature takes ANY curated target — ranking, article or buying guide —
   * because it renders from the resolved item rather than from a ranking. It
   * has no automatic fallback: the lead story is the one editorial decision on
   * the page that should never be made by a sort order.
   */
  const lead = toFeature(primarySection, rankings);

  /*
   * Whatever the feature is showing does not repeat itself further down the
   * page automatically. An editor who deliberately places it in another section
   * still gets it there — this only governs the automatic path.
   */
  const featuredHref = lead?.href ?? null;
  const notFeatured = <T extends { slug: string }>(items: T[], prefix: string) =>
    featuredHref ? items.filter((item) => `${prefix}${item.slug}` !== featuredHref) : items;

  // The one automatic feed on the page, and the only one whose claim is a date.
  const curatedLatest = pickRankingSummaries(latestSection, rankings);
  const latest =
    curatedLatest.length > 0 ? curatedLatest : notFeatured(rest, "/best/").slice(0, 5);

  // Curated only. An empty Top Rankings is honest; one filled with every
  // ranking we have is a list of everything calling itself a selection.
  const railItems = toRailItems(railSection);

  /*
   * Products only, curated only. The previous fallback filled a commerce row
   * with local restaurant rankings — the exact thing this section is defined
   * not to hold.
   */
  const topPicks = toPickCards(picksSection, 5, { productsOnly: true });

  /*
   * Disclosure follows the monetised links actually on the page, never the name
   * of the section — a Top Picks row claims no commercial relationship it does
   * not have, and one gaining a tagged product discloses without anyone
   * remembering to add a component.
   */
  const pickProducts = pickedProducts(topPicks);
  const picksNeedDisclosure = hasAffiliateLinks(pickProducts);
  const picksMerchantNotes = merchantDisclosures(pickProducts);

  // Curated only. Recency is not evidence of anything trending.
  const trending = pickRankingSummaries(trendingSection, rankings);

  /*
   * Curated related content wins; the derived fallback stays only until a
   * related_content section is populated, then it can be deleted outright.
   */
  const curatedRelated = toRelatedLinks(relatedSection);
  const relatedToLead =
    curatedRelated.length > 0
      ? curatedRelated
      : deriveRelatedFallback(feedLead, notFeatured(rest, "/best/"));

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
            {latestHeading ? (
              <RuleHeading
                id="the-latest"
                title={latestHeading.title}
                description={latestHeading.description ?? undefined}
                size="sm"
              />
            ) : null}
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
            ) : null}
          </div>

          {/* RIGHT — curated leaderboard. Absent rather than automatic. */}
          {railItems.length > 0 ? (
            <div className="order-3 lg:border-l lg:border-line lg:pl-8">
              <TopRail
                id="top-rankings"
                mode="rankings"
                items={railItems}
                title={railHeading?.title}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* ---------------------------------------------------------- Top picks */}
      {/*
        Products only, curated only. The section is absent when empty rather
        than filled from the ranking feed — a commerce row of local restaurant
        rankings is the one thing it is defined not to be.
      */}
      {topPicks.length > 0 ? (
        <section
        aria-labelledby="top-picks"
        className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8"
      >
        {picksHeading ? (
          <RuleHeading
            id="top-picks"
            title={picksHeading.title}
            description={
              picksHeading.description ??
              "Products our editors rate, with where to buy them."
            }
          />
        ) : null}
        {picksNeedDisclosure ? (
          <div className="mt-3">
            <AffiliateDisclosure variant="inline" merchantNotes={picksMerchantNotes} />
          </div>
        ) : null}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-7 lg:grid-cols-5">
            {topPicks.map((pick) =>
              pick.kind === "product" ? (
                <ProductCard
                  key={pick.key}
                  product={pick.product}
                  badge={pick.badge}
                  note={pick.note}
                  placement="homepage_top_picks"
                  sourcePath="/"
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
      </section>
      ) : null}

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
      {/*
        Curated only. Nothing here is "trending" because it was published
        recently — that is a claim, and until there are numbers behind it the
        honest version is an editor deciding.
      */}
      {trending.length > 0 ? (
      <section
        aria-labelledby="trending"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      >
        {trendingHeading ? (
          <RuleHeading
            id="trending"
            title={trendingHeading.title}
            description={trendingHeading.description ?? "Chosen by our editors."}
          />
        ) : null}
        <div className="mt-6 grid gap-8 md:grid-cols-3">
          {trending.map((ranking) => (
            <RankingCard key={ranking.id} ranking={ranking} />
          ))}
        </div>
      </section>
      ) : null}

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
