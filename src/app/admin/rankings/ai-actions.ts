"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { prunePending, splitByPolicy } from "@/lib/editorial/field-policy";
import { revalidateRankingPaths } from "@/lib/data/revalidate";
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
  results?: {
    entryId: string;
    name: string;
    status: "staged" | "skipped" | "failed";
    detail?: string;
    /**
     * The proposal itself, for the review panel.
     *
     * It comes back to the browser rather than being written anywhere, because
     * nothing generated may touch an editorial field before a person has read
     * it. It is also persisted to `ai_draft` so a reload does not lose a
     * batch of ten.
     */
    draft?: StagedEntryDraft;
  }[];
};

/** One AI proposal for one entry, awaiting review. */
export type StagedEntryDraft = {
  bestFor?: string;
  whyWePickedIt?: string;
  badge?: string;
  /** The model's own account of what it had to work with. */
  basis: string;
  confidence: string;
};

/** One AI proposal for the ranking itself. */
export type StagedRankingDraft = {
  dek?: string;
  intro?: string;
  methodology?: string;
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
   * Staged, never written.
   *
   * This function used to update the editorial fields directly, which on a
   * published ranking put AI copy in front of readers before a human had read
   * a word of it. Now it produces a proposal: stored in `ai_draft`, shown in a
   * review panel, and moved into the real fields only by an editor pressing
   * Apply.
   *
   * The overwrite rule survives the change and still matters — it decides what
   * the proposal even covers. A field an editor has already written is left
   * out of the draft entirely unless a regenerate was asked for, so "fill in
   * the blanks" cannot quietly become "throw away my afternoon".
   */
  const draft: StagedEntryDraft = {
    basis: result.value.basis,
    confidence: result.value.confidence,
  };

  if (options.overwrite || !entry.best_for?.trim()) {
    draft.bestFor = result.value.bestFor;
  }
  if (options.overwrite || !entry.editorial_reason?.trim()) {
    draft.whyWePickedIt = result.value.whyWePickedIt;
  }
  // A badge is a stronger claim than a sentence; only ever proposed into an
  // empty field, never over an editor's choice.
  if (!entry.badge && result.value.badge) {
    draft.badge = result.value.badge;
  }

  const proposesSomething =
    draft.bestFor !== undefined ||
    draft.whyWePickedIt !== undefined ||
    draft.badge !== undefined;

  if (!proposesSomething) {
    return {
      ok: true,
      results: [
        {
          entryId,
          name: entry.business.name,
          status: "skipped",
          detail: "editorial copy already exists",
        },
      ],
    };
  }

  const { error } = await supabase
    .from("ranking_entries")
    .update({ ai_draft: draft })
    .eq("id", entryId);

  if (error) return { error: "The draft could not be saved for review." };

  revalidatePath(`/admin/rankings/${rankingId}`);
  return {
    ok: true,
    results: [
      {
        entryId,
        name: entry.business.name,
        status: "staged",
        detail: `${result.value.confidence} confidence · ${result.value.basis}`,
        draft,
      },
    ],
  };
}

/**
 * Moves a reviewed AI draft into the editorial fields.
 *
 * Takes the values from the panel rather than from `ai_draft`, because the
 * editor may have corrected a phrase before applying and the corrected version
 * is the one that matters.
 *
 * From here the ordinary field policy applies: on a published ranking the
 * long-form reason becomes a pending change rather than going live, so AI copy
 * passes two gates before a reader sees it — a person approving the text, and a
 * person deciding to publish it.
 */
export async function applyEntryDraft(
  rankingId: string,
  entryId: string,
  values: { bestFor?: string; whyWePickedIt?: string; badge?: string },
): Promise<AiActionState> {
  const { supabase } = await requireAdmin();

  const { data, error: readError } = await supabase
    .from("ranking_entries")
    .select("editorial_reason, pending_changes, ranking:rankings(status)")
    .eq("id", entryId)
    .single();

  if (readError || !data) return { error: "That entry could not be loaded." };

  const row = data as unknown as {
    editorial_reason: string | null;
    pending_changes: Record<string, string> | null;
    ranking: { status: string } | null;
  };

  const isPublished = row.ranking?.status === "published";

  const proposed: Record<string, string> = {};
  if (values.bestFor !== undefined) proposed.best_for = values.bestFor;
  if (values.badge !== undefined) proposed.badge = values.badge;
  if (values.whyWePickedIt !== undefined) {
    proposed.editorial_reason = values.whyWePickedIt;
  }

  const { live, pending } = splitByPolicy("ranking_entry", proposed, isPublished);

  const update: Record<string, unknown> = { ai_draft: null };
  for (const [field, value] of Object.entries(live)) update[field] = value || null;

  if (isPublished) {
    const merged = prunePending(
      { ...(row.pending_changes ?? {}), ...pending },
      { editorial_reason: row.editorial_reason },
    );
    update.pending_changes = Object.keys(merged).length > 0 ? merged : null;
  }

  const { error } = await supabase
    .from("ranking_entries")
    .update(update)
    .eq("id", entryId);

  if (error) return { error: "Could not apply that draft." };

  /*
   * The public pages too, not just this screen.
   *
   * A short field applied from a draft goes live immediately, and refreshing
   * only the admin view left the editor looking at their change while readers
   * kept the old one for an hour. Cheap to do unconditionally: a record that
   * staged everything simply has nothing to refresh.
   */
  await revalidateRankingPaths(supabase, rankingId);
  return { ok: true };
}

/** Throws a proposal away. Nothing editorial was ever touched. */
export async function discardEntryDraft(
  rankingId: string,
  entryId: string,
): Promise<AiActionState> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("ranking_entries")
    .update({ ai_draft: null })
    .eq("id", entryId);

  if (error) return { error: "Could not discard that draft." };

  revalidatePath(`/admin/rankings/${rankingId}`);
  return { ok: true };
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

  /*
   * Entries the run deliberately left alone, reported rather than omitted.
   *
   * "2 drafts ready" on a ten-entry ranking reads like a failure until you know
   * eight were skipped on purpose. The skip is the reassurance that manual copy
   * was not touched, so it belongs in the summary — not inferred from a count
   * that does not add up.
   */
  const skipped = ranking.entries
    .filter((entry) => !targets.some((target) => target.id === entry.id))
    .map((entry) => ({
      entryId: entry.id,
      name: entry.business.name,
      status: "skipped" as const,
      detail: "editorial copy already exists",
    }));

  if (targets.length === 0) {
    return { ok: true, results: skipped };
  }

  const results: NonNullable<AiActionState["results"]> = [...skipped];

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

  /*
   * Staged, exactly as the per-entry drafting is.
   *
   * The dek, intro and methodology are the paragraphs a reader uses to decide
   * whether to trust the list. They are the last three fields that should ever
   * appear on a published page without a person having read them.
   */
  const draft: StagedRankingDraft = {};
  if (options.overwrite || !existing?.description?.trim()) {
    draft.dek = result.value.dek;
  }
  if (options.overwrite || !existing?.intro?.trim()) {
    draft.intro = result.value.intro;
  }
  if (options.overwrite || !existing?.methodology?.trim()) {
    draft.methodology = result.value.methodology;
  }

  if (Object.keys(draft).length === 0) {
    return { ok: true, results: [] };
  }

  const { error } = await supabase
    .from("rankings")
    .update({ ai_draft: draft })
    .eq("id", rankingId);
  if (error) return { error: "The draft could not be saved for review." };

  revalidatePath(`/admin/rankings/${rankingId}`);
  return { ok: true };
}

/**
 * Moves a reviewed ranking-level draft into the editorial fields.
 *
 * As with an entry, the values come from the review panel rather than from
 * `ai_draft`, so a phrase the editor corrected is the one that lands. And as
 * with an entry, the field policy takes over from there: on a published ranking
 * all three of these are long-form, so they become pending changes and wait for
 * Update live page.
 */
export async function applyRankingDraft(
  rankingId: string,
  values: { dek?: string; intro?: string; methodology?: string },
): Promise<AiActionState> {
  const { supabase } = await requireAdmin();

  const { data, error: readError } = await supabase
    .from("rankings")
    .select("status, description, intro, methodology, pending_changes")
    .eq("id", rankingId)
    .single();

  if (readError || !data) return { error: "That ranking could not be loaded." };

  const row = data as unknown as {
    status: string;
    description: string | null;
    intro: string | null;
    methodology: string | null;
    pending_changes: Record<string, string> | null;
  };

  const isPublished = row.status === "published";

  const proposed: Record<string, string> = {};
  if (values.dek !== undefined) proposed.description = values.dek;
  if (values.intro !== undefined) proposed.intro = values.intro;
  if (values.methodology !== undefined) proposed.methodology = values.methodology;

  const { live, pending } = splitByPolicy("ranking", proposed, isPublished);

  const update: Record<string, unknown> = { ai_draft: null };
  for (const [field, value] of Object.entries(live)) update[field] = value || null;

  if (isPublished) {
    const merged = prunePending(
      { ...(row.pending_changes ?? {}), ...pending },
      {
        description: row.description,
        intro: row.intro,
        methodology: row.methodology,
      },
    );
    update.pending_changes = Object.keys(merged).length > 0 ? merged : null;
  }

  const { error } = await supabase.from("rankings").update(update).eq("id", rankingId);
  if (error) return { error: "Could not apply that draft." };

  /*
   * The public pages too, not just this screen.
   *
   * A short field applied from a draft goes live immediately, and refreshing
   * only the admin view left the editor looking at their change while readers
   * kept the old one for an hour. Cheap to do unconditionally: a record that
   * staged everything simply has nothing to refresh.
   */
  await revalidateRankingPaths(supabase, rankingId);
  return { ok: true };
}

/** Throws away the ranking-level proposal. Nothing editorial was touched. */
export async function discardRankingDraft(
  rankingId: string,
): Promise<AiActionState> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("rankings")
    .update({ ai_draft: null })
    .eq("id", rankingId);

  if (error) return { error: "Could not discard that draft." };

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
