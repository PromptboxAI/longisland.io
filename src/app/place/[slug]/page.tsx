import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BusinessCard } from "@/components/cards/BusinessCard";
import { PlaceCard } from "@/components/cards/PlaceCard";
import { RankingCard } from "@/components/cards/RankingCard";
import { AdvertiseCTA } from "@/components/cta/AdvertiseCTA";
import { NominationCTA } from "@/components/cta/NominationCTA";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { RuleHeading } from "@/components/ui/RuleHeading";
import {
  getPlaceBySlug,
  listBusinesses,
  listCategories,
  listPlaces,
  listRankings,
} from "@/lib/data/queries";
import {
  breadcrumbJsonLd,
  jsonLdScriptProps,
  type BreadcrumbItem,
} from "@/lib/seo/json-ld";

export const revalidate = 3600;

type PageParams = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const places = await listPlaces();
  return places.map((place) => ({ slug: place.slug }));
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) return {
    title: "Place not found",
    // The root layout sets `index, follow`; without overriding it here the
    // not-found render carries two contradictory robots directives, because
    // Next also injects its own `noindex`.
    robots: { index: false, follow: false },
  };

  const title = `Best of ${place.name}`;

  return {
    title,
    description:
      place.description ??
      `Restaurants, things to do and local businesses worth knowing in ${place.name}.`,
    alternates: { canonical: `/place/${place.slug}` },
    openGraph: {
      title,
      description: place.description ?? undefined,
      url: `/place/${place.slug}`,
    },
  };
}

/** The category rails a place page publishes, in order. */
const PLACE_SECTIONS = [
  { slug: "restaurants", title: "Best Restaurants" },
  { slug: "pizza", title: "Best Pizza" },
  { slug: "bagels", title: "Best Bagels" },
  { slug: "things-to-do", title: "Best Things to Do" },
] as const;

export default async function PlacePage({ params }: PageParams) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);

  if (!place) notFound();

  const [rankings, businesses, places, categories] = await Promise.all([
    listRankings({ placeSlug: place.slug }),
    listBusinesses({ placeSlug: place.slug, limit: 12 }),
    listPlaces(),
    listCategories(),
  ]);

  const parent = place.parent_id
    ? (places.find((p) => p.id === place.parent_id) ?? null)
    : null;

  const childPlaces = places.filter((p) => p.parent_id === place.id);

  // Nearby: siblings under the same parent, excluding this place.
  const nearby = places
    .filter((p) => p.parent_id === place.parent_id && p.id !== place.id)
    .slice(0, 12);

  const sections = PLACE_SECTIONS.map((section) => {
    const category = categories.find((c) => c.slug === section.slug);
    if (!category) return null;

    const childIds = new Set(
      categories.filter((c) => c.parent_id === category.id).map((c) => c.id),
    );
    childIds.add(category.id);

    const items = businesses.filter(
      (b) => b.category_id && childIds.has(b.category_id),
    );

    return items.length > 0
      ? { ...section, categorySlug: category.slug, items: items.slice(0, 4) }
      : null;
  }).filter((section) => section !== null);

  const crumbs: BreadcrumbItem[] = [
    { name: "Home", href: "/" },
    { name: "Places", href: "/places" },
    ...(parent ? [{ name: parent.name, href: `/place/${parent.slug}` }] : []),
    { name: place.name, href: `/place/${place.slug}` },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(crumbs))} />

      <div className="border-b border-line bg-sand-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl">
            Best of {place.name}
          </h1>
          {place.description ? (
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-700">
              {place.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        {/* Towns inside this county or region */}
        {childPlaces.length > 0 ? (
          <section aria-labelledby="places-within">
            <RuleHeading
              id="places-within"
              title={`Towns in ${place.name}`}
              uppercase
            />
            <div className="mt-5 flex flex-wrap gap-2">
              {childPlaces.map((child) => (
                <PlaceCard key={child.id} place={child} variant="town" />
              ))}
            </div>
          </section>
        ) : null}

        {/* Rankings scoped to this place */}
        {rankings.length > 0 ? (
          <section aria-labelledby="place-rankings">
            <RuleHeading
              id="place-rankings"
              title={`${place.name} Rankings`}
              href={`/best?place=${place.slug}`}
              linkLabel="All rankings"
              uppercase
            />
            <div className="mt-7 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {rankings.map((ranking) => (
                <RankingCard key={ranking.id} ranking={ranking} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Category rails */}
        {sections.map((section) => (
          <section key={section.slug} aria-labelledby={`place-${section.slug}`}>
            <RuleHeading
              id={`place-${section.slug}`}
              title={`${section.title} in ${place.name}`}
              href={`/category/${section.categorySlug}`}
              linkLabel={`All ${section.title.replace("Best ", "").toLowerCase()}`}
              uppercase
            />
            <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {section.items.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
            </div>
          </section>
        ))}

        {/* Everything else we know here */}
        {businesses.length > 0 ? (
          <section aria-labelledby="place-businesses">
            <RuleHeading
              id="place-businesses"
              title={`Local Businesses in ${place.name}`}
              uppercase
            />
            <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {businesses.slice(0, 8).map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
            </div>
          </section>
        ) : (
          <div className="rounded-card border border-line bg-sand-50 p-10 text-center">
            <h2 className="text-lg font-bold text-navy-900">
              Nothing published here yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-700">
              We have not covered {place.name} yet. Tell us what we are missing and
              it goes on the research list.
            </p>
            <Link
              href="/nominate"
              className="mt-5 inline-block rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
            >
              Nominate a business
            </Link>
          </div>
        )}

        {/* Nearby */}
        {nearby.length > 0 ? (
          <section aria-labelledby="nearby-places">
            <RuleHeading id="nearby-places" title="Nearby Places" uppercase />
            <div className="mt-5 flex flex-wrap gap-2">
              {nearby.map((item) => (
                <PlaceCard key={item.id} place={item} variant="town" />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <NominationCTA />
      <AdvertiseCTA />
    </>
  );
}
