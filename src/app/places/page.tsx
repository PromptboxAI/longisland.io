import type { Metadata } from "next";

import { PlaceCard } from "@/components/cards/PlaceCard";
import { NominationCTA } from "@/components/cta/NominationCTA";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { RuleHeading } from "@/components/ui/RuleHeading";
import { listPlaces } from "@/lib/data/queries";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Explore Long Island by Place",
  description:
    "Browse Long Island by county, region and town — Nassau, Suffolk, the North and South Shores, the North Fork, the Hamptons and Fire Island.",
  alternates: { canonical: "/places" },
};

export default async function PlacesPage() {
  const places = await listPlaces();

  const counties = places.filter((p) => p.type === "county");
  const regions = places.filter((p) => p.type === "region");
  const towns = places.filter((p) => p.type === "town");

  const nassauTowns = towns.filter((t) => t.county === "Nassau County");
  const suffolkTowns = towns.filter((t) => t.county === "Suffolk County");

  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Places", href: "/places" },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(crumbs))} />

      <div className="border-b border-line bg-sand-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-3 text-3xl font-extrabold uppercase tracking-tight text-navy-900 sm:text-4xl">
            Explore by Place
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-700">
            Long Island is not one place. Start with the county, shore or fork you
            actually go to, then work down to the village.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        <section aria-labelledby="counties">
          <RuleHeading id="counties" title="Counties" uppercase />
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {counties.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        </section>

        <section aria-labelledby="regions">
          <RuleHeading
            id="regions"
            title="Regions"
            description="The shores, the forks and the barrier islands."
            uppercase
          />
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {regions.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        </section>

        <section aria-labelledby="nassau-towns">
          <RuleHeading
            id="nassau-towns"
            title="Nassau County Towns"
            href="/place/nassau-county"
            linkLabel="Best of Nassau"
            uppercase
          />
          <div className="mt-5 flex flex-wrap gap-2">
            {nassauTowns.map((town) => (
              <PlaceCard key={town.id} place={town} variant="town" />
            ))}
          </div>
        </section>

        <section aria-labelledby="suffolk-towns">
          <RuleHeading
            id="suffolk-towns"
            title="Suffolk County Towns"
            href="/place/suffolk-county"
            linkLabel="Best of Suffolk"
            uppercase
          />
          <div className="mt-5 flex flex-wrap gap-2">
            {suffolkTowns.map((town) => (
              <PlaceCard key={town.id} place={town} variant="town" />
            ))}
          </div>
        </section>
      </div>

      <NominationCTA />
    </>
  );
}
