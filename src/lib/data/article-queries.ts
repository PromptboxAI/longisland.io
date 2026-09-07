import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createPublicClient } from "@/lib/supabase/public";
import type { Article, ArticleSummary, ArticleWithRelations } from "@/types/articles";

/**
 * Public reads for articles.
 *
 * No seed fallback, deliberately. Articles are new, so there are no fixtures
 * for them and there will never be: a fabricated seasonal guide is worse than
 * an empty section, and the rest of the data layer already learned that lesson
 * the hard way. A failed read logs and returns empty.
 *
 * The client is cookie-free — `cookies()` cannot be called from
 * generateStaticParams, and reading them would force every page dynamic.
 */

const SUMMARY_SELECT =
  "id, title, slug, kind, dek, author_name, published_at, updated_at, " +
  "hero_image_url, category:categories(name, slug), place:places(name, slug), " +
  "hero_media:media_assets!articles_hero_media_id_fkey(*)";

const FULL_SELECT =
  "*, category:categories(id, name, slug), place:places(id, name, slug), " +
  "hero_media:media_assets!articles_hero_media_id_fkey(*), " +
  "og_media:media_assets!articles_og_image_media_id_fkey(*)";

function logQueryError(label: string, error: { code?: string; message?: string }) {
  // Code and message only — never the URL or key material.
  console.error(`[articles] ${label}: ${error.code ?? "?"} ${error.message ?? ""}`);
}

export interface ListArticlesOptions {
  categorySlug?: string;
  placeSlug?: string;
  kind?: string;
  limit?: number;
}

export async function listArticles(
  options: ListArticlesOptions = {},
): Promise<ArticleSummary[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  let request = supabase
    .from("articles")
    .select(SUMMARY_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false });

  if (options.kind) request = request.eq("kind", options.kind);
  if (options.limit) request = request.limit(options.limit);

  const { data, error } = await request;

  if (error) {
    logQueryError("listArticles", error);
    return [];
  }

  let rows = (data ?? []) as unknown as ArticleSummary[];

  // Filtered here rather than in SQL because the slug lives on the joined row;
  // the lists involved are small and this avoids a second round trip.
  if (options.categorySlug) {
    rows = rows.filter((row) => row.category?.slug === options.categorySlug);
  }
  if (options.placeSlug) {
    rows = rows.filter((row) => row.place?.slug === options.placeSlug);
  }

  return rows;
}

export async function getArticleBySlug(
  slug: string,
): Promise<ArticleWithRelations | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("articles")
    .select(FULL_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    logQueryError(`getArticleBySlug(${slug})`, error);
    return null;
  }

  return (data as unknown as ArticleWithRelations) ?? null;
}

/** Slugs for generateStaticParams and the sitemap. */
export async function listArticleSlugs(): Promise<string[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("articles")
    .select("slug")
    .eq("status", "published");

  if (error) {
    logQueryError("listArticleSlugs", error);
    return [];
  }

  return ((data ?? []) as { slug: string }[]).map((row) => row.slug);
}

/**
 * Reads an article regardless of status, using the caller's own session.
 *
 * This is what admin preview uses. It does NOT bypass RLS — the admin policy on
 * `articles` is what admits the draft, so an anonymous request through the same
 * code path still sees nothing.
 */
export async function getArticleForPreview(
  id: string,
  supabase: SupabaseClient,
): Promise<ArticleWithRelations | null> {
  const { data } = await supabase
    .from("articles")
    .select(FULL_SELECT)
    .eq("id", id)
    .maybeSingle();

  return (data as unknown as ArticleWithRelations) ?? null;
}

export type { Article };
