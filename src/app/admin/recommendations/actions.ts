"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import type { RecommendationContentType } from "@/types/products";

/**
 * Mutations for the embedded "recommended products" modules.
 *
 * Kept in their own route folder rather than inside app/admin/rankings so the
 * local ranking editor imports the product layer without the product layer
 * editing local files. A place or category editor can import exactly the same
 * actions when those surfaces gain a module.
 */

export type ActionState = { ok?: boolean; error?: string };

const CONTENT_TYPES = ["ranking", "place", "category", "business"] as const;

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** The admin page a given host type is edited on, for revalidation. */
function adminPathFor(contentType: RecommendationContentType, contentId: string) {
  switch (contentType) {
    case "ranking":
      return `/admin/rankings/${contentId}`;
    case "business":
      return `/admin/businesses/${contentId}`;
    default:
      return null;
  }
}

function revalidateHost(
  contentType: RecommendationContentType,
  contentId: string,
): void {
  const adminPath = adminPathFor(contentType, contentId);
  if (adminPath) revalidatePath(adminPath);

  // The public host page is addressed by slug, which this action does not have.
  // Revalidating the layout covers every page under the segment, which is both
  // correct and cheap at this content volume.
  if (contentType === "ranking") revalidatePath("/best", "layout");
  if (contentType === "place") revalidatePath("/place", "layout");
  if (contentType === "category") revalidatePath("/category", "layout");
  if (contentType === "business") revalidatePath("/business", "layout");
}

const addSchema = z.object({
  contentType: z.enum(CONTENT_TYPES),
  contentId: z.string().uuid(),
  productId: z.string().uuid(),
});

export async function addRecommendation(
  contentType: RecommendationContentType,
  contentId: string,
  productId: string,
): Promise<void> {
  const { supabase } = await requireAdmin();

  const parsed = addSchema.safeParse({ contentType, contentId, productId });
  if (!parsed.success) return;

  const { data: existing } = await supabase
    .from("content_product_recommendations")
    .select("position")
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition =
    ((existing ?? [])[0] as { position: number } | undefined)?.position ?? 0;

  // Carry the module heading across from the rows already there, so an editor
  // sets it once rather than on every product they add.
  const { data: sibling } = await supabase
    .from("content_product_recommendations")
    .select("context_label")
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .not("context_label", "is", null)
    .limit(1)
    .maybeSingle();

  await supabase.from("content_product_recommendations").insert({
    content_type: contentType,
    content_id: contentId,
    product_id: productId,
    position: nextPosition + 1,
    context_label: (sibling as { context_label: string } | null)?.context_label ?? null,
  });

  revalidateHost(contentType, contentId);
}

const saveSchema = z.object({
  id: z.string().uuid(),
  contextLabel: z.string().trim().max(200),
  editorialNote: z.string().trim().max(600),
});

export async function saveRecommendation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const parsed = saveSchema.safeParse({
    id: readString(formData, "id"),
    contextLabel: readString(formData, "contextLabel"),
    editorialNote: readString(formData, "editorialNote"),
  });

  if (!parsed.success) return { error: "Could not save that recommendation." };

  const contentTypeRaw = readString(formData, "contentType");
  const contentId = readString(formData, "contentId");
  const contentType = CONTENT_TYPES.find((type) => type === contentTypeRaw);
  if (!contentType) return { error: "Unknown host page." };

  // The label belongs to the module, not the row, so editing it on one product
  // sets it for all of them — otherwise a module could show a stale heading
  // depending on which row happened to sort first.
  const [{ error }, labelResult] = await Promise.all([
    supabase
      .from("content_product_recommendations")
      .update({ editorial_note: parsed.data.editorialNote || null })
      .eq("id", parsed.data.id),
    supabase
      .from("content_product_recommendations")
      .update({ context_label: parsed.data.contextLabel || null })
      .eq("content_type", contentType)
      .eq("content_id", contentId),
  ]);

  if (error || labelResult.error) {
    return { error: "Could not save that recommendation." };
  }

  revalidateHost(contentType, contentId);
  return { ok: true };
}

export async function moveRecommendation(
  id: string,
  contentTypeRaw: string,
  contentId: string,
  direction: "up" | "down",
): Promise<void> {
  const { supabase } = await requireAdmin();

  const contentType = CONTENT_TYPES.find((type) => type === contentTypeRaw);
  if (!contentType) return;

  const { data: rows } = await supabase
    .from("content_product_recommendations")
    .select("id, position")
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .order("position");

  if (!rows) return;

  const list = rows as { id: string; position: number }[];
  const index = list.findIndex((row) => row.id === id);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= list.length) return;

  const current = list[index];
  const other = list[swapIndex];

  // No unique constraint on position here, so a straight swap is safe.
  await supabase
    .from("content_product_recommendations")
    .update({ position: other.position })
    .eq("id", current.id);
  await supabase
    .from("content_product_recommendations")
    .update({ position: current.position })
    .eq("id", other.id);

  revalidateHost(contentType, contentId);
}

export async function removeRecommendation(
  id: string,
  contentTypeRaw: string,
  contentId: string,
): Promise<void> {
  const { supabase } = await requireAdmin();

  const contentType = CONTENT_TYPES.find((type) => type === contentTypeRaw);
  if (!contentType) return;

  await supabase.from("content_product_recommendations").delete().eq("id", id);

  revalidateHost(contentType, contentId);
}
