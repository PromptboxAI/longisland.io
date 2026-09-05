"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { businessSlug, uniqueSlug } from "@/lib/slug";

export async function setNominationStatus(
  id: string,
  status: "new" | "reviewing" | "approved" | "rejected",
): Promise<void> {
  const { supabase } = await requireAdmin();

  await supabase.from("nominations").update({ status }).eq("id", id);
  revalidatePath("/admin/nominations");
  revalidatePath("/admin");
}

/**
 * Turns an approved nomination into a draft business record.
 *
 * The nomination is marked approved and the editor lands on the new business so
 * they can research and complete it. Nothing is published automatically — a
 * reader suggestion is a lead, not a verified listing.
 */
export async function convertNominationToBusiness(id: string): Promise<void> {
  const { supabase } = await requireAdmin();

  const { data: nomination } = await supabase
    .from("nominations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!nomination) return;

  const { data: existing } = await supabase.from("businesses").select("slug");
  const taken = new Set((existing ?? []).map((row: { slug: string }) => row.slug));

  const { data: business } = await supabase
    .from("businesses")
    .insert({
      name: nomination.business_name,
      slug: uniqueSlug(
        businessSlug(nomination.business_name, nomination.town),
        taken,
      ),
      city: nomination.town,
      website: nomination.website,
      // Description is left empty on purpose: the nominator's reasoning is a
      // research lead, not publishable copy. An editor writes it after visiting.
      description: null,
      status: "draft",
    })
    .select("id")
    .single();

  await supabase.from("nominations").update({ status: "approved" }).eq("id", id);

  revalidatePath("/admin/nominations");
  revalidatePath("/admin/businesses");

  if (business) redirect(`/admin/businesses/${business.id}`);
}

export async function setLeadStatus(
  id: string,
  status: "new" | "contacted" | "qualified" | "closed" | "archived",
): Promise<void> {
  const { supabase } = await requireAdmin();

  await supabase.from("leads").update({ status }).eq("id", id);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
}
