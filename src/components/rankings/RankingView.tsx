import Link from "next/link";

import { RankingCard } from "@/components/cards/RankingCard";
import { NominationCTA } from "@/components/cta/NominationCTA";
import { EditorialDisclosure } from "@/components/editorial/EditorialDisclosure";
import { MethodologyNotice } from "@/components/editorial/MethodologyNotice";
import { RecommendedProductsModule } from "@/components/products/RecommendedProductsModule";
import { RankingEntry } from "@/components/rankings/RankingEntry";
import { RankingQuickList } from "@/components/rankings/RankingQuickList";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { EditorialImage } from "@/components/ui/EditorialImage";
import { resolveImage } from "@/lib/media/resolve";
import { RuleHeading } from "@/components/ui/RuleHeading";
import { listRankings } from "@/lib/data/queries";
import {
  breadcrumbJsonLd,
  jsonLdScriptProps,
  rankingJsonLd,
  type BreadcrumbItem,
} from "@/lib/seo/json-ld";
import { EDITORIAL_INDEPENDENCE_NOTICE } from "@/lib/site";
import type { RankingWithEntries } from "@/types/database";

/**
 * The ranking page itself, given an already-loaded ranking.
 *
 * Split out so the admin preview route can render the real page for a draft
 * instead of an approximation of it. The public route loads with the anonymous
 * client and sees published rankings only; preview loads the same shape with
 * the editor's session, where RLS admits the draft.
 */
export async function RankingView({
  ranking,
}: {
  ranking: RankingWithEntries;
}) {
  // Related lists: same category first, then anything else recent.
  const [sameCategory, recent] = await Promise.all([
    ranking.category
      ? listRankings({ categorySlug: ranking.category.slug, limit: 5 })
      : Promise.resolve([]),
    listRankings({ limit: 5 }),
  ]);

  const related = [...sameCategory, ...recent]
    .filter((item, index, all) => all.findIndex((r) => r.id === item.id) === index)
    .filter((item) => item.slug !== ranking.slug)
    .slice(0, 4);

  const crumbs: BreadcrumbItem[] = [
    { name: "Home", href: "/" },
    { name: "Best Of", href: "/best" },
    ...(ranking.category
      ? [{ name: ranking.category.name, href: `/category/${ranking.category.slug}` }]
      : []),
    { name: ranking.title, href: `/best/${ranking.slug}` },
  ];

  const hero = resolveImage(ranking.hero_media, ranking.hero_image_url, ranking.title);

  return (
    <>
      <script {...jsonLdScriptProps(rankingJsonLd(ranking))} />
      <script {...jsonLdScriptProps(breadcrumbJsonLd(crumbs))} />

      {/*
        Editorial independence disclosure, above everything.
        The sentence stays — it is a commitment, not decoration. The "How we
        rank" link does not: it was one of three routes to the same page inside
        one viewport, and the full methodology block at the foot of the article
        is the one that earns its place.
      */}
      <div className="border-b border-line bg-sand-100">
        <p className="mx-auto max-w-7xl px-4 py-2.5 text-center text-xs text-ink-500 sm:px-6 lg:px-8">
          {EDITORIAL_INDEPENDENCE_NOTICE}
        </p>
      </div>

      <article className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={crumbs} />

        <header className="mt-4">
          {ranking.category ? (
            <Link
              href={`/category/${ranking.category.slug}`}
              className="text-xs font-bold uppercase tracking-wider text-brand-600 hover:underline"
            >
              {ranking.category.name}
            </Link>
          ) : null}

          <h1 className="mt-2 text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl">
            {ranking.title}
          </h1>

          {ranking.description ? (
            <p className="mt-3 text-lg leading-relaxed text-ink-700">
              {ranking.description}
            </p>
          ) : null}

          {/*
            The hero, between the dek and the dateline. It was stored, editable
            and used on cards and share previews long before it appeared here —
            an image an editor uploads has to show on the page they uploaded it
            for, or the field reads as broken.
          */}
          {hero ? (
            <figure className="mt-5">
              <div className="relative aspect-[16/9] overflow-hidden rounded-card border border-line">
                <EditorialImage
                  src={hero.url}
                  alt={hero.alt}
                  seed={ranking.slug}
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
              authorName={ranking.author_name}
              publishedAt={ranking.published_at}
              updatedAt={ranking.updated_at}
            />
          </div>
        </header>

        {ranking.intro ? (
          <div className="prose-editorial mt-6 text-[15px]">
            <p>{ranking.intro}</p>
          </div>
        ) : null}

        <div className="mt-6">
          <RankingQuickList entries={ranking.entries} />
        </div>

        {/* Ranked entries */}
        <div className="mt-10 space-y-8">
          {ranking.entries.map((entry, index) => (
            <RankingEntry key={entry.id} entry={entry} priority={index === 0} />
          ))}
        </div>

        {ranking.entries.length === 0 ? (
          <p className="mt-8 rounded-card border border-line bg-sand-50 p-6 text-sm text-ink-500">
            This ranking does not have any published entries yet.
          </p>
        ) : null}

        {/* Editor-curated products for this list. Renders nothing when none are
            attached, and discloses affiliate links itself. */}
        <div className="mt-10">
          <RecommendedProductsModule
            contentType="ranking"
            contentId={ranking.id}
            localCategoryId={ranking.category?.id}
            sourcePath={`/best/${ranking.slug}`}
          />
        </div>

        <div className="mt-12">
          <MethodologyNotice methodology={ranking.methodology} variant="section" />
        </div>

      </article>

      {related.length > 0 ? (
        <section
          aria-labelledby="related-rankings"
          className="border-t border-line bg-sand-50"
        >
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <RuleHeading
              id="related-rankings"
              title="Related Rankings"
              href="/best"
              linkLabel="All rankings"
              uppercase
            />
            <div className="mt-7 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <RankingCard key={item.id} ranking={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Explore more: category and geography cross-links. */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2">
          {ranking.category ? (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
                Explore more in this category
              </h2>
              <Link
                href={`/category/${ranking.category.slug}`}
                className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline"
              >
                All {ranking.category.name} on Long Island &rsaquo;
              </Link>
            </div>
          ) : null}

          {ranking.place ? (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
                Explore nearby
              </h2>
              <Link
                href={`/place/${ranking.place.slug}`}
                className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline"
              >
                The best of {ranking.place.name} &rsaquo;
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <NominationCTA />
    </>
  );
}
