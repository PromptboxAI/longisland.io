/**
 * Product / affiliate test matrix.
 *
 *   node scripts/verify-products.mjs
 *
 * Exercises the live product schema: RLS for every product table, product and
 * guide CRUD, offers, recommendations, and the draft-hiding guards. Creates its
 * own fixtures and removes them again.
 *
 * Writes go through an AUTHENTICATED admin client, not the service key, so the
 * admin policies are exercised rather than bypassed.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const anon = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } },
);
const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } },
);
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const { error: authError } = await db.auth.signInWithPassword({
  email: env.ADMIN_TEST_EMAIL,
  password: env.ADMIN_TEST_PASSWORD,
});
if (authError) {
  console.log("admin sign-in failed:", authError.message);
  process.exit(1);
}

let failures = 0;
const check = (label, pass, detail = "") => {
  if (!pass) failures += 1;
  console.log(`  ${pass ? "PASS" : "**FAIL**"}  ${label}${detail ? `  — ${detail}` : ""}`);
};

const probe = await svc.from("products").select("id").limit(1);
if (probe.error?.code === "PGRST205") {
  console.log("product tables not found — apply the product migrations first.");
  process.exit(2);
}

/*
 * Clear anything a previous interrupted run left behind, so the harness is
 * re-runnable. Everything it creates is prefixed "probe-".
 */
async function clearProbeFixtures() {
  const { data: staleProducts } = await svc
    .from("products")
    .select("id")
    .like("slug", "probe-%");
  const staleIds = (staleProducts ?? []).map((p) => p.id);

  if (staleIds.length > 0) {
    await svc.from("content_product_recommendations").delete().in("product_id", staleIds);
    await svc.from("product_ranking_entries").delete().in("product_id", staleIds);
    await svc.from("product_offers").delete().in("product_id", staleIds);
    await svc.from("products").delete().in("id", staleIds);
  }
  await svc.from("product_rankings").delete().like("slug", "probe-%");
  await svc.from("affiliate_merchants").delete().like("slug", "probe-%");
  await svc.from("rankings").delete().like("slug", "probe-%");
}
await clearProbeFixtures();

const created = { products: [], guides: [], merchants: [], recs: [] };

/* ------------------------------------------------------------------ CRUD -- */
console.log("PRODUCT CRUD (as authenticated admin)\n");

const { data: merchant, error: merchantErr } = await db
  .from("affiliate_merchants")
  .insert({
    name: "Probe Merchant",
    slug: "probe-merchant",
    network: "direct",
    cta_label: "Check Price",
    brand_color: "#123456",
    brand_text_color: "#ffffff",
    status: "published",
  })
  .select("id, slug, cta_label, brand_color")
  .single();
check("create merchant", !merchantErr && Boolean(merchant), merchantErr?.message);
if (merchant) created.merchants.push(merchant.id);

check(
  "merchant branding persists",
  merchant?.cta_label === "Check Price" && merchant?.brand_color === "#123456",
  `${merchant?.cta_label} / ${merchant?.brand_color}`,
);

const { data: product, error: productErr } = await db
  .from("products")
  .insert({
    name: "Probe Product",
    slug: "probe-product",
    brand: "ProbeBrand",
    short_description: "Structural verification only.",
    status: "draft",
  })
  .select("id, name, status")
  .single();
check("create product", !productErr && Boolean(product), productErr?.message);
if (product) created.products.push(product.id);

const { error: editErr } = await db
  .from("products")
  .update({ name: "Probe Product (edited)", status: "published" })
  .eq("id", product.id);
const { data: edited } = await db
  .from("products")
  .select("name, status")
  .eq("id", product.id)
  .single();
check(
  "edit product",
  !editErr && edited.name.endsWith("(edited)") && edited.status === "published",
);

// Multiple offers on one product, including an Amazon offer.
const offerRows = [
  {
    product_id: product.id,
    merchant: "probe-merchant",
    affiliate_url: "https://example.com/probe?tag=x",
    price: 49.99,
    currency: "USD",
    availability: "in_stock",
  },
  {
    product_id: product.id,
    merchant: "amazon",
    affiliate_url: "https://www.amazon.com/dp/PROBE?tag=x",
    price: 44.99,
    currency: "USD",
    availability: "in_stock",
  },
];
const { data: offers, error: offerErr } = await db
  .from("product_offers")
  .insert(offerRows)
  .select("id, merchant, price");
check("multiple offers per product", !offerErr && offers?.length === 2, offerErr?.message);

/* ---------------------------------------------------------- product guide -- */
console.log("\nPRODUCT RANKINGS");

const { data: guide, error: guideErr } = await db
  .from("product_rankings")
  .insert({
    title: "Probe Buying Guide",
    slug: "probe-buying-guide",
    description: "Structural verification only.",
    status: "draft",
  })
  .select("id, slug, status")
  .single();
check("create product ranking", !guideErr && Boolean(guide), guideErr?.message);
if (guide) created.guides.push(guide.id);

// A second product so ordering has something to swap.
const { data: product2 } = await db
  .from("products")
  .insert({ name: "Probe Product Two", slug: "probe-product-two", status: "published" })
  .select("id")
  .single();
if (product2) created.products.push(product2.id);

const { data: entries, error: entryErr } = await db
  .from("product_ranking_entries")
  .insert([
    {
      product_ranking_id: guide.id,
      product_id: product.id,
      position: 1,
      badge: "Best Overall",
      best_for: "Verification",
      editorial_reason: "Structural verification only.",
      pros: ["Pro one", "Pro two"],
      cons: ["Con one"],
    },
    {
      product_ranking_id: guide.id,
      product_id: product2.id,
      position: 2,
      pros: [],
      cons: [],
    },
  ])
  .select("id, position, pros, cons, badge, best_for");
check("add products to guide", !entryErr && entries?.length === 2, entryErr?.message);

const first = entries?.find((e) => e.position === 1);
check(
  "badge / best_for / editorial reason persist",
  first?.badge === "Best Overall" && first?.best_for === "Verification",
);
check(
  "pros / cons persist as arrays",
  Array.isArray(first?.pros) &&
    first.pros.length === 2 &&
    Array.isArray(first?.cons) &&
    first.cons.length === 1,
  `pros=${JSON.stringify(first?.pros)} cons=${JSON.stringify(first?.cons)}`,
);

// Reorder: swap positions the way the admin editor does.
const second = entries.find((e) => e.position === 2);
await db.from("product_ranking_entries").update({ position: -1 }).eq("id", first.id);
await db.from("product_ranking_entries").update({ position: 1 }).eq("id", second.id);
await db.from("product_ranking_entries").update({ position: 2 }).eq("id", first.id);
const { data: reordered } = await db
  .from("product_ranking_entries")
  .select("id, position")
  .eq("product_ranking_id", guide.id)
  .order("position");
check(
  "reorder persists",
  reordered[0].id === second.id && reordered[1].id === first.id,
  reordered.map((r) => r.position).join(","),
);

/* ------------------------------------------------- recommendations module -- */
console.log("\nLOCAL CONTENT INTEGRATION");

const { data: localRanking } = await svc
  .from("rankings")
  .insert({
    title: "Probe Local Ranking",
    slug: "probe-local-ranking",
    status: "published",
    published_at: new Date().toISOString(),
  })
  .select("id")
  .single();

const { data: localCategory } = await svc
  .from("categories")
  .select("id")
  .eq("status", "published")
  .limit(1)
  .single();

const { error: recErr } = await db.from("content_product_recommendations").insert([
  {
    content_type: "ranking",
    content_id: localRanking.id,
    product_id: product.id,
    position: 1,
    context_label: "Recommended for verification",
  },
  {
    content_type: "category",
    content_id: localCategory.id,
    product_id: product.id,
    position: 1,
    context_label: "Recommended for verification",
  },
]);
check("attach recommended products to local content", !recErr, recErr?.message);
check("same product in two modules", !recErr, "ranking + category host pages");

const { data: recsForRanking } = await db
  .from("content_product_recommendations")
  .select("id")
  .eq("content_type", "ranking")
  .eq("content_id", localRanking.id);
const { data: recsElsewhere } = await db
  .from("content_product_recommendations")
  .select("id")
  .eq("content_type", "place")
  .eq("content_id", localRanking.id);
check(
  "module scoped to where it is configured",
  recsForRanking.length === 1 && recsElsewhere.length === 0,
);

/* ------------------------------------------------------------------- RLS -- */
console.log("\nRLS — anonymous reader");

// Guide is still draft at this point.
const anonGuides = await anon.from("product_rankings").select("id");
check(
  "draft product ranking hidden",
  !(anonGuides.data ?? []).some((g) => g.id === guide.id),
);

const anonEntries = await anon.from("product_ranking_entries").select("id");
check(
  "entries under a draft guide hidden",
  !(anonEntries.data ?? []).some((e) => e.id === first.id),
);

// Publish the guide and re-check.
await db.from("product_rankings").update({ status: "published" }).eq("id", guide.id);
const anonGuides2 = await anon.from("product_rankings").select("id");
check(
  "published product ranking visible",
  (anonGuides2.data ?? []).some((g) => g.id === guide.id),
);

const anonProducts = await anon.from("products").select("id, status");
check(
  "published product visible",
  (anonProducts.data ?? []).some((p) => p.id === product.id),
);
check(
  "no draft product leaks",
  (anonProducts.data ?? []).every((p) => p.status === "published"),
);

// Draft product hides its offers.
const { data: draftProduct } = await db
  .from("products")
  .insert({ name: "Probe Draft Product", slug: "probe-draft-product", status: "draft" })
  .select("id")
  .single();
created.products.push(draftProduct.id);
await db.from("product_offers").insert({
  product_id: draftProduct.id,
  merchant: "probe-merchant",
  affiliate_url: "https://example.com/hidden",
  price: 9.99,
});
const anonOffers = await anon.from("product_offers").select("id, product_id");
check(
  "offers under a draft product hidden",
  !(anonOffers.data ?? []).some((o) => o.product_id === draftProduct.id),
);
check(
  "offers under a published product visible",
  (anonOffers.data ?? []).some((o) => o.product_id === product.id),
);

const anonMerchants = await anon.from("affiliate_merchants").select("id, status");
check(
  "published merchant visible, drafts hidden",
  (anonMerchants.data ?? []).every((m) => m.status === "published"),
);

const anonRecs = await anon.from("content_product_recommendations").select("id");
check("recommendations readable by public", Array.isArray(anonRecs.data), anonRecs.error?.code);

// Anonymous writes must be refused on every product table.
const writes = await Promise.all([
  anon.from("products").insert({ name: "x", slug: "anon-probe-product" }),
  anon.from("product_offers").insert({ product_id: product.id, merchant: "amazon" }),
  anon.from("product_rankings").insert({ title: "x", slug: "anon-probe-guide" }),
  anon.from("affiliate_merchants").insert({ name: "x", slug: "anon-probe-merchant" }),
  anon
    .from("content_product_recommendations")
    .insert({ content_type: "ranking", content_id: localRanking.id, product_id: product.id }),
]);
check(
  "anonymous writes blocked on all product tables",
  writes.every((w) => Boolean(w.error)),
  writes.map((w) => w.error?.code ?? "ALLOWED").join(","),
);

/* -------------------------------------------------------------- unpublish -- */
console.log("\nPUBLISH / UNPUBLISH");

await db.from("product_rankings").update({ status: "draft" }).eq("id", guide.id);
const anonAfterUnpublish = await anon.from("product_rankings").select("id");
check(
  "unpublish hides the guide again",
  !(anonAfterUnpublish.data ?? []).some((g) => g.id === guide.id),
);

/* --------------------------------------------------------------- cleanup -- */
await svc.from("content_product_recommendations").delete().eq("product_id", product.id);
await svc.from("product_ranking_entries").delete().eq("product_ranking_id", guide.id);
await svc.from("product_rankings").delete().in("id", created.guides);
await svc.from("product_offers").delete().in("product_id", created.products);
await svc.from("products").delete().in("id", created.products);
await svc.from("affiliate_merchants").delete().in("id", created.merchants);
await svc.from("rankings").delete().eq("id", localRanking.id);

const remaining = {};
for (const t of [
  "products",
  "product_offers",
  "product_rankings",
  "product_ranking_entries",
  "content_product_recommendations",
  "rankings",
]) {
  const { count } = await svc.from(t).select("id", { count: "exact" });
  remaining[t] = count;
}
console.log(`\nCleanup — remaining rows: ${JSON.stringify(remaining)}`);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
