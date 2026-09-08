"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { findPlacement, isSystemPlacement } from "@/lib/editorial/placements";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  searchTargets,
  type TargetQuery,
  type TargetSearchResult,
} from "@/lib/data/target-search";

/**
 * Editorial section mutations.
 *
 * Every action re-checks the session through requireAdmin(): a Server Action is
 * a public HTTP endpoint and cannot rely on the page around it having been
 * authorised. RLS is the final boundary underneath.
 */

export type EditorialActionState = { ok?: boolean; error?: string };

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(formData: FormData, key: string): string | null {
  const value = readString(formData, key);
  return value.length > 0 ? value : null;
}

/* -------------------------------------------------------------------------- */
/* Public revalidation                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Refreshes the public pages a section actually appears on.
 *
 * Public routes sit on a one-hour ISR window, which is right for a site whose
 * content changes rarely and wrong for the minutes after an editor curates
 * something. Without this, placing a feature and then looking at the homepage
 * shows the old one, and the natural conclusion is that the tool is broken.
 *
 * The scope columns say where a section renders, so the section row is read
 * back rather than guessed at: a global section reaches the homepage, and a
 * scoped one reaches its category or place page. ISR stays as the backstop.
 */
async function revalidateSectionSurfaces(
  supabase: SupabaseClient,
  sectionId: string,
): Promise<void> {
  const { data } = await supabase
    .from("editorial_sections")
    .select("scope_type, category:categories(slug), place:places(slug)")
    .eq("id", sectionId)
    .maybeSingle();

  if (!data) return;

  const section = data as unknown as {
    scope_type: "global" | "category" | "place";
    category: { slug: string } | null;
    place: { slug: string } | null;
  };

  if (section.scope_type === "category" && section.category) {
    revalidatePath(`/category/${section.category.slug}`);
    return;
  }
  if (section.scope_type === "place" && section.place) {
    revalidatePath(`/place/${section.place.slug}`);
    return;
  }
  revalidatePath("/");
}

/**
 * Opens a named placement, creating its row the first time.
 *
 * The homepage asks for `homepage_primary` by name in its own code, so the
 * section is a fixed slot rather than something an editor invents. Making them
 * type the key was asking them to guess an identifier the application already
 * knows — and a typo produced a section that renders nowhere, with nothing to
 * say why.
 *
 * Created as a DRAFT so provisioning a slot never publishes an empty block.
 */
export async function openPlacement(
  key: string,
  scope: { categoryId?: string | null; placeId?: string | null } = {},
): Promise<void> {
  const { supabase } = await requireAdmin();

  const placement = findPlacement(key);
  if (!placement) redirect("/admin/editorial");

  let lookup = supabase.from("editorial_sections").select("id").eq("key", key);
  lookup = scope.categoryId
    ? lookup.eq("category_id", scope.categoryId)
    : lookup.is("category_id", null);
  lookup = scope.placeId
    ? lookup.eq("place_id", scope.placeId)
    : lookup.is("place_id", null);

  const { data: existing } = await lookup.maybeSingle();
  if (existing) redirect(`/admin/editorial/${(existing as { id: string }).id}`);

  const { data: created } = await supabase
    .from("editorial_sections")
    .insert({
      key,
      scope_type: placement.scope,
      category_id: scope.categoryId ?? null,
      place_id: scope.placeId ?? null,
      // The admin label. Whether it renders publicly is the placement's call,
      // not a property of this string.
      title: placement.publicHeading ?? placement.name,
      layout: placement.layout,
      max_items: placement.maxItems,
      status: "draft",
    })
    .select("id")
    .single();

  revalidatePath("/admin/editorial");
  if (created) redirect(`/admin/editorial/${(created as { id: string }).id}`);
  redirect("/admin/editorial");
}

/* -------------------------------------------------------------------------- */
/* Sections                                                                    */
/* -------------------------------------------------------------------------- */

const sectionSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers and underscores."),
    scopeType: z.enum(["global", "category", "place"]),
    categoryId: z.string().uuid().nullable(),
    placeId: z.string().uuid().nullable(),
    title: z.string().trim().max(160).nullable(),
    description: z.string().trim().max(500).nullable(),
    layout: z.enum(["feature", "rail", "grid", "link_row"]),
    maxItems: z.number().int().min(1).max(50).nullable(),
    status: z.enum(["draft", "review", "published", "archived"]),
  })
  // Mirrors the database check constraint, so a bad combination is rejected
  // with a readable message instead of a Postgres error.
  .refine(
    (v) =>
      (v.scopeType === "global" && !v.categoryId && !v.placeId) ||
      (v.scopeType === "category" && v.categoryId && !v.placeId) ||
      (v.scopeType === "place" && v.placeId && !v.categoryId),
    { message: "Scope and its category/place selection do not match." },
  );

function parseSection(formData: FormData) {
  const scopeType = readString(formData, "scopeType") || "global";
  const maxItemsRaw = readString(formData, "maxItems");

  return sectionSchema.safeParse({
    key: readString(formData, "key"),
    scopeType,
    categoryId: scopeType === "category" ? readNullableString(formData, "categoryId") : null,
    placeId: scopeType === "place" ? readNullableString(formData, "placeId") : null,
    title: readNullableString(formData, "title"),
    description: readNullableString(formData, "description"),
    layout: readString(formData, "layout") || "grid",
    maxItems: maxItemsRaw ? Number(maxItemsRaw) : null,
    status: readString(formData, "status") || "draft",
  });
}

export async function createSection(
  _prev: EditorialActionState,
  formData: FormData,
): Promise<EditorialActionState> {
  const { supabase } = await requireAdmin();

  const parsed = parseSection(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const d = parsed.data;

  const { data, error } = await supabase
    .from("editorial_sections")
    .insert({
      key: d.key,
      scope_type: d.scopeType,
      category_id: d.categoryId,
      place_id: d.placeId,
      title: d.title,
      description: d.description,
      layout: d.layout,
      max_items: d.maxItems,
      status: d.status,
    })
    .select("id")
    .single();

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "A section with that key already exists for this scope."
          : "Could not create the section.",
    };
  }

  revalidatePath("/admin/editorial");
  if (data) {
    await revalidateSectionSurfaces(supabase, data.id);
    redirect(`/admin/editorial/${data.id}`);
  }
  return { ok: true };
}

export async function updateSection(
  _prev: EditorialActionState,
  formData: FormData,
): Promise<EditorialActionState> {
  const { supabase } = await requireAdmin();

  const id = readString(formData, "id");
  const parsed = parseSection(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const d = parsed.data;

  const { error } = await supabase
    .from("editorial_sections")
    .update({
      key: d.key,
      scope_type: d.scopeType,
      category_id: d.categoryId,
      place_id: d.placeId,
      title: d.title,
      description: d.description,
      layout: d.layout,
      max_items: d.maxItems,
      status: d.status,
    })
    .eq("id", id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "A section with that key already exists for this scope."
          : "Could not save the section.",
    };
  }

  revalidatePath("/admin/editorial");
  revalidatePath(`/admin/editorial/${id}`);
  await revalidateSectionSurfaces(supabase, id);
  return { ok: true };
}

export async function deleteSection(id: string): Promise<void> {
  const { supabase } = await requireAdmin();

  /*
   * A system placement cannot be deleted.
   *
   * These are part of the page, not pieces of content. The homepage asks for
   * `homepage_primary` by name in its own code, so deleting that row does not
   * remove a section from the site — it removes the site's ability to fill one,
   * and leaves a hole whose cause is invisible. The row is recreated on demand
   * anyway, so the delete was never even usefully destructive; it was a trap
   * sitting next to the controls an editor uses daily.
   *
   * Refused in the action rather than only hidden in the UI: a control that is
   * merely absent from a page is not a rule.
   */
  const { data: section } = await supabase
    .from("editorial_sections")
    .select("key")
    .eq("id", id)
    .maybeSingle();

  const key = (section as { key?: string } | null)?.key;
  if (key && isSystemPlacement(key)) {
    redirect(`/admin/editorial/${id}?error=system-placement`);
  }

  // Read the scope BEFORE the delete: afterwards there is no row to say which
  // public page just lost a section.
  await revalidateSectionSurfaces(supabase, id);

  // Items cascade with the section.
  await supabase.from("editorial_sections").delete().eq("id", id);
  revalidatePath("/admin/editorial");
  redirect("/admin/editorial");
}

/* -------------------------------------------------------------------------- */
/* Items                                                                       */
/* -------------------------------------------------------------------------- */

const itemSchema = z
  .object({
    sectionId: z.string().uuid(),
    targetType: z.enum([
      "ranking",
      "business",
      "category",
      "place",
      "product_ranking",
      "product",
      "article",
      "external_url",
    ]),
    targetId: z.string().uuid().nullable(),
    externalUrl: z.string().trim().max(500).nullable(),
    headline: z.string().trim().max(200).nullable(),
  })
  .refine(
    (v) =>
      v.targetType === "external_url"
        ? Boolean(v.externalUrl) && Boolean(v.headline)
        : Boolean(v.targetId),
    {
      message:
        "Pick a target, or supply both a URL and a headline for an external link.",
    },
  )
  .refine(
    (v) => v.targetType !== "external_url" || /^https?:\/\/.+\..+/.test(v.externalUrl ?? ""),
    { message: "External links need a full URL starting with http:// or https://" },
  );

/**
 * Appends an item to a section.
 *
 * Exactly one destination column is written; the rest stay null. The database
 * enforces the same rule, so a malformed write fails there too rather than
 * relying on this being the only writer.
 */
export async function addSectionItem(
  _prev: EditorialActionState,
  formData: FormData,
): Promise<EditorialActionState> {
  const { supabase } = await requireAdmin();

  const parsed = itemSchema.safeParse({
    sectionId: readString(formData, "sectionId"),
    targetType: readString(formData, "targetType"),
    targetId: readNullableString(formData, "targetId"),
    externalUrl: readNullableString(formData, "externalUrl"),
    headline: readNullableString(formData, "headline"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the item." };
  }
  const d = parsed.data;

  const destination: Record<string, string | null> = {
    ranking_id: null,
    business_id: null,
    category_id: null,
    place_id: null,
    product_ranking_id: null,
    product_id: null,
    article_id: null,
    external_url: null,
  };
  if (d.targetType === "external_url") destination.external_url = d.externalUrl;
  else destination[`${d.targetType}_id`] = d.targetId;

  // Append at the end. Positions are renormalised below, so a gap or a tie
  // here is harmless.
  const { data: existing } = await supabase
    .from("editorial_section_items")
    .select("position")
    .eq("section_id", d.sectionId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = ((existing?.[0]?.position as number | undefined) ?? 0) + 1;

  const { error } = await supabase.from("editorial_section_items").insert({
    section_id: d.sectionId,
    position: nextPosition,
    ...destination,
    headline: d.headline,
    status: "draft",
  });

  if (error) return { error: "Could not add that item." };

  await renormalise(supabase, d.sectionId);
  revalidatePath(`/admin/editorial/${d.sectionId}`);
  await revalidateSectionSurfaces(supabase, d.sectionId);
  return { ok: true };
}

const itemUpdateSchema = z.object({
  itemId: z.string().uuid(),
  sectionId: z.string().uuid(),
  kicker: z.string().trim().max(120).nullable(),
  headline: z.string().trim().max(200).nullable(),
  dek: z.string().trim().max(500).nullable(),
  imageUrl: z.string().trim().max(500).nullable(),
  imageMediaId: z.string().uuid().nullable(),
  badge: z.string().trim().max(60).nullable(),
  isSponsored: z.boolean(),
  status: z.enum(["draft", "review", "published", "archived"]),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
});

export async function updateSectionItem(
  _prev: EditorialActionState,
  formData: FormData,
): Promise<EditorialActionState> {
  const { supabase } = await requireAdmin();

  const parsed = itemUpdateSchema.safeParse({
    itemId: readString(formData, "itemId"),
    sectionId: readString(formData, "sectionId"),
    kicker: readNullableString(formData, "kicker"),
    headline: readNullableString(formData, "headline"),
    dek: readNullableString(formData, "dek"),
    imageUrl: readNullableString(formData, "imageUrl"),
    imageMediaId: readNullableString(formData, "imageMediaId"),
    badge: readNullableString(formData, "badge"),
    isSponsored: formData.get("isSponsored") === "on",
    status: readString(formData, "status") || "draft",
    startsAt: readNullableString(formData, "startsAt"),
    endsAt: readNullableString(formData, "endsAt"),
  });

  if (!parsed.success) return { error: "Could not save that item." };
  const d = parsed.data;

  const { error } = await supabase
    .from("editorial_section_items")
    .update({
      kicker: d.kicker,
      headline: d.headline,
      dek: d.dek,
      // The chosen asset wins; a pasted URL only survives without one.
      image_media_id: d.imageMediaId,
      image_url: d.imageMediaId ? null : d.imageUrl,
      badge: d.badge,
      is_sponsored: d.isSponsored,
      status: d.status,
      starts_at: d.startsAt ? new Date(d.startsAt).toISOString() : null,
      ends_at: d.endsAt ? new Date(d.endsAt).toISOString() : null,
    })
    .eq("id", d.itemId);

  if (error) {
    return {
      error:
        error.code === "23514"
          ? "Check the schedule: the end must be after the start, and an external link needs a headline."
          : "Could not save that item.",
    };
  }

  revalidatePath(`/admin/editorial/${d.sectionId}`);
  await revalidateSectionSurfaces(supabase, d.sectionId);
  return { ok: true };
}

export async function removeSectionItem(
  itemId: string,
  sectionId: string,
): Promise<void> {
  const { supabase } = await requireAdmin();
  await supabase.from("editorial_section_items").delete().eq("id", itemId);
  await renormalise(supabase, sectionId);
  revalidatePath(`/admin/editorial/${sectionId}`);
  await revalidateSectionSurfaces(supabase, sectionId);
}

/**
 * Moves an item one place up or down.
 *
 * Positions are swapped directly. There is no unique constraint on
 * (section_id, position), so an intermediate tie is legal — and the ordering
 * used by both the public and admin readers breaks ties deterministically on
 * created_at then id, so a render during a swap is still stable.
 */
export async function moveSectionItem(
  itemId: string,
  sectionId: string,
  direction: "up" | "down",
): Promise<void> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("editorial_section_items")
    .select("id, position, created_at")
    .eq("section_id", sectionId)
    .order("position")
    .order("created_at")
    .order("id");

  const items = (data ?? []) as { id: string; position: number }[];
  const index = items.findIndex((i) => i.id === itemId);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= items.length) return;

  await supabase
    .from("editorial_section_items")
    .update({ position: items[swapIndex].position })
    .eq("id", items[index].id);
  await supabase
    .from("editorial_section_items")
    .update({ position: items[index].position })
    .eq("id", items[swapIndex].id);

  await renormalise(supabase, sectionId);
  revalidatePath(`/admin/editorial/${sectionId}`);
  await revalidateSectionSurfaces(supabase, sectionId);
}

/**
 * Rewrites positions to a contiguous 1..n in current display order.
 *
 * Keeps "position" meaningful after inserts and deletes, so the numbers an
 * editor sees match the order the site renders.
 */
async function renormalise(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  sectionId: string,
): Promise<void> {
  const { data } = await supabase
    .from("editorial_section_items")
    .select("id, position, created_at")
    .eq("section_id", sectionId)
    .order("position")
    .order("created_at")
    .order("id");

  const items = (data ?? []) as { id: string; position: number }[];

  for (const [index, item] of items.entries()) {
    const next = index + 1;
    if (item.position === next) continue;
    await supabase
      .from("editorial_section_items")
      .update({ position: next })
      .eq("id", item.id);
  }
}

/**
 * Search targets for the picker, one page at a time.
 *
 * A Server Action rather than a route handler so it inherits `requireAdmin`
 * from the query underneath and needs no separate auth check, no CORS story
 * and no client-side key. The picker calls it on every keystroke behind a
 * debounce.
 */
export async function searchTargetsAction(
  input: TargetQuery,
): Promise<TargetSearchResult> {
  return searchTargets(input);
}

/* -------------------------------------------------------------------------- */
/* Placement-level actions                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Makes everything in a placement live, in one action.
 *
 * This is the whole point of the overhaul. The database keeps three publication
 * states — section, item, and the content the item points at — and an editor
 * was being asked to reconcile them by hand, which produced a placement reading
 * "1 item · 0 published" while every part of it claimed to be published.
 *
 * So one button sets the section and every item live together. The third state
 * is deliberately NOT touched: publishing a placement must never publish a
 * draft ranking behind an editor's back. That one is reported instead, because
 * it is a decision about content rather than about where content sits.
 */
export async function updatePlacement(sectionId: string): Promise<EditorialActionState> {
  const { supabase } = await requireAdmin();

  const { error: sectionError } = await supabase
    .from("editorial_sections")
    .update({ status: "published" })
    .eq("id", sectionId);

  if (sectionError) return { error: "Could not update this placement." };

  const { error: itemError } = await supabase
    .from("editorial_section_items")
    .update({ status: "published" })
    .eq("section_id", sectionId);

  if (itemError) return { error: "Could not update the items in this placement." };

  revalidatePath(`/admin/editorial/${sectionId}`);
  revalidatePath("/admin/editorial");
  await revalidateSectionSurfaces(supabase, sectionId);
  return { ok: true };
}

/**
 * Empties a placement without touching what was in it.
 *
 * Removes the items and leaves the section row, because the placement is part
 * of the site's structure and will be wanted again. Nothing that was curated
 * here is altered: the ranking, product or article carries on existing,
 * published, and appearing everywhere else it appears.
 */
export async function clearPlacement(sectionId: string): Promise<EditorialActionState> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("editorial_section_items")
    .delete()
    .eq("section_id", sectionId);

  if (error) return { error: "Could not clear this placement." };

  revalidatePath(`/admin/editorial/${sectionId}`);
  revalidatePath("/admin/editorial");
  await revalidateSectionSurfaces(supabase, sectionId);
  return { ok: true };
}

/**
 * Puts one piece of content in a single-slot placement, replacing whatever
 * was there.
 *
 * The Primary Feature is one slot, so "add" is the wrong verb for it entirely.
 * Adding produced two items, the old one lingering underneath as an expanded
 * draft form that had to be individually unpublished — which is not a thing an
 * editor choosing a hero image should ever have to think about.
 *
 * Replacing removes the previous item from the PLACEMENT ONLY. The ranking it
 * pointed at is untouched: still published, still on /best, still wherever else
 * it was curated.
 */
export async function setSingleSlotTarget(
  sectionId: string,
  targetType: string,
  targetId: string,
): Promise<EditorialActionState> {
  const { supabase } = await requireAdmin();

  /*
   * The kind of thing is expressed by WHICH foreign key is set — there is no
   * `target_type` column, and a CHECK constraint enforces exactly one. So the
   * others are nulled explicitly rather than left absent.
   */
  const allowed = [
    "ranking",
    "article",
    "product_ranking",
    "product",
    "business",
    "category",
    "place",
  ];
  if (!allowed.includes(targetType)) {
    return { error: "That kind of content cannot go here." };
  }

  const destination: Record<string, string | null> = {
    ranking_id: null,
    business_id: null,
    category_id: null,
    place_id: null,
    product_ranking_id: null,
    product_id: null,
    article_id: null,
    external_url: null,
  };
  destination[`${targetType}_id`] = targetId;

  // Out with the old — from this placement, not from the site.
  const { error: clearError } = await supabase
    .from("editorial_section_items")
    .delete()
    .eq("section_id", sectionId);

  if (clearError) return { error: "Could not replace what was here." };

  const { error: insertError } = await supabase.from("editorial_section_items").insert({
    section_id: sectionId,
    ...destination,
    position: 1,
    // Live immediately: a single-slot placement has no meaningful draft state
    // of its own, and the editor's action WAS the decision to publish it.
    status: "published",
  });

  if (insertError) return { error: "Could not set that as the feature." };

  const { error: sectionError } = await supabase
    .from("editorial_sections")
    .update({ status: "published" })
    .eq("id", sectionId);

  if (sectionError) return { error: "Set, but the placement could not be switched on." };

  revalidatePath(`/admin/editorial/${sectionId}`);
  revalidatePath("/admin/editorial");
  await revalidateSectionSurfaces(supabase, sectionId);
  return { ok: true };
}

/**
 * Publishes the chosen content, then puts it in the placement.
 *
 * Adding a draft product to a live Top Picks used to produce a row that looked
 * fine and rendered nothing — the "1 item · 0 published" trap, arrived at from
 * the other direction. The honest options are to refuse or to offer, and
 * refusing wastes a trip: the editor picked the product deliberately and the
 * only thing standing between it and readers is one status.
 *
 * So this is the offer. It is deliberately explicit — a separate action behind
 * a separate button — because publishing content is a bigger decision than
 * arranging a homepage row, and it should never happen as a side effect of
 * curating.
 */
export async function publishTargetAndAdd(
  sectionId: string,
  targetType: string,
  targetId: string,
): Promise<EditorialActionState> {
  const { supabase } = await requireAdmin();

  const tables: Record<string, string> = {
    ranking: "rankings",
    article: "articles",
    product: "products",
    product_ranking: "product_rankings",
    business: "businesses",
    category: "categories",
    place: "places",
  };

  const table = tables[targetType];
  if (!table) return { error: "That kind of content cannot be published here." };

  const { error: publishError } = await supabase
    .from(table)
    .update({ status: "published" })
    .eq("id", targetId);

  if (publishError) return { error: "Could not publish that content." };

  const destination: Record<string, string | null> = {
    ranking_id: null,
    business_id: null,
    category_id: null,
    place_id: null,
    product_ranking_id: null,
    product_id: null,
    article_id: null,
    external_url: null,
  };
  destination[`${targetType}_id`] = targetId;

  const { data: existing } = await supabase
    .from("editorial_section_items")
    .select("position")
    .eq("section_id", sectionId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = ((existing?.[0]?.position as number | undefined) ?? 0) + 1;

  const { error } = await supabase.from("editorial_section_items").insert({
    section_id: sectionId,
    position: nextPosition,
    ...destination,
    // Live straight away: the editor just answered both questions at once.
    status: "published",
  });

  if (error) return { error: "Published it, but could not add it here." };

  revalidatePath(`/admin/editorial/${sectionId}`);
  await revalidateSectionSurfaces(supabase, sectionId);
  return { ok: true };
}
