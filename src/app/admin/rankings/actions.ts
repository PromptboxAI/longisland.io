"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { businessSlug, slugify, uniqueSlug } from "@/lib/slug";
import { prunePending, splitByPolicy } from "@/lib/editorial/field-policy";
import {
  revalidateRankingPaths,
  revalidateRankingScope,
} from "@/lib/data/revalidate";

/**
 * Ranking editor mutations.
 *
 * Every action re-checks the session through requireAdmin() — a Server Action
 * is a public HTTP endpoint, so it cannot rely on the page around it having
 * been authorised. RLS is the final boundary underneath.
 */

const detailsSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(4).max(200),
  slug: z.string().trim().min(3).max(100),
  categoryId: z.string().uuid().nullable(),
  placeId: z.string().uuid().nullable(),
  geography: z.string().trim().max(120),
  description: z.string().trim().max(500),
  intro: z.string().trim().max(5000),
  methodology: z.string().trim().max(5000),
  authorName: z.string().trim().max(120),
  heroMediaId: z.string().uuid().nullable(),
  heroImageUrl: z.string().trim().max(500),
  ogImageMediaId: z.string().uuid().nullable(),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(200),
});

export type ActionState = {
  ok?: boolean;
  error?: string;
  /**
   * True when a save staged long-form text instead of publishing it.
   *
   * The indicator needs this to say "Changes not live" rather than "Saved —
   * Live", and it cannot work it out for itself: only the action knows both
   * the record's status and which fields the policy sent where.
   */
  pending?: boolean;
  /**
   * Which fields are staged after this save, by column name.
   *
   * Returned rather than re-read from the server because a Server Action called
   * as a plain function does not refresh the router — so the pending bar would
   * otherwise not appear until the editor reloaded, which is exactly when they
   * would assume their edit had gone live.
   */
  stagedFields?: string[];
  /** How many entries went with a deleted ranking, for the confirmation. */
  deletedEntryCount?: number;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readUuidOrNull(formData: FormData, key: string): string | null {
  const value = readString(formData, key).trim();
  return value.length > 0 ? value : null;
}

export async function saveRankingDetails(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const parsed = detailsSchema.safeParse({
    id: readString(formData, "id"),
    title: readString(formData, "title"),
    slug: readString(formData, "slug"),
    categoryId: readUuidOrNull(formData, "categoryId"),
    placeId: readUuidOrNull(formData, "placeId"),
    geography: readString(formData, "geography"),
    description: readString(formData, "description"),
    intro: readString(formData, "intro"),
    methodology: readString(formData, "methodology"),
    authorName: readString(formData, "authorName"),
    heroMediaId: readUuidOrNull(formData, "heroMediaId"),
    heroImageUrl: readString(formData, "heroImageUrl"),
    ogImageMediaId: readUuidOrNull(formData, "ogImageMediaId"),
    seoTitle: readString(formData, "seoTitle"),
    seoDescription: readString(formData, "seoDescription"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const data = parsed.data;

  // Read the slug before the write: after it there is no record of the URL the
  // page used to live at, and that path stays cached serving the old content.
  const { data: before } = await supabase
    .from("rankings")
    .select("slug, status, description, intro, methodology, pending_changes")
    .eq("id", data.id)
    .maybeSingle();
  const previous = before as {
    slug: string;
    status: string;
    description: string | null;
    intro: string | null;
    methodology: string | null;
    pending_changes: Record<string, string> | null;
  } | null;

  const isPublished = previous?.status === "published";

  /*
   * The dek, the intro and the methodology are paragraphs. On a published
   * ranking they autosave into `pending_changes` and wait for a deliberate
   * "Update live page", because a 900ms pause in the middle of a sentence is
   * not a decision to publish it. Everything else — title, slug, category,
   * images, SEO — writes through: none of them has a half-typed state that
   * reads as a broken sentence to a reader.
   */
  const { live, pending } = splitByPolicy(
    "ranking",
    {
      description: data.description,
      intro: data.intro,
      methodology: data.methodology,
    },
    isPublished,
  );

  const update: Record<string, unknown> = {
    title: data.title,
    slug: slugify(data.slug),
    category_id: data.categoryId,
    place_id: data.placeId,
    geography: data.geography || null,
    author_name: data.authorName || null,
    hero_media_id: data.heroMediaId,
    // The uploaded asset wins; the pasted URL only survives when there is no
    // asset, which is what the field itself enforces on the client too.
    hero_image_url: data.heroMediaId ? null : data.heroImageUrl || null,
    og_image_media_id: data.ogImageMediaId,
    seo_title: data.seoTitle || null,
    seo_description: data.seoDescription || null,
  };

  for (const [field, value] of Object.entries(live)) update[field] = value || null;

  // Pruned, for the same reason as an entry: every save carries every field.
  let staged: Record<string, string> = {};

  if (isPublished) {
    // Merged, not replaced: an intro staged a minute ago is still waiting when
    // the methodology is staged now.
    staged = prunePending(
      { ...(previous?.pending_changes ?? {}), ...pending },
      {
        description: previous?.description ?? null,
        intro: previous?.intro ?? null,
        methodology: previous?.methodology ?? null,
      },
    );
    update.pending_changes = Object.keys(staged).length > 0 ? staged : null;
  } else {
    update.pending_changes = null;
  }

  const { error } = await supabase.from("rankings").update(update).eq("id", data.id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That slug is already in use by another ranking."
          : "Could not save. Please try again.",
    };
  }

  /*
   * A published ranking stays editable — edits go straight to the live record
   * and the public pages refresh, rather than requiring an unpublish and a
   * republish to fix a typo. That means every save has to reach everywhere the
   * ranking appears, not just its own page.
   */
  const nextSlug = slugify(data.slug);

  revalidatePath(`/admin/rankings/${data.id}`);
  revalidatePath("/admin/rankings");
  if (previous?.slug && previous.slug !== nextSlug) {
    // The old URL now has no page behind it; leaving it cached would serve the
    // moved content from an address that no longer resolves.
    revalidatePath(`/best/${previous.slug}`);
  }

  // The dek and hero show on its category and place pages, and its title shows
  // in the related rail of every other ranking.
  await revalidateRankingPaths(supabase, data.id);

  return {
    ok: true,
    pending: Object.keys(staged).length > 0,
    stagedFields: Object.keys(staged),
  };
}

/**
 * Publishes a ranking and everything it needs to actually be readable.
 *
 * Publishing a ranking whose businesses are all drafts produced a ranking
 * marked PUBLISHED that rendered "no published entries" — technically correct
 * under RLS and useless to an editor, who selected those businesses and then
 * pressed Publish. A CMS must not present something as published while knowing
 * it shows nothing.
 *
 * The draft gate on researched businesses still matters — nothing reaches the
 * site straight from a third-party search — so this does not remove it. It
 * makes clearing it part of the same deliberate act, named in the button.
 */
export async function publishRankingWithBusinesses(
  id: string,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const { data: entries } = await supabase
    .from("ranking_entries")
    .select("business_id")
    .eq("ranking_id", id);

  const businessIds = ((entries ?? []) as { business_id: string }[]).map(
    (entry) => entry.business_id,
  );

  if (businessIds.length > 0) {
    const { error: businessError } = await supabase
      .from("businesses")
      .update({ status: "published" })
      .in("id", businessIds)
      .neq("status", "published");

    if (businessError) {
      return { error: "Could not publish the businesses on this list." };
    }
  }

  await setRankingStatus(id, "published");
  return { ok: true };
}

export async function setRankingStatus(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<void> {
  const { supabase } = await requireAdmin();

  const { data: current } = await supabase
    .from("rankings")
    .select("published_at, slug, status, pending_changes")
    .eq("id", id)
    .maybeSingle();

  const previous = current as {
    published_at: string | null;
    slug: string | null;
    status: string;
    pending_changes: Record<string, string> | null;
  } | null;

  /*
   * Unpublishing folds staged text into the real fields.
   *
   * Staging exists to keep half-typed prose off a public page. Once the page
   * is not public there is nothing to protect, and a draft has no Update live
   * page button — so leaving text staged would strand an editor's newest work
   * behind a control that is no longer on screen. Folding it in loses nothing:
   * it is what the editor typed, and it is now on a page nobody can read.
   */
  const leavingPublished = previous?.status === "published" && status !== "published";
  const fold: Record<string, unknown> = {};

  if (leavingPublished && previous?.pending_changes) {
    for (const [field, value] of Object.entries(previous.pending_changes)) {
      fold[field] = value || null;
    }
    fold.pending_changes = null;
  }

  await supabase
    .from("rankings")
    .update({
      ...fold,
      status,
      // Stamp the first publication only, so re-publishing an edit does not
      // reset the article's original date.
      published_at:
        status === "published" && !previous?.published_at
          ? new Date().toISOString()
          : (previous?.published_at ?? null),
    })
    .eq("id", id);

  /*
   * The entries carry their own staged text, and it needs the same treatment
   * for the same reason. Applied with the values already in the column so one
   * statement covers every entry, rather than a read and a write per row.
   *
   * `ai_draft` is deliberately untouched by all of this. A proposal awaiting
   * review is still awaiting review whether or not the page is public, and
   * publishing must never be a way for generated copy to slip past a person.
   */
  if (leavingPublished) {
    const { data: staged } = await supabase
      .from("ranking_entries")
      .select("id, pending_changes")
      .eq("ranking_id", id)
      .not("pending_changes", "is", null);

    for (const row of (staged ?? []) as {
      id: string;
      pending_changes: Record<string, string> | null;
    }[]) {
      const update: Record<string, unknown> = { pending_changes: null };
      for (const [field, value] of Object.entries(row.pending_changes ?? {})) {
        update[field] = value || null;
      }
      await supabase.from("ranking_entries").update(update).eq("id", row.id);
    }
  }

  /*
   * The shared list, not a shorter one written out again here.
   *
   * This hand-rolled copy had drifted: it cleared the ranking's own page and
   * the two indexes, but never its category or place page, and never the other
   * ranking pages that list it as related. Unpublishing therefore took a
   * ranking off its own URL while leaving it on display elsewhere.
   */
  await revalidateRankingPaths(supabase, id);
}

const entrySchema = z.object({
  entryId: z.string().uuid(),
  editorialReason: z.string().trim().max(2000),
  bestFor: z.string().trim().max(200),
  badge: z.string().trim().max(60),
  editorNotes: z.string().trim().max(2000),
});

export async function saveEntry(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const parsed = entrySchema.safeParse({
    entryId: readString(formData, "entryId"),
    editorialReason: readString(formData, "editorialReason"),
    bestFor: readString(formData, "bestFor"),
    badge: readString(formData, "badge"),
    editorNotes: readString(formData, "editorNotes"),
  });

  if (!parsed.success) {
    return { error: "Could not save that entry." };
  }

  const rankingId = readString(formData, "rankingId");

  /*
   * Where each field lands depends on whether readers can see it.
   *
   * On a draft ranking everything writes straight through — there is no public
   * page to protect, and staging would only add a step. On a published one the
   * long-form fields go to `pending_changes` instead, because the autosave
   * fires 900ms after you stop typing and that is about the length of a pause
   * mid-sentence. Short fields still write live: there is no half-typed state
   * of a badge that reads as a broken sentence.
   */
  const { data: entryRow, error: readError } = await supabase
    .from("ranking_entries")
    .select("editorial_reason, pending_changes, ranking:rankings(status)")
    .eq("id", parsed.data.entryId)
    .single();

  if (readError || !entryRow) return { error: "Could not save that entry." };

  const row = entryRow as unknown as {
    editorial_reason: string | null;
    pending_changes: Record<string, string> | null;
    ranking: { status: string } | null;
  };

  const isPublished = row.ranking?.status === "published";

  const { live, pending } = splitByPolicy(
    "ranking_entry",
    {
      editorial_reason: parsed.data.editorialReason,
      best_for: parsed.data.bestFor,
      badge: parsed.data.badge,
      editor_notes: parsed.data.editorNotes,
    },
    isPublished,
  );

  const update: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(live)) update[field] = value || null;

  /*
   * `staged` is the PRUNED set, not the split one.
   *
   * The autosave sends every field on every save, so the long-form ones are
   * always in the pending half whether or not they were touched. Reporting on
   * that told an editor changing a badge that their changes were not live —
   * true of nothing, and alarming about a field they had not typed in.
   * Pruning against the live values is what makes it mean "actually different".
   */
  let staged: Record<string, string> = {};

  if (isPublished) {
    // Merge rather than replace: two fields staged at different moments are
    // both still waiting, and a save carrying only one must not drop the other.
    staged = prunePending(
      { ...(row.pending_changes ?? {}), ...pending },
      { editorial_reason: row.editorial_reason },
    );
    update.pending_changes = Object.keys(staged).length > 0 ? staged : null;
  } else {
    // Leaving a draft record cannot leave anything staged behind it.
    update.pending_changes = null;
  }

  const { error } = await supabase
    .from("ranking_entries")
    .update(update)
    .eq("id", parsed.data.entryId);

  if (error) return { error: "Could not save that entry." };

  revalidatePath(`/admin/rankings/${rankingId}`);
  return {
    ok: true,
    pending: Object.keys(staged).length > 0,
    stagedFields: Object.keys(staged),
  };
}

/**
 * Moves this entry's staged long-form text onto the public page.
 *
 * The deliberate act the pending model exists for. Everything staged is applied
 * at once — an editor thinking about "the change I made", not about which of
 * two fields it touched.
 */
export async function applyEntryChanges(
  entryId: string,
  rankingId: string,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const { data, error: readError } = await supabase
    .from("ranking_entries")
    .select("pending_changes")
    .eq("id", entryId)
    .single();

  if (readError || !data) return { error: "Could not find that entry." };

  const pending = (data as { pending_changes: Record<string, string> | null })
    .pending_changes;

  if (!pending || Object.keys(pending).length === 0) {
    return { error: "There is nothing waiting to go live." };
  }

  const update: Record<string, unknown> = { pending_changes: null };
  for (const [field, value] of Object.entries(pending)) update[field] = value || null;

  const { error } = await supabase
    .from("ranking_entries")
    .update(update)
    .eq("id", entryId);

  if (error) return { error: "Could not update the live page." };

  await revalidateRankingPaths(supabase, rankingId);
  return { ok: true, stagedFields: [] };
}

/** Throws away this entry's staged text, leaving the live page untouched. */
export async function discardEntryChanges(
  entryId: string,
  rankingId: string,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("ranking_entries")
    .update({ pending_changes: null })
    .eq("id", entryId);

  if (error) return { error: "Could not discard those changes." };

  revalidatePath(`/admin/rankings/${rankingId}`);
  return { ok: true };
}

/**
 * Moves an entry one position up or down.
 *
 * Positions are swapped through a temporary negative value because
 * (ranking_id, position) collisions would otherwise be possible mid-swap.
 */
/* -------------------------------------------------------------------------- */
/* Adding entries                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Puts a business into a ranking.
 *
 * Until now the only way a ranking gained entries was the Yelp workbench, which
 * always creates a NEW ranking from whatever the search returned. That made
 * three ordinary editorial acts impossible: adding a place Yelp does not list,
 * swapping one entry for another, and reopening a draft to change who is on it.
 * It also left `createBlankRanking` producing a ranking that could never gain a
 * single entry.
 *
 * Yelp is candidate discovery. This is the door that makes that true rather
 * than aspirational — nothing about the final list depends on what a third
 * party returned.
 *
 * The entry is appended at the end and the editor reorders from there, so
 * arrival order never quietly becomes the published order.
 */
export async function addEntry(
  rankingId: string,
  businessId: string,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const { data: existing } = await supabase
    .from("ranking_entries")
    .select("id, position, business_id")
    .eq("ranking_id", rankingId)
    .order("position");

  const rows = (existing ?? []) as { id: string; position: number; business_id: string }[];

  if (rows.some((row) => row.business_id === businessId)) {
    return { error: "That business is already on this list." };
  }

  const nextPosition = rows.length > 0 ? rows[rows.length - 1].position + 1 : 1;

  const { error } = await supabase.from("ranking_entries").insert({
    ranking_id: rankingId,
    business_id: businessId,
    position: nextPosition,
  });

  if (error) return { error: "Could not add that business." };

  revalidatePath(`/admin/rankings/${rankingId}`);
  return { ok: true };
}

const newBusinessSchema = z.object({
  name: z.string().trim().min(2).max(200),
  city: z.string().trim().max(120),
});

/**
 * Creates a business and adds it in one step.
 *
 * The case this exists for is specific: an editor knows a place belongs on the
 * list and Yelp did not return it. Making them leave for /admin/businesses,
 * create a record, come back and find it again is the kind of friction that
 * ends with the list being published without it.
 *
 * The business is created as a draft with only a name and a town — enough to
 * rank it — and the profile is filled in afterwards. Its own status still
 * governs whether it appears publicly, so an unfinished profile cannot leak
 * through a published ranking.
 */
export async function createBusinessAndAddEntry(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const rankingId = readString(formData, "rankingId");
  const parsed = newBusinessSchema.safeParse({
    name: readString(formData, "name"),
    city: readString(formData, "city"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Give the business a name." };
  }
  const d = parsed.data;

  const { data: taken } = await supabase.from("businesses").select("slug");
  const takenSlugs = new Set((taken ?? []).map((row: { slug: string }) => row.slug));

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .insert({
      name: d.name,
      slug: uniqueSlug(businessSlug(d.name, d.city || null), takenSlugs),
      city: d.city || null,
      status: "draft",
    })
    .select("id")
    .single();

  if (businessError || !business) return { error: "Could not create that business." };

  const added = await addEntry(rankingId, business.id as string);
  if (added.error) return added;

  revalidatePath("/admin/businesses");
  return { ok: true };
}

export async function moveEntry(
  entryId: string,
  rankingId: string,
  direction: "up" | "down",
): Promise<void> {
  const { supabase } = await requireAdmin();

  const { data: entries } = await supabase
    .from("ranking_entries")
    .select("id, position")
    .eq("ranking_id", rankingId)
    .order("position");

  if (!entries) return;

  const list = entries as { id: string; position: number }[];
  const index = list.findIndex((entry) => entry.id === entryId);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= list.length) return;

  const current = list[index];
  const other = list[swapIndex];

  await supabase
    .from("ranking_entries")
    .update({ position: -1 })
    .eq("id", current.id);
  await supabase
    .from("ranking_entries")
    .update({ position: current.position })
    .eq("id", other.id);
  await supabase
    .from("ranking_entries")
    .update({ position: other.position })
    .eq("id", current.id);

  revalidatePath(`/admin/rankings/${rankingId}`);
}

/**
 * Persists a complete new order.
 *
 * Drag-and-drop moves an entry from 1 to 10 in one gesture, which the pairwise
 * swap behind the up/down buttons cannot express — nine swaps would each be a
 * separate write with nine chances to interleave badly.
 *
 * Positions are renormalised to 1..n from the order given, so a list stays
 * coherent no matter what it looked like before: gaps left by a deletion close,
 * and duplicates introduced by two editors working at once resolve to whatever
 * the last save says.
 *
 * Ids not belonging to this ranking are dropped rather than trusted, and any
 * entry the caller omitted is appended in its existing order rather than
 * silently losing its place.
 */
/**
 * Publishes every business on a ranking.
 *
 * Businesses imported from a Yelp search are created as drafts on purpose —
 * nothing reaches the public site straight from a third-party search. The
 * consequence nobody sees coming is that publishing the RANKING is not enough:
 * its entries join to business rows the public cannot read, so the page renders
 * "no published entries" while the editor is looking at ten of them.
 *
 * This keeps the draft gate and makes clearing it one deliberate action rather
 * than ten trips to the business editor.
 */
export async function publishEntryBusinesses(rankingId: string): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const { data: entries } = await supabase
    .from("ranking_entries")
    .select("business_id")
    .eq("ranking_id", rankingId);

  const ids = ((entries ?? []) as { business_id: string }[]).map((e) => e.business_id);
  if (ids.length === 0) return { ok: true };

  const { error } = await supabase
    .from("businesses")
    .update({ status: "published" })
    .in("id", ids)
    .neq("status", "published");

  if (error) return { error: "Could not publish those businesses." };

  await revalidateRankingPaths(supabase, rankingId);
  return { ok: true };
}

/**
 * Sets a business's primary image from inside a ranking.
 *
 * The image belongs to the BUSINESS, not to this entry — which is the whole
 * point. A pizzeria in four rankings has one photo, and fixing it once fixes
 * all four. An entry-level image field would quietly recreate the duplication
 * the media library exists to remove.
 *
 * What this changes is only where the editor stands when they set it: working
 * through ten entries should not mean ten trips to the business editor and ten
 * journeys back.
 */
export async function setBusinessMedia(
  businessId: string,
  mediaId: string | null,
  rankingId: string,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const { data: business } = await supabase
    .from("businesses")
    .select("slug")
    .eq("id", businessId)
    .maybeSingle();

  const { error } = await supabase
    .from("businesses")
    .update({ primary_media_id: mediaId })
    .eq("id", businessId);

  if (error) return { error: "Could not save that image." };

  revalidatePath(`/admin/rankings/${rankingId}`);
  revalidatePath("/admin/businesses");
  if ((business as { slug: string } | null)?.slug) {
    revalidatePath(`/business/${(business as { slug: string }).slug}`);
  }

  /*
   * Every ranking this business appears in shows the new photo, so every one of
   * them has to be refreshed — not just the ranking the editor happens to be
   * looking at. This is the cost of the shared image, and it is worth paying.
   */
  const { data: appearances } = await supabase
    .from("ranking_entries")
    .select("ranking:rankings(slug, status)")
    .eq("business_id", businessId);

  for (const row of (appearances ?? []) as unknown as {
    ranking: { slug: string; status: string } | null;
  }[]) {
    if (row.ranking?.status === "published") {
      revalidatePath(`/best/${row.ranking.slug}`);
    }
  }
  revalidatePath("/best");
  revalidatePath("/");

  return { ok: true };
}

export async function reorderEntries(
  rankingId: string,
  orderedEntryIds: string[],
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const { data: existing } = await supabase
    .from("ranking_entries")
    .select("id, position")
    .eq("ranking_id", rankingId)
    .order("position");

  const rows = (existing ?? []) as { id: string; position: number }[];
  const known = new Set(rows.map((row) => row.id));

  const ordered = orderedEntryIds.filter((id) => known.has(id));
  const missing = rows.map((row) => row.id).filter((id) => !ordered.includes(id));
  const final = [...ordered, ...missing];

  if (final.length !== rows.length) {
    return { error: "That order did not match this list. Reload and try again." };
  }

  /*
   * Two passes, because `position` has no unique constraint but the intent is
   * that it behaves like one: writing 1..n directly over 1..n would briefly
   * give two rows the same position, and any read landing in between would see
   * a list that never existed. Negatives are outside the range the UI can ever
   * produce, so the parking pass cannot collide with a real value.
   */
  for (const [index, id] of final.entries()) {
    await supabase
      .from("ranking_entries")
      .update({ position: -(index + 1) })
      .eq("id", id);
  }
  for (const [index, id] of final.entries()) {
    await supabase
      .from("ranking_entries")
      .update({ position: index + 1 })
      .eq("id", id);
  }

  revalidatePath(`/admin/rankings/${rankingId}`);
  return { ok: true };
}

export async function removeEntry(
  entryId: string,
  rankingId: string,
): Promise<void> {
  const { supabase } = await requireAdmin();

  await supabase.from("ranking_entries").delete().eq("id", entryId);

  // Close the gap so positions stay 1..n.
  const { data: remaining } = await supabase
    .from("ranking_entries")
    .select("id")
    .eq("ranking_id", rankingId)
    .order("position");

  const list = (remaining ?? []) as { id: string }[];
  for (const [index, entry] of list.entries()) {
    await supabase
      .from("ranking_entries")
      .update({ position: index + 1 })
      .eq("id", entry.id);
  }

  revalidatePath(`/admin/rankings/${rankingId}`);
}

export async function createBlankRanking(): Promise<void> {
  const { supabase } = await requireAdmin();

  const { data: existing } = await supabase.from("rankings").select("slug");
  const taken = new Set((existing ?? []).map((row: { slug: string }) => row.slug));

  const { data } = await supabase
    .from("rankings")
    .insert({
      title: "Untitled ranking",
      slug: uniqueSlug("untitled-ranking", taken),
      status: "draft",
    })
    .select("id")
    .single();

  revalidatePath("/admin/rankings");
  if (data) redirect(`/admin/rankings/${data.id}`);
}

/**
 * Moves the ranking's staged dek, intro and methodology onto the public page.
 *
 * Applied together rather than one at a time: an editor rewrites an intro and
 * the methodology that goes with it as one thought, and shipping half of that
 * is worse than shipping neither.
 */
export async function applyRankingChanges(rankingId: string): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const { data, error: readError } = await supabase
    .from("rankings")
    .select("pending_changes")
    .eq("id", rankingId)
    .single();

  if (readError || !data) return { error: "Could not find that ranking." };

  const pending = (data as { pending_changes: Record<string, string> | null })
    .pending_changes;

  if (!pending || Object.keys(pending).length === 0) {
    return { error: "There is nothing waiting to go live." };
  }

  const update: Record<string, unknown> = { pending_changes: null };
  for (const [field, value] of Object.entries(pending)) update[field] = value || null;

  const { error } = await supabase.from("rankings").update(update).eq("id", rankingId);
  if (error) return { error: "Could not update the live page." };

  await revalidateRankingPaths(supabase, rankingId);
  return { ok: true, stagedFields: [] };
}

/** Throws away the ranking's staged text. The live page never changed. */
export async function discardRankingChanges(rankingId: string): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("rankings")
    .update({ pending_changes: null })
    .eq("id", rankingId);

  if (error) return { error: "Could not discard those changes." };

  revalidatePath(`/admin/rankings/${rankingId}`);
  return { ok: true };
}

/**
 * Sets a business's own website by hand.
 *
 * Yelp supplies one for most places and "Find website" fetches it, but not for
 * all of them — and a URL an editor found themselves is better evidence than
 * one nobody could locate. Saved to the business, so it drives the Visit
 * website button on the profile and travels to every ranking the business
 * appears in.
 *
 * An empty string clears it, which is the only way to remove a wrong one.
 */
export async function setBusinessWebsite(
  businessId: string,
  website: string,
  rankingId: string,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const trimmed = website.trim();

  // A bare domain is what people paste; make it a link rather than refusing it.
  const normalised = trimmed
    ? /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`
    : null;

  if (normalised && !/^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(normalised)) {
    return { error: "That does not look like a web address." };
  }

  const { error } = await supabase
    .from("businesses")
    .update({ website: normalised })
    .eq("id", businessId);

  if (error) return { error: "Could not save that website." };

  const { data: business } = await supabase
    .from("businesses")
    .select("slug")
    .eq("id", businessId)
    .maybeSingle();

  revalidatePath(`/admin/rankings/${rankingId}`);
  if ((business as { slug?: string } | null)?.slug) {
    revalidatePath(`/business/${(business as { slug: string }).slug}`);
  }
  return { ok: true };
}

/**
 * Permanently removes a ranking.
 *
 * Refuses while the ranking is published, and that is a deliberate speed bump
 * rather than a technical limit. Unpublishing is reversible and takes the page
 * down in one click; deleting is not reversible at all. Making someone do the
 * safe one first means the irreversible step is never the first thing they
 * reach for, and it splits "get this off the site now" from "destroy the
 * record" — which are different intentions that a single button conflates.
 *
 * What goes: the ranking, its entries, and any editorial placement curating it.
 * All three cascade in the schema, so a deleted ranking cannot leave a section
 * pointing at nothing.
 *
 * What stays: the businesses. They are shared records — the same pizzeria sits
 * on three other lists and has a public profile of its own — so removing a list
 * must never remove the places on it. `ranking_entries.business_id` cascades
 * from the entry side only, which is what makes that safe.
 */
export async function deleteRanking(id: string): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const { data, error: readError } = await supabase
    .from("rankings")
    .select("slug, title, status, category:categories(slug), place:places(slug)")
    .eq("id", id)
    .maybeSingle();

  if (readError || !data) return { error: "That ranking could not be found." };

  const ranking = data as unknown as {
    slug: string;
    title: string;
    status: string;
    category: { slug: string } | null;
    place: { slug: string } | null;
  };

  if (ranking.status === "published") {
    return {
      error:
        "Unpublish this ranking before deleting it. That takes it off the site straight away, and is undoable — deleting is not.",
    };
  }

  // Counted before the delete, so the confirmation can say what went.
  const { count: entryCount } = await supabase
    .from("ranking_entries")
    .select("id", { count: "exact", head: true })
    .eq("ranking_id", id);

  const { error } = await supabase.from("rankings").delete().eq("id", id);
  if (error) return { error: "Could not delete that ranking." };

  /*
   * The ranking's own URL as well as the indexes. A prerendered page keeps
   * answering with a deleted record until ISR expires otherwise — the same
   * trap that left deleted places resolving for an hour.
   */
  revalidatePath("/admin/rankings");
  revalidateRankingScope({
    slug: ranking.slug,
    categorySlug: ranking.category?.slug,
    placeSlug: ranking.place?.slug,
  });

  return {
    ok: true,
    error: undefined,
    deletedEntryCount: entryCount ?? 0,
  };
}
