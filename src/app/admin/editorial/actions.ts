"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";

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
  if (data) redirect(`/admin/editorial/${data.id}`);
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
  return { ok: true };
}

export async function deleteSection(id: string): Promise<void> {
  const { supabase } = await requireAdmin();
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
  return { ok: true };
}

const itemUpdateSchema = z.object({
  itemId: z.string().uuid(),
  sectionId: z.string().uuid(),
  kicker: z.string().trim().max(120).nullable(),
  headline: z.string().trim().max(200).nullable(),
  dek: z.string().trim().max(500).nullable(),
  imageUrl: z.string().trim().max(500).nullable(),
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
      image_url: d.imageUrl,
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
