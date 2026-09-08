import "server-only";

import { requireAdmin } from "@/lib/auth";

/**
 * Reading the click record.
 *
 * These are CLICKS. Not purchases, not revenue, not conversions — no affiliate
 * programme reports those back to us, and Amazon's are visible only inside the
 * Associates dashboard. Every label built on these numbers says "clicks", and
 * nothing here should ever be presented as money.
 *
 * Counts are done with `head: true` and an exact count, so the database returns
 * a number rather than the rows: a popular product over a year is tens of
 * thousands of rows nobody wants shipped to a list page.
 */

/** Midnight-relative cutoffs are not worth the complexity; rolling windows are. */
function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export interface ProductClickTotals {
  total: number;
  last7: number;
  last30: number;
}

export async function getProductClickTotals(
  productId: string,
): Promise<ProductClickTotals> {
  const { supabase } = await requireAdmin();

  const count = async (since?: string) => {
    let query = supabase
      .from("affiliate_clicks")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId);
    if (since) query = query.gte("clicked_at", since);
    const { count: n } = await query;
    return n ?? 0;
  };

  const [total, last7, last30] = await Promise.all([
    count(),
    count(daysAgo(7)),
    count(daysAgo(30)),
  ]);

  return { total, last7, last30 };
}

/**
 * Clicks for one product, split by the offer that was followed.
 *
 * Grouped in JS rather than SQL because PostgREST has no GROUP BY and the row
 * counts here are small — one product's clicks, not the whole table. If that
 * stops being true this becomes a database view, not a bigger query.
 *
 * Reads `merchant` from the click row, not from a join, so an offer deleted
 * last month still reports under the merchant it actually was.
 */
export interface OfferClickRow {
  merchant: string;
  linkType: string;
  clicks: number;
  last30: number;
}

export async function getProductClicksByOffer(
  productId: string,
): Promise<OfferClickRow[]> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("affiliate_clicks")
    .select("merchant, link_type, clicked_at")
    .eq("product_id", productId)
    .order("clicked_at", { ascending: false })
    .limit(5000);

  const cutoff = daysAgo(30);
  const rows = new Map<string, OfferClickRow>();

  for (const row of (data ?? []) as {
    merchant: string;
    link_type: string;
    clicked_at: string;
  }[]) {
    const key = `${row.merchant}|${row.link_type}`;
    const entry = rows.get(key) ?? {
      merchant: row.merchant,
      linkType: row.link_type,
      clicks: 0,
      last30: 0,
    };
    entry.clicks += 1;
    if (row.clicked_at >= cutoff) entry.last30 += 1;
    rows.set(key, entry);
  }

  return [...rows.values()].sort((a, b) => b.clicks - a.clicks);
}

/**
 * Where a product's clicks came from.
 *
 * Placement first, then the page, because "the homepage commerce row" and "a
 * buying guide" are different kinds of answer from "/best/pizza-stony-brook".
 * The first tells you which surface works; the second tells you which piece.
 */
export interface ClickSourceRow {
  placement: string;
  sourcePath: string;
  clicks: number;
}

export async function getProductClickSources(
  productId: string,
  limit = 10,
): Promise<ClickSourceRow[]> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("affiliate_clicks")
    .select("placement, source_path")
    .eq("product_id", productId)
    .limit(5000);

  const rows = new Map<string, ClickSourceRow>();

  for (const row of (data ?? []) as {
    placement: string | null;
    source_path: string | null;
  }[]) {
    const placement = row.placement ?? "unlabelled";
    const sourcePath = row.source_path ?? "unknown page";
    const key = `${placement}|${sourcePath}`;
    const entry = rows.get(key) ?? { placement, sourcePath, clicks: 0 };
    entry.clicks += 1;
    rows.set(key, entry);
  }

  return [...rows.values()]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}

/**
 * Thirty-day click counts for a page of products, in one query.
 *
 * One request for the whole list rather than one per row: a products list of
 * forty would otherwise fire forty counts, and the column is not worth that.
 */
export async function getClickCountsByProduct(
  productIds: string[],
  days = 30,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (productIds.length === 0) return counts;

  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("affiliate_clicks")
    .select("product_id")
    .in("product_id", productIds)
    .gte("clicked_at", daysAgo(days))
    .limit(20000);

  for (const row of (data ?? []) as { product_id: string | null }[]) {
    if (!row.product_id) continue;
    counts.set(row.product_id, (counts.get(row.product_id) ?? 0) + 1);
  }

  return counts;
}
