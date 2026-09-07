import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RankingView } from "@/components/rankings/RankingView";
import { getRankingBySlug, listRankingSlugs } from "@/lib/data/queries";
import { resolveImage } from "@/lib/media/resolve";

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
  const title = ranking.seo_title ?? ranking.title;
  const description = ranking.seo_description ?? ranking.description ?? undefined;
  const share =
    resolveImage(ranking.og_media, null) ??
    resolveImage(ranking.hero_media, ranking.hero_image_url);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title,
      description,
      images: share ? [{ url: share.url }] : undefined,
      url: canonical,
      publishedTime: ranking.published_at ?? undefined,
      modifiedTime: ranking.updated_at,
    },
    twitter: {
      card: "summary_large_image",
      images: share ? [share.url] : undefined,
      title,
      description: ranking.description ?? undefined,
    },
  };
}

export default async function RankingPage({ params }: PageParams) {
  const { slug } = await params;
  const ranking = await getRankingBySlug(slug);

  if (!ranking) notFound();

  return <RankingView ranking={ranking} />;
}
