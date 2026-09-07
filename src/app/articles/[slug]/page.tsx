import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleView } from "@/components/articles/ArticleView";
import { getArticleBySlug, listArticleSlugs } from "@/lib/data/article-queries";
import { resolveImage } from "@/lib/media/resolve";

export const revalidate = 3600;

type PageParams = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await listArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return { title: "Article not found", robots: { index: false, follow: false } };
  }

  const canonical = `/articles/${article.slug}`;
  // The editor's override wins; the headline and standfirst fill in. Both are
  // deliberately optional so a piece published without them still reads well.
  const title = article.seo_title ?? article.title;
  const description = article.seo_description ?? article.dek ?? undefined;

  const share =
    resolveImage(article.og_media, null) ??
    resolveImage(article.hero_media, article.hero_image_url);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.updated_at,
      images: share ? [{ url: share.url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: share ? [share.url] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: PageParams) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) notFound();

  return <ArticleView article={article} />;
}
