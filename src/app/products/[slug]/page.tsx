import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductGuideView } from "@/components/products/ProductGuideView";
import {
  getProductGuideBySlug,
  listProductGuideSlugs,
} from "@/lib/data/product-queries";

export const revalidate = 3600;

type PageParams = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await listProductGuideSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getProductGuideBySlug(slug);

  if (!guide) return {
    title: "Guide not found",
    // The root layout sets `index, follow`; without overriding it here the
    // not-found render carries two contradictory robots directives, because
    // Next also injects its own `noindex`.
    robots: { index: false, follow: false },
  };

  const canonical = `/products/${guide.slug}`;

  return {
    title: guide.title,
    description: guide.description ?? undefined,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: guide.title,
      description: guide.description ?? undefined,
      url: canonical,
      publishedTime: guide.published_at ?? undefined,
      modifiedTime: guide.updated_at,
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.description ?? undefined,
    },
  };
}

export default async function ProductGuidePage({ params }: PageParams) {
  const { slug } = await params;
  const guide = await getProductGuideBySlug(slug);

  if (!guide) notFound();

  return <ProductGuideView guide={guide} />;
}
