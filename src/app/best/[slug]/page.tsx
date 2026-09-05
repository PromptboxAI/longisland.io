import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RankingCard } from "@/components/cards/RankingCard";
import { NominationCTA } from "@/components/cta/NominationCTA";
import { EditorialDisclosure } from "@/components/editorial/EditorialDisclosure";
import { MethodologyNotice } from "@/components/editorial/MethodologyNotice";
import { RankingEntry } from "@/components/rankings/RankingEntry";
import { RankingQuickList } from "@/components/rankings/RankingQuickList";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { RuleHeading } from "@/components/ui/RuleHeading";
import { getRankingBySlug, listRankings, listRankingSlugs } from "@/lib/data/queries";
import {
  breadcrumbJsonLd,
  jsonLdScriptProps,
  rankingJsonLd,
  type BreadcrumbItem,
} from "@/lib/seo/json-ld";
import { EDITORIAL_INDEPENDENCE_NOTICE } from "@/lib/site";

export const revalidate = 3600;

type PageParams = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await listRankingSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const ranking = await getRankingBySlug(slug);

  if (!ranking) return {
    title: "Ranking not found",
    // The root layout sets `index, follow`; without overriding it here the
    // not-found render carries two contradictory robots directives, because
    // Next also injects its own `noindex`.
    robots: { index: false, follow: false },
  };

  const canonical = `/best/${ranking.slug}`;

  return {
    title: ranking.title,
    description: ranking.description ?? undefined,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: ranking.title,
      description: ranking.description ?? undefined,
      url: canonical,
      publishedTime: ranking.published_at ?? undefined,
      modifiedTime: ranking.updated_at,
    },
    twitter: {
      card: "summary_large_image",
      title: ranking.title,
      description: ranking.description ?? undefined,
    },
  };
}

export default async function RankingPage({ params }: PageParams) {
  const { slug } = await params;
  const ranking = await getRankingBySlug(slug);

  if (!ranking) notFound();

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

  return (
    <>
      <script {...jsonLdScriptProps(rankingJsonLd(ranking))} />
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
          <MethodologyNotice methodology={ranking.methodology} variant="banner" />
        </div>

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

        <div className="mt-12">
          <MethodologyNotice methodology={ranking.methodology} variant="section" />
        </div>

        <div className="mt-8">
          <NominationCTA variant="inline" />
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
