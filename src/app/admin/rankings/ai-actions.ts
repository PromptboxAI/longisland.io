"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { generateStructured } from "@/lib/ai/provider";
import {
  entryCopyPrompt,
  entryCopySchema,
  rankingCopyPrompt,
  rankingCopySchema,
} from "@/lib/ai/prompts";
import {
  assessEvidence,
  fetchBusinessDetail,
  fetchReviewExcerpts,
  type BusinessResearch,
} from "@/lib/ai/research";

/**
 * AI drafting for rankings.
 *
 * Everything here produces a DRAFT into normal editable fields. Nothing
 * publishes, and nothing overwrites text an editor has already written unless
 * they explicitly ask for it — the whole point is that a VA can generate, read,
 * correct and only then publish.
 *
 * Kept apart from `actions.ts` because the drafting layer has a different
 * failure mode: a save that fails is an error, a draft that fails is a shrug.
 */

export type AiActionState = {
  ok?: boolean;
  error?: string;
  /** Per-entry outcome for the bulk run, so failures are visible individually. */
  results?: { entryId: string; name: string; status: "written" | "skipped" | "failed"; detail?: string }[];
};

/* -------------------------------------------------------------------------- */
/* Research assembly                                                           */
/* -------------------------------------------------------------------------- */

type EntryRow = {
  id: string;
  position: number;
  best_for: string | null;
  editorial_reason: string | null;
  editor_notes: string | null;
  badge: string | null;
  business: {
    id: string;
    name: string;
    city: string | null;
    address: string | null;
    county: string | null;
    subcategory: string | null;
    description: string | null;
    editorial_summary: string | null;
  };
};

/**
 * Gathers what the model may know about one business.
 *
 * The Yelp identifier comes from `external_business_refs`, which is the only
 * thing we persist from a search — so a business added by hand simply has no
 * excerpts, and the draft is thinner and says so.
 */
async function buildResearch(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  entry: EntryRow,
  rankingPlaceName: string | null,
): Promise<BusinessResearch> {
  const { data: ref } = await supabase
    .from("external_business_refs")
    .select("external_id, provider")
    .eq("business_id", entry.business.id)
    .eq("provider", "yelp")
    .maybeSingle();

  const externalId = (ref as { external_id: string } | null)?.external_id ?? null;
  const excerpts = externalId ? await fetchReviewExcerpts(externalId) : [];

  return {
    name: entry.business.name,
    city: entry.business.city,
    address: entry.business.address,
    county: entry.business.county,
    categories: entry.business.subcategory ? [entry.business.subcategory] : [],
    // Never persisted, so never available here. Stated explicitly rather than
    // left as an accidental null.
    yelpRating: null,
    yelpReviewCount: null,
    excerpts,
    description: entry.business.description,
    editorialSummary: entry.business.editorial_summary,
    editorNotes: entry.editor_notes,
    inRankingArea:
      rankingPlaceName && entry.business.city
        ? entry.business.city.trim().toLowerCase() ===
          rankingPlaceName.trim().toLowerCase()
        : null,
  };
}

const RANKING_SELECT =
  "id, title, geography, category:categories(name), place:places(name), " +
  "entries:ranking_entries(id, position, best_for, editorial_reason, editor_notes, badge, " +
  "business:businesses(id, name, city, address, county, subcategory, description, editorial_summary))";

type RankingRow = {
  id: string;
  title: string;
  geography: string | null;
  category: { name: string } | null;
  place: { name: string } | null;
  entries: EntryRow[];
};

async function loadRanking(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  rankingId: string,
): Promise<RankingRow | null> {
  const { data } = await supabase
    .from("rankings")
    .select(RANKING_SELECT)
    .eq("id", rankingId)
    .maybeSingle();

  return (data as unknown as RankingRow) ?? null;
}

/* -------------------------------------------------------------------------- */
/* One entry                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Drafts Best for and Why we picked it for a single entry.
 *
 * Writes straight into the entry's fields, which is what makes the result
 * editable and autosaved like anything else the editor typed.
 */
export async function generateEntryCopy(
  rankingId: string,
  entryId: string,
  options: { overwrite?: boolean } = {},
): Promise<AiActionState> {
  const { supabase } = await requireAdmin();

  const ranking = await loadRanking(supabase, rankingId);
  if (!ranking) return { error: "That ranking could not be loaded." };

  const entry = ranking.entries.find((e) => e.id === entryId);
  if (!entry) return { error: "That entry is not on this ranking." };

  const research = await buildResearch(supabase, entry, ranking.place?.name ?? null);
  const evidence = assessEvidence(research);

  const result = await generateStructured(
    entryCopySchema,
    entryCopyPrompt({
      rankingTitle: ranking.title,
      categoryName: ranking.category?.name ?? null,
      geography: ranking.geography,
      position: entry.position,
      totalEntries: ranking.entries.length,
      research,
      evidence,
    }),
  );

  if (!result.ok) return { error: result.error };

  /*
   * Never clobber an editor. A field with text in it is left alone unless the
   * editor asked for a regenerate — which is the difference between "fill in
   * the blanks" and "throw away my afternoon".
   */
  const update: Record<string, string> = {};
  if (options.overwrite || !entry.best_for?.trim()) {
    update.best_for = result.value.bestFor;
  }
  if (options.overwrite || !entry.editorial_reason?.trim()) {
    update.editorial_reason = result.value.whyWePickedIt;
  }
  // A badge is a stronger claim than a sentence; only ever suggested into an
  // empty field, never over an editor's choice.
  if (!entry.badge && result.value.badge) {
    update.badge = result.value.badge;
  }

  if (Object.keys(update).length === 0) {
    return {
      ok: true,
      results: [
        { entryId, name: entry.business.name, status: "skipped", detail: "already written" },
      ],
    };
  }

  const { error } = await supabase
    .from("ranking_entries")
    .update(update)
    .eq("id", entryId);

  if (error) return { error: "The draft could not be saved." };

  revalidatePath(`/admin/rankings/${rankingId}`);
  return {
    ok: true,
    results: [
      {
        entryId,
        name: entry.business.name,
        status: "written",
        detail: `${result.value.confidence} confidence · ${result.value.basis}`,
      },
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* Every entry                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Drafts copy across a whole ranking.
 *
 * `mode` decides what it touches. "missing" fills empty fields and leaves
 * everything else; "selected" regenerates exactly the entries named, overwriting
 * them, because that is what asking for a regenerate means.
 *
 * Sequential rather than parallel: ten concurrent calls is a rate limit, and a
 * bulk run that half-fails is worse than one that takes a few seconds longer.
 * Each entry reports its own outcome so a failure is attributable.
 */
export async function generateAllEntryCopy(
  rankingId: string,
  mode: "missing" | "all" | "selected",
  entryIds: string[] = [],
): Promise<AiActionState> {
  const { supabase } = await requireAdmin();

  const ranking = await loadRanking(supabase, rankingId);
  if (!ranking) return { error: "That ranking could not be loaded." };

  /*
   * Three modes, kept distinct because they differ in what they destroy.
   * "missing" fills blanks and touches nothing else. "all" and "selected"
   * overwrite, which is what asking for a regenerate means — so neither is
   * reachable by accident from a button labelled "generate".
   */
  const targets =
    mode === "selected"
      ? ranking.entries.filter((e) => entryIds.includes(e.id))
      : mode === "all"
        ? ranking.entries
        : ranking.entries.filter(
            (e) => !e.best_for?.trim() || !e.editorial_reason?.trim(),
          );

  if (targets.length === 0) {
    return { ok: true, results: [] };
  }

  const results: NonNullable<AiActionState["results"]> = [];

  for (const entry of targets) {
    const outcome = await generateEntryCopy(rankingId, entry.id, {
      overwrite: mode !== "missing",
    });

    if (outcome.error) {
      results.push({
        entryId: entry.id,
        name: entry.business.name,
        status: "failed",
        detail: outcome.error,
      });
      continue;
    }
    results.push(...(outcome.results ?? []));
  }

  revalidatePath(`/admin/rankings/${rankingId}`);
  return { ok: true, results };
}

/* -------------------------------------------------------------------------- */
/* The ranking itself                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Drafts the dek, intro and methodology.
 *
 * The methodology is the one a reader uses to decide whether to trust the list,
 * so the prompt spells out what we actually do rather than leaving the model to
 * guess — and never lets it say a third party chose the list.
 */
export async function generateRankingCopy(
  rankingId: string,
  options: { overwrite?: boolean } = {},
): Promise<AiActionState> {
  const { supabase } = await requireAdmin();

  const ranking = await loadRanking(supabase, rankingId);
  if (!ranking) return { error: "That ranking could not be loaded." };

  const { data: current } = await supabase
    .from("rankings")
    .select("description, intro, methodology")
    .eq("id", rankingId)
    .maybeSingle();

  const existing = current as {
    description: string | null;
    intro: string | null;
    methodology: string | null;
  } | null;

  const ordered = [...ranking.entries].sort((a, b) => a.position - b.position);

  const result = await generateStructured(
    rankingCopySchema,
    rankingCopyPrompt({
      title: ranking.title,
      categoryName: ranking.category?.name ?? null,
      geography: ranking.geography,
      entries: ordered.map((e) => ({
        position: e.position,
        name: e.business.name,
        city: e.business.city,
        bestFor: e.best_for,
      })),
      editorNotes: ordered
        .map((e) => e.editor_notes)
        .filter((n): n is string => Boolean(n?.trim())),
    }),
  );

  if (!result.ok) return { error: result.error };

  const update: Record<string, string> = {};
  if (options.overwrite || !existing?.description?.trim()) {
    update.description = result.value.dek;
  }
  if (options.overwrite || !existing?.intro?.trim()) {
    update.intro = result.value.intro;
  }
  if (options.overwrite || !existing?.methodology?.trim()) {
    update.methodology = result.value.methodology;
  }

  if (Object.keys(update).length === 0) {
    return { ok: true, results: [] };
  }

  const { error } = await supabase.from("rankings").update(update).eq("id", rankingId);
  if (error) return { error: "The draft could not be saved." };

  revalidatePath(`/admin/rankings/${rankingId}`);
  return { ok: true };
}

/**
 * Fills in a business's own website from the Yelp detail record.
 *
 * Worth being precise about what this is. Yelp's `url` is a link to Yelp; the
 * business's real site arrives separately, as `attributes.business_url`, and
 * that is the only thing taken here. A web address is a fact about the
 * business, not Yelp's writing, so unlike review excerpts it can be stored.
 *
 * The point of storing it is what it unlocks: an editor with the real site can
 * check a menu, an opening time or a claim before publishing a judgement about
 * the place. It does not by itself make the AI research context any better.
 */
export async function fetchOfficialWebsite(
  businessId: string,
  rankingId: string,
): Promise<{ website?: string | null; error?: string; detail?: string }> {
  const { supabase } = await requireAdmin();

  const { data: ref } = await supabase
    .from("external_business_refs")
    .select("external_id")
    .eq("business_id", businessId)
    .eq("provider", "yelp")
    .maybeSingle();

  const externalId = (ref as { external_id: string } | null)?.external_id ?? null;
  if (!externalId) {
    return { detail: "No Yelp match on this business, so there is nothing to look up." };
  }

  const detail = await fetchBusinessDetail(externalId);
  if (!detail) return { error: "Could not reach Yelp just now. Try again shortly." };

  if (!detail.websiteUrl) {
    return { detail: "Yelp has no website on file for this business." };
  }

  const { error } = await supabase
    .from("businesses")
    .update({ website: detail.websiteUrl })
    .eq("id", businessId);

  if (error) return { error: "Found the site but could not save it." };

  revalidatePath(`/admin/rankings/${rankingId}`);
  return { website: detail.websiteUrl, detail: `Saved ${detail.websiteUrl}` };
}
