import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

/**
 * Every public path a ranking's copy appears on.
 *
 * Extracted from the ranking actions because the AI apply path needed it too
 * and did not have it. Applying a reviewed draft to a short field wrote the new
 * text live and then refreshed only the admin screen, so the editor saw their
 * change and readers kept the old one until ISR expired an hour later. The
 * write was correct; the silence afterwards was the bug.
 *
 * It could only ever be caught on a deployed build: `revalidatePath` is close
 * to a no-op in dev, where nothing is cached to begin with.
 *
 * A dek shows on the ranking, on /best, on the homepage and on its category and
 * place pages, so refreshing one of those and not the rest would leave the same
 * sentence current in one place and stale in four.
 */
export async function revalidateRankingPaths(
  supabase: SupabaseClient,
  rankingId: string,
): Promise<void> {
  const { data } = await supabase
    .from("rankings")
    .select("slug, category:categories(slug), place:places(slug)")
    .eq("id", rankingId)
    .maybeSingle();

  const row = data as {
    slug?: string;
    category?: { slug?: string } | null;
    place?: { slug?: string } | null;
  } | null;

  revalidatePath(`/admin/rankings/${rankingId}`);
  revalidatePath("/admin/rankings");
  revalidateRankingScope({
    slug: row?.slug,
    categorySlug: row?.category?.slug,
    placeSlug: row?.place?.slug,
  });
}

/**
 * The public surfaces, given what is already known about the ranking.
 *
 * Separate from the read above so deletion can use it: the row is gone by the
 * time the paths need clearing, so the slug has to be captured beforehand.
 */
export function revalidateRankingScope(scope: {
  slug?: string | null;
  categorySlug?: string | null;
  placeSlug?: string | null;
}): void {
  if (scope.slug) revalidatePath(`/best/${scope.slug}`);
  revalidatePath("/best");
  revalidatePath("/");
  if (scope.categorySlug) revalidatePath(`/category/${scope.categorySlug}`);
  if (scope.placeSlug) revalidatePath(`/place/${scope.placeSlug}`);

  /*
   * Every OTHER ranking page, because each one ends in Related Rankings.
   *
   * Unpublishing a ranking cleared its own page and left it on display in the
   * related rail of every ranking that listed it — three dead cards linking to
   * three 404s, for the hour it took ISR to expire. Clearing the record's own
   * URL was never enough; the pages that merely MENTION it are stale too.
   *
   * The category and place patterns are here for the same reason in a different
   * shape: moving a ranking to another category leaves it listed on the old
   * one, and that page's own path is no longer derivable from the row.
   *
   * A route pattern marks matching pages stale rather than rebuilding them, so
   * the cost is paid on the next visit to each, not here.
   */
  revalidatePath("/best/[slug]", "page");
  revalidatePath("/category/[slug]", "page");
  revalidatePath("/place/[slug]", "page");
}
