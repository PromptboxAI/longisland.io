import Link from "next/link";

import { EditorialDisclosure } from "@/components/editorial/EditorialDisclosure";
import { EditorialImage } from "@/components/ui/EditorialImage";
import { resolveImage } from "@/lib/media/resolve";
import { AffiliateDisclosure } from "@/components/products/AffiliateDisclosure";
import { ProductComparisonTable } from "@/components/products/ProductComparisonTable";
import { ProductGuideCard } from "@/components/products/ProductGuideCard";
import { ProductQuickPick } from "@/components/products/ProductQuickPick";
import { ProductRankingEntry } from "@/components/products/ProductRankingEntry";
import { RankingCard } from "@/components/cards/RankingCard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { RuleHeading } from "@/components/ui/RuleHeading";
import {
  PRODUCT_RESEARCH_NOTICE,
  hasAffiliateLinks,
  merchantDisclosures,
} from "@/lib/affiliate";
import {
  listProductGuides,
} from "@/lib/data/product-queries";
import { listRankings } from "@/lib/data/queries";
import {
  breadcrumbJsonLd,
  jsonLdScriptProps,
  type BreadcrumbItem,
} from "@/lib/seo/json-ld";
import { productGuideJsonLd } from "@/lib/seo/product-json-ld";
import { EDITORIAL_INDEPENDENCE_NOTICE } from "@/lib/site";
import type { ProductRankingWithEntries } from "@/types/products";

/**
 * The buying guide page, given an already-loaded guide.
 *
 * Split out for the same reason as RankingView: the admin preview route renders
 * the real page for a draft rather than an approximation of it.
 */
export async function ProductGuideView({
  guide,
}: {
  guide: ProductRankingWithEntries;
}) {
  const products = guide.entries.map((entry) => entry.product);
  const hero = resolveImage(guide.hero_media, guide.hero_image_url, guide.title);
  const showDisclosure = hasAffiliateLinks(products);
  const merchantNotes = merchantDisclosures(products);

  // Cross-links, both directions. The local lists come from the category this
  // guide declares; the sibling guides come from the same product category.
  const [localRankings, otherGuides] = await Promise.all([
    guide.localCategory
      ? listRankings({ categorySlug: guide.localCategory.slug, limit: 4 })
      : Promise.resolve([]),
    listProductGuides({ limit: 5 }),
  ]);

  const related = otherGuides.filter((other) => other.slug !== guide.slug).slice(0, 4);

  const crumbs: BreadcrumbItem[] = [
    { name: "Home", href: "/" },
    { name: "Product Reviews", href: "/products" },
    { name: guide.title, href: `/products/${guide.slug}` },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(productGuideJsonLd(guide))} />
      <script {...jsonLdScriptProps(breadcrumbJsonLd(crumbs))} />

      {/* Editorial independence disclosure, above everything. */}
      <div className="border-b border-line bg-sand-100">
        <p className="mx-auto max-w-7xl px-4 py-2.5 text-center text-xs text-ink-500 sm:px-6 lg:px-8">
          {EDITORIAL_INDEPENDENCE_NOTICE}{" "}
          <Link href="/methodology" className="text-brand-600 underline underline-offset-2">
            How we rank
          </Link>
        </p>
      </div>

      <article className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={crumbs} />

        <header className="mt-4">
          {guide.category ? (
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
              {guide.category.name}
            </span>
          ) : null}

          <h1 className="mt-2 text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl">
            {guide.title}
          </h1>

          {guide.description ? (
            <p className="mt-3 text-lg leading-relaxed text-ink-700">
              {guide.description}
            </p>
          ) : null}

          {hero ? (
            <figure className="mt-5">
              <div className="relative aspect-[16/9] overflow-hidden rounded-card border border-line">
                <EditorialImage
                  src={hero.url}
                  alt={hero.alt}
                  seed={guide.slug}
                  priority
                  objectPosition={hero.objectPosition}
                  sizes="(max-width: 1024px) 100vw, 900px"
                />
              </div>
              {hero.credit ? (
                <figcaption className="mt-2 text-xs text-ink-400">{hero.credit}</figcaption>
              ) : null}
            </figure>
          ) : null}

          <div className="mt-4 border-y border-line py-3">
            <EditorialDisclosure
              authorName={guide.author_name}
              publishedAt={guide.published_at}
              updatedAt={guide.updated_at}
            />
          </div>
        </header>

        {/* Disclosure sits above the first affiliate link, not below the fold. */}
        {showDisclosure ? (
          <div className="mt-6">
            <AffiliateDisclosure variant="banner" merchantNotes={merchantNotes} />
          </div>
        ) : null}

        {guide.intro ? (
          <div className="prose-editorial mt-6 text-[15px]">
            <p>{guide.intro}</p>
          </div>
        ) : null}

        {/* How we chose. The research notice is unconditional: no template on
            this site may imply we bought and tested these products. */}
        <section
          aria-labelledby="how-we-chose"
          className="mt-6 rounded-card border border-brand-200 bg-brand-50 p-5"
        >
          <h2
            id="how-we-chose"
            className="text-sm font-bold uppercase tracking-wider text-navy-900"
          >
            How we chose
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            {guide.methodology ?? PRODUCT_RESEARCH_NOTICE}
          </p>
          {guide.methodology ? (
            <p className="mt-2 text-xs leading-relaxed text-ink-500">
              {PRODUCT_RESEARCH_NOTICE}
            </p>
          ) : null}
        </section>

        <div className="mt-8">
          <ProductQuickPick entries={guide.entries} />
        </div>

        <div className="mt-8">
          <ProductComparisonTable entries={guide.entries} />
        </div>

        {/* Ranked entries */}
        <div className="mt-10 space-y-8">
          {guide.entries.map((entry, index) => (
            <ProductRankingEntry
              key={entry.id}
              entry={entry}
              priority={index === 0}
            />
          ))}
        </div>

        {guide.entries.length === 0 ? (
          <p className="mt-8 rounded-card border border-line bg-sand-50 p-6 text-sm text-ink-500">
            This guide does not have any published picks yet.
          </p>
        ) : null}

        {showDisclosure ? (
          <div className="mt-12">
            <AffiliateDisclosure variant="section" merchantNotes={merchantNotes} />
          </div>
        ) : null}
      </article>

      {/* Cross-link into local content. */}
      {localRankings.length > 0 ? (
        <section
          aria-labelledby="related-local"
          className="border-t border-line bg-sand-50"
        >
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <RuleHeading
              id="related-local"
              title={`Where to go on Long Island`}
              description={
                guide.localCategory
                  ? `Our local rankings for ${guide.localCategory.name.toLowerCase()}.`
                  : undefined
              }
              href="/best"
              linkLabel="All rankings"
            />
            <div className="mt-7 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
              {localRankings.map((ranking) => (
                <RankingCard key={ranking.id} ranking={ranking} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section aria-labelledby="related-guides" className="border-t border-line">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <RuleHeading
              id="related-guides"
              title="More Buying Guides"
              href="/products"
              linkLabel="All guides"
            />
            <div className="mt-7 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((other) => (
                <ProductGuideCard key={other.id} guide={other} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
