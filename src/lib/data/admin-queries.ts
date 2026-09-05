import "server-only";

import { requireAdmin } from "@/lib/auth";
import type {
  Business,
  Category,
  ContentItem,
  Lead,
  Nomination,
  Place,
  Ranking,
  RankingWithEntries,
} from "@/types/database";

/**
 * Admin reads and writes.
 *
 * These use the authenticated server client, so RLS grants access to draft rows
 * that the public queries in ./queries.ts cannot see. Every function calls
 * requireAdmin() first, which redirects to the login page when there is no
 * session.
 */

export interface AdminStats {
  businesses: number;
  publishedRankings: number;
  draftRankings: number;
  newNominations: number;
  newLeads: number;
  contentReady: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const { supabase } = await requireAdmin();

  // head:true returns only the count, so none of these transfer rows.
  const counts = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase
      .from("rankings")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("rankings")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase
      .from("nominations")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "ready"),
  ]);

  const [
    businesses,
    publishedRankings,
    draftRankings,
    newNominations,
    newLeads,
    contentReady,
  ] = counts.map((result) => result.count ?? 0);

  return {
    businesses,
    publishedRankings,
    draftRankings,
    newNominations,
    newLeads,
    contentReady,
  };
}

/* -------------------------------------------------------------------------- */
/* Rankings                                                                    */
/* -------------------------------------------------------------------------- */

export interface AdminRanking extends Ranking {
  category: Pick<Category, "name" | "slug"> | null;
  place: Pick<Place, "name" | "slug"> | null;
  entry_count: number;
}

export async function listAdminRankings(options: {
  status?: string;
  query?: string;
  limit?: number;
} = {}): Promise<AdminRanking[]> {
  const { supabase } = await requireAdmin();

  let request = supabase
    .from("rankings")
    .select(
      "*, category:categories(name, slug), place:places(name, slug), ranking_entries(count)",
    )
    .order("updated_at", { ascending: false });

  if (options.status) request = request.eq("status", options.status);
  if (options.query) request = request.ilike("title", `%${options.query}%`);
  if (options.limit) request = request.limit(options.limit);

  const { data } = await request;

  type Row = Ranking & {
    category: { name: string; slug: string } | null;
    place: { name: string; slug: string } | null;
    ranking_entries: { count: number }[];
  };

  return ((data ?? []) as Row[]).map((row) => ({
    ...row,
    entry_count: row.ranking_entries?.[0]?.count ?? 0,
  }));
}

export async function getAdminRanking(
  id: string,
): Promise<RankingWithEntries | null> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("rankings")
    .select(
      "*, category:categories(*), place:places(*), entries:ranking_entries(*, business:businesses(*))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  const ranking = data as unknown as RankingWithEntries;
  return {
    ...ranking,
    entries: [...(ranking.entries ?? [])]
      .filter((entry) => entry.business)
      .sort((a, b) => a.position - b.position),
  };
}

/* -------------------------------------------------------------------------- */
/* Businesses                                                                  */
/* -------------------------------------------------------------------------- */

export async function listAdminBusinesses(options: {
  status?: string;
  categoryId?: string;
  city?: string;
  query?: string;
  limit?: number;
} = {}): Promise<Business[]> {
  const { supabase } = await requireAdmin();

  let request = supabase
    .from("businesses")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(options.limit ?? 100);

  if (options.status) request = request.eq("status", options.status);
  if (options.categoryId) request = request.eq("category_id", options.categoryId);
  if (options.city) request = request.eq("city", options.city);
  if (options.query) request = request.ilike("name", `%${options.query}%`);

  const { data } = await request;
  return (data ?? []) as Business[];
}

export async function getAdminBusiness(id: string): Promise<Business | null> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return (data as Business | null) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Intake queues                                                               */
/* -------------------------------------------------------------------------- */

export async function listNominations(status?: string): Promise<Nomination[]> {
  const { supabase } = await requireAdmin();

  let request = supabase
    .from("nominations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) request = request.eq("status", status);

  const { data } = await request;
  return (data ?? []) as Nomination[];
}

export async function listLeads(status?: string): Promise<Lead[]> {
  const { supabase } = await requireAdmin();

  let request = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) request = request.eq("status", status);

  const { data } = await request;
  return (data ?? []) as Lead[];
}

export async function listContentItems(): Promise<ContentItem[]> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("content_items")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);

  return (data ?? []) as ContentItem[];
}

/* -------------------------------------------------------------------------- */
/* Reference data for editors                                                  */
/* -------------------------------------------------------------------------- */

export async function listAdminCategories(): Promise<Category[]> {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("categories").select("*").order("name");
  return (data ?? []) as Category[];
}

export async function listAdminPlaces(): Promise<Place[]> {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("places").select("*").order("name");
  return (data ?? []) as Place[];
}
