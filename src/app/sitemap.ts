import type { MetadataRoute } from "next";

import { listArticles } from "@/lib/data/article-queries";
import { listProductGuides } from "@/lib/data/product-queries";
import {
  listBusinessSlugs,
  listCategories,
  listPlaces,
  listRankings,
} from "@/lib/data/queries";
import { site } from "@/lib/site";

/** Static routes worth indexing, with hand-set priorities. */
const STATIC_ROUTES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" }[] = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/best", priority: 0.9, changeFrequency: "daily" },
  { path: "/categories", priority: 0.8, changeFrequency: "weekly" },
  { path: "/places", priority: 0.8, changeFrequency: "weekly" },
  { path: "/methodology", priority: 0.6, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/products", priority: 0.8, changeFrequency: "daily" },
  { path: "/articles", priority: 0.8, changeFrequency: "daily" },
  { path: "/nominate", priority: 0.5, changeFrequency: "monthly" },
  { path: "/affiliate-disclosure", priority: 0.3, changeFrequency: "yearly" },
  { path: "/advertise", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.4, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [rankings, categories, places, businessSlugs, productGuides, articles] =
    await Promise.all([
      listRankings({}),
      listCategories(),
      listPlaces(),
      listBusinessSlugs(),
      listProductGuides({}),
      listArticles({}),
    ]);

  const now = new Date();

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${site.url}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),

    // Rankings carry the real search value, so they rank highest after the hubs.
    ...rankings.map((ranking) => ({
      url: `${site.url}/best/${ranking.slug}`,
      lastModified: new Date(ranking.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),

    // Buying guides carry commercial search value and are updated as prices and
    // availability move, so they rank alongside local rankings rather than below.
    ...productGuides.map((guide) => ({
      url: `${site.url}/products/${guide.slug}`,
      lastModified: new Date(guide.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...articles.map((article) => ({
      url: `${site.url}/articles/${article.slug}`,
      lastModified: new Date(article.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),

    ...categories.map((category) => ({
      url: `${site.url}/category/${category.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: category.parent_id ? 0.7 : 0.8,
    })),

    ...places.map((place) => ({
      url: `${site.url}/place/${place.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: place.type === "town" ? 0.6 : 0.8,
    })),

    ...businessSlugs.map((slug) => ({
      url: `${site.url}/business/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
