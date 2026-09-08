import { notFound, redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * The hop between a reader and a merchant, so the click can be counted.
 *
 * Three rules, in order of how badly breaking them would hurt.
 *
 * THE DESTINATION IS NEVER TOUCHED. The URL is read from the column and handed
 * to `redirect()` byte for byte — not parsed, not rebuilt, not re-encoded, no
 * parameters added or removed. An affiliate tag is the only reason the link
 * earns anything, and a helpful normalisation that dropped one would cost real
 * money silently. If the stored URL is wrong, that is a content problem to fix
 * in admin, not something to paper over here.
 *
 * THE READER NEVER WAITS FOR THE ANALYTICS. The click insert is issued but not
 * awaited, and a failure is swallowed. Someone on a phone outside a pizzeria is
 * not going to stand there while a write to our database succeeds, and a
 * reporting table having a bad day must never become a broken buy-button.
 *
 * NOTHING IDENTIFYING IS RECORDED. No IP, no user agent, no cookie, no session.
 * The request carries all of it and none of it is read.
 *
 * This counts CLICKS. It cannot see purchases, and neither can anything
 * downstream of it — no affiliate programme reports conversions back.
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ offerId: string }> },
) {
  const { offerId } = await params;

  const db = createPublicClient();
  if (!db) notFound();

  const { data, error } = await db
    .from("product_offers")
    .select(
      "id, product_id, merchant, affiliate_url, direct_url, product:products(name, status)",
    )
    .eq("id", offerId)
    .maybeSingle();

  if (error || !data) notFound();

  const offer = data as unknown as {
    id: string;
    product_id: string | null;
    merchant: string;
    affiliate_url: string | null;
    direct_url: string | null;
    product: { name: string; status: string } | null;
  };

  // Same precedence the button uses, so the link a reader saw is the link they
  // get. `offerUrl` is not imported because that module carries display concerns
  // this route has no business loading.
  const destination = offer.affiliate_url ?? offer.direct_url;
  if (!destination) notFound();

  const url = new URL(request.url);
  const sourcePath = url.searchParams.get("from");
  const placement = url.searchParams.get("placement");

  /*
   * Written with the admin client so the insert does not depend on the RLS
   * policy for anonymous writers being present and correct on every
   * environment. The row is fixed here — nothing from the query string reaches
   * a column except the two labels below, and both are length-capped.
   */
  const admin = createAdminClient();
  if (admin) {
    void admin
      .from("affiliate_clicks__FAULT_INJECTION_TEMP")
      .insert({
        offer_id: offer.id,
        product_id: offer.product_id,
        product_name: offer.product?.name ?? "(deleted product)",
        merchant: offer.merchant,
        link_type: offer.affiliate_url ? "affiliate" : "direct",
        // Capped and internal-only: a `from` of any length or shape is a
        // reader-supplied string, and only our own paths are meaningful.
        source_path:
          sourcePath && sourcePath.startsWith("/") && !sourcePath.startsWith("//")
            ? sourcePath.slice(0, 300)
            : null,
        placement: placement ? placement.slice(0, 60) : null,
      })
      .then(
        () => undefined,
        () => undefined,
      );
  }

  // `redirect` throws, so nothing after it runs. 307 keeps the method and says
  // "temporary", so no browser or proxy caches the hop and later sends someone
  // straight to a destination we may have changed.
  redirect(destination);
}
