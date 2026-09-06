import type { Metadata } from "next";
import Link from "next/link";

import { AffiliateDisclosure } from "@/components/products/AffiliateDisclosure";
import { ProductGuideCard } from "@/components/products/ProductGuideCard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { RuleHeading } from "@/components/ui/RuleHeading";
import { PRODUCT_RESEARCH_NOTICE } from "@/lib/affiliate";
import {
  listProductCategories,
  listProductGuides,
} from "@/lib/data/product-queries";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Product Reviews & Buying Guides",
  description:
    "Researched buying guides for the gear a Long Island summer, kitchen and backyard actually calls for — beach blankets, coolers, pizza ovens and more.",
  alternates: { canonical: "/products" },
};

type PageProps = {
  searchParams: Promise<{ category?: string; q?: string }>;
};

export default async function ProductsIndexPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const [guides, categories] = await Promise.all([
    listProductGuides({ categorySlug: params.category, query: params.q }),
    listProductCategories(),
  ]);

  const isFiltered = Boolean(params.category || params.q);
  const topLevel = categories.filter((category) => !category.parent_id);

  // Only offer a category filter that would actually return something.
  const representedSlugs = new Set(
    guides.map((guide) => guide.category?.slug).filter(Boolean) as string[],
  );

  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Product Reviews", href: "/products" },
  ];

  function hrefWith(patch: Record<string, string | undefined>): string {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...params, ...patch })) {
      if (value) next.set(key, value);
    }
    const query = next.toString();
    return query ? `/products?${query}` : "/products";
  }

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(crumbs))} />

      <div className="border-b border-line bg-sand-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-3 text-3xl font-extrabold uppercase tracking-tight text-navy-900 sm:text-4xl">
            Product Reviews
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-700">
            Buying guides for the gear that a day at Robert Moses, a Friday-night
            pie or a nor&rsquo;easter actually calls for. Researched by the same
            team that writes our local rankings, held to the same rule: nothing on
            these lists is here because someone paid for it.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-500">
            {PRODUCT_RESEARCH_NOTICE}
          </p>
        </div>
      </div>

      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 shrink-0 text-[11px] font-bold uppercase tracking-wider text-ink-400">
              Category
            </span>
            <div className="flex flex-wrap gap-2">
              <FilterChip href={hrefWith({ category: undefined })} active={!params.category}>
                All
              </FilterChip>
              {categories
                .filter((category) => representedSlugs.has(category.slug))
                .map((category) => (
                  <FilterChip
                    key={category.id}
                    href={hrefWith({ category: category.slug })}
                    active={params.category === category.slug}
                  >
                    {category.name}
                  </FilterChip>
                ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <AffiliateDisclosure variant="banner" />

        {guides.length === 0 ? (
          <div className="mt-8 rounded-card border border-line bg-sand-50 p-10 text-center">
            <h2 className="text-lg font-bold text-navy-900">
              No buying guides match that
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-700">
              Try removing the filter, or browse our local rankings instead.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href="/products"
                className="rounded-full border border-navy-300 px-5 py-2.5 text-sm font-semibold text-navy-900 hover:bg-white"
              >
                Clear filters
              </Link>
              <Link
                href="/best"
                className="rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
              >
                Best of Long Island
              </Link>
            </div>
          </div>
        ) : isFiltered ? (
          <>
            <p className="mb-6 mt-8 text-sm text-ink-500">
              {guides.length} {guides.length === 1 ? "guide" : "guides"}
            </p>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {guides.map((guide) => (
                <ProductGuideCard key={guide.id} guide={guide} />
              ))}
            </div>
          </>
        ) : (
          <div className="mt-10 space-y-12">
            <section aria-labelledby="latest-guides">
              <RuleHeading id="latest-guides" title="Latest Guides" />
              <div className="mt-7 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {guides.map((guide, index) => (
                  <ProductGuideCard
                    key={guide.id}
                    guide={guide}
                    priority={index === 0}
                  />
                ))}
              </div>
            </section>

            {topLevel.length > 0 ? (
              <section aria-labelledby="browse-product-categories">
                <RuleHeading
                  id="browse-product-categories"
                  title="Browse by Category"
                  description="What we cover, grouped the way you would actually shop for it."
                />
                <div className="mt-5 flex flex-wrap gap-2">
                  {topLevel.map((category) => (
                    <span
                      key={category.id}
                      className="rounded-full border border-navy-200 px-4 py-2 text-sm font-medium text-navy-900"
                    >
                      {category.name}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </>
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
