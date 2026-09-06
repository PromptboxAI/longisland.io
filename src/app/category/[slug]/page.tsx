import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BusinessCard } from "@/components/cards/BusinessCard";
import { CategoryCard } from "@/components/cards/CategoryCard";
import { RankingCard } from "@/components/cards/RankingCard";
import { AdvertiseCTA } from "@/components/cta/AdvertiseCTA";
import { NominationCTA } from "@/components/cta/NominationCTA";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { RuleHeading } from "@/components/ui/RuleHeading";
import {
  pickRankingSummaries,
  toRelatedLinks,
} from "@/lib/editorial/section-adapters";
import {
  getCategoryBySlug,
  getSection,
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
  const categories = await listCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {
    title: "Category not found",
    // The root layout sets `index, follow`; without overriding it here the
    // not-found render carries two contradictory robots directives, because
    // Next also injects its own `noindex`.
    robots: { index: false, follow: false },
  };

  const title = `Best ${category.name} on Long Island`;

  return {
    title,
    description:
      category.description ??
      `Rankings, reviews and local picks for ${category.name.toLowerCase()} across Nassau and Suffolk.`,
    alternates: { canonical: `/category/${category.slug}` },
    openGraph: {
      title,
      description: category.description ?? undefined,
      url: `/category/${category.slug}`,
    },
  };
}

/** Areas we publish geographic cross-links for. */
const CROSS_LINK_PLACES = [
  "nassau-county",
  "suffolk-county",
  "north-shore",
  "south-shore",
  "north-fork",
  "hamptons",
  "huntington",
  "patchogue",
  "garden-city",
  "port-jefferson",
];

export default async function CategoryPage({ params }: PageParams) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) notFound();

  const [
    rankings,
    businesses,
    allCategories,
    places,
    moduleSection,
    linksSection,
    relatedSection,
  ] = await Promise.all([
    listRankings({ categorySlug: category.slug }),
    listBusinesses({ categorySlug: category.slug, limit: 8 }),
    listCategories(),
    listPlaces(),
    getSection("category_module", { categoryId: category.id }),
    getSection("category_links", { categoryId: category.id }),
    getSection("related_content", { categoryId: category.id }),
  ]);

  /*
   * Curated first, category feed second. Each fallback below is the behaviour
   * this page had before curation existed, kept only while its section is
   * unconfigured.
   */
  const curatedModule = pickRankingSummaries(moduleSection, rankings);
  const moduleRankings = curatedModule.length > 0 ? curatedModule : rankings;

  // Text links under the section heading — any target type.
  const headingLinks = toRelatedLinks(linksSection);

  // Related content replaces the sibling-category guess when configured.
  const curatedRelated = toRelatedLinks(relatedSection);

  const children = allCategories.filter((c) => c.parent_id === category.id);
  const parent = category.parent_id
    ? (allCategories.find((c) => c.id === category.parent_id) ?? null)
    : null;

  // Siblings make better "related" links than an arbitrary slice of the tree.
  const related = allCategories
    .filter(
      (c) =>
        c.id !== category.id &&
        c.parent_id === (category.parent_id ?? category.id) &&
        c.parent_id !== null,
    )
    .slice(0, 8);

  const crossLinks = CROSS_LINK_PLACES.map((placeSlug) =>
    places.find((p) => p.slug === placeSlug),
  ).filter((place) => place !== undefined);

  const crumbs: BreadcrumbItem[] = [
    { name: "Home", href: "/" },
    { name: "Categories", href: "/categories" },
    ...(parent ? [{ name: parent.name, href: `/category/${parent.slug}` }] : []),
    { name: category.name, href: `/category/${category.slug}` },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(crumbs))} />

      <div className="border-b border-line bg-sand-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl">
            Best {category.name} on Long Island
          </h1>
          {category.description ? (
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-700">
              {category.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        {/* Child categories, when this is a top-level group. */}
        {children.length > 0 ? (
          <section aria-labelledby="subcategories">
            <RuleHeading
              id="subcategories"
              title={`Browse ${category.name}`}
              uppercase
            />
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {children.map((child) => (
                <CategoryCard key={child.id} category={child} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Featured rankings — curated via category_module when configured */}
        {moduleRankings.length > 0 ? (
          <section aria-labelledby="category-rankings">
            <RuleHeading
              id="category-rankings"
              title={`${category.name} Rankings`}
              description="Independently researched lists, editorially ordered."
              href={`/best?category=${category.slug}`}
              linkLabel="All rankings"
              uppercase
            />
            {headingLinks.length > 0 ? (
              <p className="mt-3 text-sm leading-7 text-ink-700">
                {headingLinks.map((link, index) => (
                  <span key={link.href}>
                    <Link href={link.href} className="text-brand-600 hover:underline">
                      {link.title}
                    </Link>
                    {index < headingLinks.length - 1 ? (
                      <span className="text-ink-400"> · </span>
                    ) : null}
                  </span>
                ))}
              </p>
            ) : null}
            <div className="mt-7 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {moduleRankings.map((ranking) => (
                <RankingCard key={ranking.id} ranking={ranking} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Businesses */}
        {businesses.length > 0 ? (
          <section aria-labelledby="category-businesses">
            <RuleHeading
              id="category-businesses"
              title={`Popular ${category.name} Spots`}
              uppercase
            />
            <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {businesses.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
            </div>
          </section>
        ) : null}

        {rankings.length === 0 && businesses.length === 0 ? (
          <div className="rounded-card border border-line bg-sand-50 p-10 text-center">
            <h2 className="text-lg font-bold text-navy-900">
              We are still building this one
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-700">
              No {category.name.toLowerCase()} rankings are published yet. Know a
              place that belongs here? Tell us and we will look at it.
            </p>
            <Link
              href="/nominate"
              className="mt-5 inline-block rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
            >
              Nominate a business
            </Link>
          </div>
        ) : null}

        {/* Geographic cross-links — the SEO spine of the site. */}
        <section aria-labelledby="category-by-area">
          <RuleHeading
            id="category-by-area"
            title={`${category.name} by Area`}
            description="Narrow it down to the part of the island you are actually in."
            uppercase
          />
          <div className="mt-5 flex flex-wrap gap-2">
            {crossLinks.map((place) => (
              <Link
                key={place.id}
                href={`/place/${place.slug}`}
                className="rounded-full border border-navy-200 px-4 py-2 text-sm font-medium text-navy-900 transition-colors hover:border-brand-500 hover:text-brand-600"
              >
                Best {category.name} in {place.name}
              </Link>
            ))}
          </div>
        </section>

        {/* Related content — curated when configured, siblings otherwise */}
        {curatedRelated.length > 0 ? (
          <section aria-labelledby="related-content">
            <RuleHeading id="related-content" title="Related" uppercase />
            <div className="mt-5 flex flex-wrap gap-2">
              {curatedRelated.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-navy-200 px-4 py-2 text-sm font-medium text-navy-900 transition-colors hover:border-brand-500 hover:text-brand-600"
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </section>
        ) : related.length > 0 ? (
          <section aria-labelledby="related-categories">
            <RuleHeading id="related-categories" title="Related Categories" uppercase />
            <div className="mt-5 flex flex-wrap gap-2">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/category/${item.slug}`}
                  className="rounded-full border border-navy-200 px-4 py-2 text-sm font-medium text-navy-900 transition-colors hover:border-brand-500 hover:text-brand-600"
                >
                  {item.name}
                </Link>
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
