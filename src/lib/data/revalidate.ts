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
  if (row?.slug) revalidatePath(`/best/${row.slug}`);
  revalidatePath("/best");
  revalidatePath("/");
  if (row?.category?.slug) revalidatePath(`/category/${row.category.slug}`);
  if (row?.place?.slug) revalidatePath(`/place/${row.place.slug}`);
}
