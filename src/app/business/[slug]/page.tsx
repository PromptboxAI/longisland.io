import { Globe, MapPin, Navigation, Phone, Tag } from "lucide-react";
import { resolveImageUrl } from "@/lib/media/resolve";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdvertiseCTA } from "@/components/cta/AdvertiseCTA";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { EditorialImage } from "@/components/ui/EditorialImage";
import { RuleHeading } from "@/components/ui/RuleHeading";
import {
  getBusinessAppearances,
  getBusinessBySlug,
  listBusinesses,
  listBusinessSlugs,
  listCategories,
} from "@/lib/data/queries";
import {
  breadcrumbJsonLd,
  businessJsonLd,
  jsonLdScriptProps,
  type BreadcrumbItem,
} from "@/lib/seo/json-ld";
import { EDITORIAL_INDEPENDENCE_NOTICE } from "@/lib/site";
import { BusinessCard } from "@/components/cards/BusinessCard";

export const revalidate = 3600;

type PageParams = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await listBusinessSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) return {
    title: "Business not found",
    // The root layout sets `index, follow`; without overriding it here the
    // not-found render carries two contradictory robots directives, because
    // Next also injects its own `noindex`.
    robots: { index: false, follow: false },
  };

  const location = business.city ? ` in ${business.city}` : "";

  return {
    title: `${business.name}${location}`,
    description:
      business.description ??
      `${business.name}${location} — details, location and the LongIsland.io rankings it appears in.`,
    alternates: { canonical: `/business/${business.slug}` },
    openGraph: {
      title: business.name,
      description: business.description ?? undefined,
      url: `/business/${business.slug}`,
    },
  };
}

export default async function BusinessPage({ params }: PageParams) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);

  if (!business) notFound();

  const [appearances, categories] = await Promise.all([
    getBusinessAppearances(business.id),
    listCategories(),
  ]);

  const category = business.category_id
    ? (categories.find((c) => c.id === business.category_id) ?? null)
    : null;

  const nearby = category
    ? (await listBusinesses({ categorySlug: category.slug, limit: 5 })).filter(
        (b) => b.id !== business.id,
      )
    : [];

  const location = [business.city, business.county].filter(Boolean).join(", ");
  const directionsQuery = encodeURIComponent(
    [business.name, business.address, business.city, "NY"].filter(Boolean).join(", "),
  );

  const crumbs: BreadcrumbItem[] = [
    { name: "Home", href: "/" },
    ...(category
      ? [{ name: category.name, href: `/category/${category.slug}` }]
      : []),
    { name: business.name, href: `/business/${business.slug}` },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(businessJsonLd(business))} />
      <script {...jsonLdScriptProps(breadcrumbJsonLd(crumbs))} />

      {/* Hero */}
      <div className="relative h-56 w-full overflow-hidden sm:h-72">
        <EditorialImage
          src={resolveImageUrl(
            business.primary_media ?? null,
            business.primary_image_url,
          )}
          alt=""
          seed={business.slug}
          priority
          sizes="100vw"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-navy-950/85 to-navy-950/25" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-5xl px-4 pb-6 sm:px-6 lg:px-8">
            {category ? (
              <Link
                href={`/category/${category.slug}`}
                className="text-xs font-bold uppercase tracking-wider text-gold-400 hover:underline"
              >
                {category.name}
              </Link>
            ) : null}
            <h1 className="mt-1.5 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              {business.name}
            </h1>
            {location ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-navy-100">
                <MapPin aria-hidden="true" className="size-4" />
                {location}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <Breadcrumbs items={crumbs} />

        {/* Badges earned in rankings */}
        {appearances.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {appearances
              .filter((appearance) => appearance.badge)
              .map((appearance) => (
                <span
                  key={appearance.ranking.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gold-400"
                >
                  {appearance.badge}
                </span>
              ))}
          </div>
        ) : null}

        {/*
          The details panel comes first until there are two columns to put it
          beside. Stacked, the source order buried the address under the
          rankings, the see-also grid and the claim box — so the one fact a
          reader most often arrives for was the last thing on the page.
        */}
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-10">
            {/* Editorial */}
            {business.description || business.editorial_summary ? (
              <section aria-labelledby="about-business">
                <RuleHeading id="about-business" title="About" uppercase />
                <div className="prose-editorial mt-4 text-[15px]">
                  {business.description ? <p>{business.description}</p> : null}
                </div>

                {business.editorial_summary ? (
                  <div className="mt-5 rounded-card border border-line bg-sand-50 p-5">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                      Why LongIsland.io likes it
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-700">
                      {business.editorial_summary}
                    </p>
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* Appears in */}
            {appearances.length > 0 ? (
              <section aria-labelledby="appears-in">
                <RuleHeading
                  id="appears-in"
                  title="Appears In"
                  description="Every published LongIsland.io ranking this business is on."
                  uppercase
                />
                <ul className="mt-5 space-y-3">
                  {appearances.map((appearance) => (
                    <li key={appearance.ranking.id}>
                      <Link
                        href={`/best/${appearance.ranking.slug}`}
                        className="flex items-center gap-4 rounded-card border border-line p-4 transition-colors hover:border-brand-500 hover:bg-sand-50"
                      >
                        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-navy-900 text-sm font-bold text-white">
                          #{appearance.position}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-navy-900">
                            {appearance.ranking.title}
                          </span>
                          {appearance.badge ? (
                            <span className="mt-0.5 block text-xs text-brand-600">
                              {appearance.badge}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <p className="rounded-card border border-line bg-sand-50 p-5 text-sm text-ink-700">
                This business is not on a published ranking yet.
              </p>
            )}

            {/* Nearby / similar */}
            {nearby.length > 0 && category ? (
              <section aria-labelledby="similar-businesses">
                <RuleHeading
                  id="similar-businesses"
                  title={`More ${category.name}`}
                  href={`/category/${category.slug}`}
                  linkLabel="Browse all"
                  uppercase
                />
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {nearby.slice(0, 6).map((item) => (
                    <BusinessCard key={item.id} business={item} variant="compact" />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {/* Sidebar */}
          <aside className="order-first space-y-6 lg:order-none">
            <div className="rounded-card border border-line p-5">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                Business details
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                {business.address ? (
                  <div className="flex gap-2.5">
                    <dt className="sr-only">Address</dt>
                    <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-400" />
                    <dd className="text-ink-700">
                      {business.address}
                      {business.city ? (
                        <>
                          <br />
                          {business.city}, NY
                        </>
                      ) : null}
                    </dd>
                  </div>
                ) : null}

                {business.phone ? (
                  <div className="flex gap-2.5">
                    <dt className="sr-only">Phone</dt>
                    <Phone aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-400" />
                    <dd>
                      <a
                        href={`tel:${business.phone.replace(/[^\d+]/g, "")}`}
                        className="text-brand-600 hover:underline"
                      >
                        {business.phone}
                      </a>
                    </dd>
                  </div>
                ) : null}

                {business.website ? (
                  <div className="flex gap-2.5">
                    <dt className="sr-only">Website</dt>
                    <Globe aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-400" />
                    <dd>
                      <a
                        href={business.website}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="break-all text-brand-600 hover:underline"
                      >
                        Visit website
                      </a>
                    </dd>
                  </div>
                ) : null}

                {category ? (
                  <div className="flex gap-2.5">
                    <dt className="sr-only">Category</dt>
                    <Tag aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-400" />
                    <dd>
                      <Link
                        href={`/category/${category.slug}`}
                        className="text-brand-600 hover:underline"
                      >
                        {category.name}
                      </Link>
                      {business.subcategory ? (
                        <span className="text-ink-500"> · {business.subcategory}</span>
                      ) : null}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${directionsQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex items-center justify-center gap-1.5 rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
              >
                <Navigation aria-hidden="true" className="size-4" />
                Get directions
              </a>
            </div>

            <div className="rounded-card border border-line bg-sand-50 p-5">
              <h2 className="text-sm font-bold text-navy-900">
                Is this your business?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Claim your profile to keep details accurate, or ask about featured
                placement and local guide sponsorships.
              </p>
              <Link
                href={`/advertise?business=${encodeURIComponent(business.name)}`}
                className="mt-4 block rounded-full bg-navy-900 px-5 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-navy-800"
              >
                Claim this business
              </Link>
              <Link
                href="/advertise"
                className="mt-2 block rounded-full border border-navy-300 px-5 py-2.5 text-center text-sm font-semibold text-navy-900 transition-colors hover:border-navy-500"
              >
                Get featured
              </Link>
              <p className="mt-3 text-xs leading-relaxed text-ink-500">
                {EDITORIAL_INDEPENDENCE_NOTICE}
              </p>
            </div>
          </aside>
        </div>
      </div>

      <AdvertiseCTA />
    </>
  );
}
