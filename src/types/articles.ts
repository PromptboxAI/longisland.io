import type { Category, Place, PublishStatus } from "@/types/database";
import type { MediaAsset } from "@/types/media";

/**
 * Articles — the generic editorial content type.
 *
 * A seasonal guide, a weekend feature, an event roundup or a news piece. Not a
 * ranking (which is a list of businesses with positions) and not a product
 * guide (which is an article about things you can buy). Those two already have
 * their own tables; this is for everything else we publish.
 */

export type ArticleKind =
  | "article"
  | "guide"
  | "feature"
  | "seasonal"
  | "news"
  | "deal"
  | "roundup";

export const ARTICLE_KINDS: { value: ArticleKind; label: string; note: string }[] = [
  { value: "article", label: "Article", note: "The general case." },
  { value: "guide", label: "Guide", note: "How to do or find something here." },
  { value: "feature", label: "Feature", note: "A longer editorial piece." },
  { value: "seasonal", label: "Seasonal", note: "Tied to a time of year." },
  { value: "news", label: "News", note: "Something that just happened." },
  { value: "deal", label: "Deal", note: "An offer worth knowing about." },
  { value: "roundup", label: "Roundup", note: "Events or things, collected." },
];

export interface Article {
  id: string;
  title: string;
  slug: string;
  kind: ArticleKind;
  category_id: string | null;
  place_id: string | null;
  dek: string | null;
  body: string | null;
  hero_media_id: string | null;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  author_name: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_media_id: string | null;
  status: PublishStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** An article joined to what it needs to render. */
export interface ArticleWithRelations extends Article {
  category: Pick<Category, "id" | "name" | "slug"> | null;
  place: Pick<Place, "id" | "name" | "slug"> | null;
  hero_media: MediaAsset | null;
  og_media: MediaAsset | null;
}

/** Minimal shape for index cards and rails. */
export interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  kind: ArticleKind;
  dek: string | null;
  author_name: string | null;
  published_at: string | null;
  updated_at: string;
  category: Pick<Category, "name" | "slug"> | null;
  place: Pick<Place, "name" | "slug"> | null;
  hero_media: MediaAsset | null;
  hero_image_url: string | null;
}

/** Label shown as the card kicker when there is no category. */
export function articleKindLabel(kind: ArticleKind): string {
  return ARTICLE_KINDS.find((k) => k.value === kind)?.label ?? "Article";
}
