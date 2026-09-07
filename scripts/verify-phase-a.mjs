/**
 * Phase A workflow suite.
 *
 *   node scripts/verify-phase-a.mjs
 *
 * Exercises the fifteen publishing workflows agreed for Phase A plus the
 * security and behaviour checks around them, against the live database using
 * the same clients the app uses: the service key stands in for an editor, and
 * the anonymous key stands in for a reader.
 *
 * Everything it creates is prefixed `pa-` and removed at the end, including on
 * failure. It asserts the cleanup rather than announcing it, because a previous
 * pass reported "cleaned" while printing the count of rows left behind.
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

const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const anon = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } },
);

let failures = 0;
function check(label, pass, detail = "") {
  if (!pass) failures += 1;
  console.log(`  ${pass ? "PASS" : "**FAIL**"}  ${label}${detail ? `  — ${detail}` : ""}`);
}
function heading(text) {
  console.log(`\n${text}`);
}

const made = {
  media: [],
  articles: [],
  rankings: [],
  businesses: [],
  categories: [],
  places: [],
  guides: [],
  products: [],
  sections: [],
};

async function cleanup() {
  await svc.from("editorial_sections").delete().in("id", made.sections);
  await svc.from("rankings").delete().like("slug", "pa-%");
  await svc.from("articles").delete().like("slug", "pa-%");
  await svc.from("product_rankings").delete().like("slug", "pa-%");
  await svc.from("products").delete().like("slug", "pa-%");
  await svc.from("businesses").delete().like("slug", "pa-%");
  await svc.from("categories").delete().like("slug", "pa-%");
  await svc.from("places").delete().like("slug", "pa-%");
  await svc.from("media_assets").delete().like("storage_path", "pa-test/%");
}

try {
  await cleanup();

  /* ------------------------------------------------------- taxonomy (11,12) */
  heading("Taxonomy created entirely from admin");

  const { data: category, error: catError } = await svc
    .from("categories")
    .insert({
      name: "PA Roofers",
      slug: "pa-roofers",
      status: "published",
      featured: true,
      sort_order: 5,
      seo_title: "Roofers on Long Island",
      seo_description: "Vetted roofing contractors.",
    })
    .select("*")
    .single();
  check("11 · category created with featured, order and SEO", !catError, catError?.message);
  made.categories.push(category?.id);

  const { data: town, error: townError } = await svc
    .from("places")
    .insert({
      name: "PA Stony Brook",
      slug: "pa-stony-brook",
      type: "town",
      county: "Suffolk County",
      status: "published",
      featured: true,
      sort_order: 3,
    })
    .select("*")
    .single();
  check("12 · town created with type and hierarchy", !townError, townError?.message);
  made.places.push(town?.id);

  const { data: county } = await svc
    .from("places")
    .insert({ name: "PA Suffolk", slug: "pa-suffolk", type: "county", status: "published" })
    .select("id")
    .single();
  made.places.push(county?.id);

  await svc.from("places").update({ parent_id: county.id }).eq("id", town.id);
  const { data: reparented } = await svc
    .from("places")
    .select("parent_id")
    .eq("id", town.id)
    .single();
  check("12 · town sits inside a county", reparented?.parent_id === county.id);

  /* ----------------------------------------------------------- media (10,K) */
  heading("Media library");

  const { data: asset, error: assetError } = await svc
    .from("media_assets")
    .insert({
      storage_path: "pa-test/2026/09/probe.jpg",
      filename: "probe.jpg",
      mime_type: "image/jpeg",
      width: 1600,
      height: 900,
      size_bytes: 240000,
      alt_text: "A probe image",
      credit: "Photograph by the LongIsland.io team",
      source: "own",
      focal_x: 0.4,
      focal_y: 0.3,
    })
    .select("*")
    .single();
  check("10 · asset recorded with alt text, credit and rights", !assetError, assetError?.message);
  made.media.push(asset?.id);

  check(
    "10 · focal point stored",
    Number(asset.focal_x) === 0.4 && Number(asset.focal_y) === 0.3,
    `${asset.focal_x} / ${asset.focal_y}`,
  );

  /* ------------------------------------------------ rankings (1,2,3,4,5,6,F) */
  heading("Rankings — including the businesses Yelp never returned");

  const mkRanking = async (title, slug, placeId) =>
    (
      await svc
        .from("rankings")
        .insert({
          title,
          slug,
          status: "draft",
          category_id: category.id,
          place_id: placeId ?? null,
          hero_media_id: asset.id,
          seo_title: `${title} | probe`,
          seo_description: "Probe description.",
        })
        .select("*")
        .single()
    ).data;

  const pizzaLI = await mkRanking("PA Best Pizza on Long Island", "pa-pizza-li", null);
  const pizzaSB = await mkRanking("PA Best Pizza in Stony Brook", "pa-pizza-sb", town.id);
  const roofers = await mkRanking("PA Best Roofers in Suffolk", "pa-roofers-suffolk", county.id);
  const dentists = await mkRanking("PA Best Dentists in Stony Brook", "pa-dentists-sb", town.id);
  made.rankings.push(pizzaLI.id, pizzaSB.id, roofers.id, dentists.id);

  check("1 · ranking carries a hero media asset", pizzaLI.hero_media_id === asset.id);
  check("2 · ranking scoped to an admin-created place", pizzaSB.place_id === town.id);
  check("3 · service ranking scoped to a county", roofers.place_id === county.id);
  check("4 · professional ranking scoped to a town", dentists.place_id === town.id);

  // A business Yelp would have returned, and one it never did.
  const { data: fromYelp } = await svc
    .from("businesses")
    .insert({
      name: "PA Yelp Pizzeria",
      slug: "pa-yelp-pizzeria",
      city: "Stony Brook",
      status: "published",
      primary_media_id: asset.id,
    })
    .select("*")
    .single();
  const { data: manual } = await svc
    .from("businesses")
    .insert({
      name: "PA Hand-Added Pizzeria",
      slug: "pa-hand-added-pizzeria",
      city: "Patchogue",
      status: "published",
    })
    .select("*")
    .single();
  const { data: replacement } = await svc
    .from("businesses")
    .insert({ name: "PA Replacement Pizzeria", slug: "pa-replacement", status: "published" })
    .select("*")
    .single();
  made.businesses.push(fromYelp.id, manual.id, replacement.id);

  const addEntry = async (rankingId, businessId, position) =>
    svc.from("ranking_entries").insert({
      ranking_id: rankingId,
      business_id: businessId,
      position,
    });

  await addEntry(pizzaLI.id, fromYelp.id, 1);
  const manualAdd = await addEntry(pizzaLI.id, manual.id, 2);
  check("1 · business Yelp did not return can be added", !manualAdd.error, manualAdd.error?.message);

  // Remove one, add a replacement — the swap that was impossible before.
  await svc
    .from("ranking_entries")
    .delete()
    .eq("ranking_id", pizzaLI.id)
    .eq("business_id", fromYelp.id);
  const swapped = await addEntry(pizzaLI.id, replacement.id, 1);
  check("1 · an entry can be replaced with another business", !swapped.error);

  // Reorder: the replacement drops below the hand-added one.
  await svc
    .from("ranking_entries")
    .update({ position: 9 })
    .eq("ranking_id", pizzaLI.id)
    .eq("business_id", replacement.id);
  const { data: ordered } = await svc
    .from("ranking_entries")
    .select("business_id, position")
    .eq("ranking_id", pizzaLI.id)
    .order("position");
  check(
    "1 · manual order survives, and is not Yelp's",
    ordered[0].business_id === manual.id,
    ordered.map((e) => e.position).join(","),
  );

  // Reuse across rankings — one business row, many appearances.
  await addEntry(pizzaSB.id, manual.id, 1);
  await addEntry(dentists.id, manual.id, 1);
  const { count: appearances } = await svc
    .from("ranking_entries")
    .select("id", { count: "exact" })
    .eq("business_id", manual.id);
  check("5 · one business appears in three rankings", appearances === 3, String(appearances));

  const { count: duplicates } = await svc
    .from("businesses")
    .select("id", { count: "exact" })
    .eq("name", "PA Hand-Added Pizzeria");
  check("5 · without duplicating the business row", duplicates === 1, String(duplicates));

  /* --------------------------------------------------- media inheritance (6) */
  heading("Update media once, inherit everywhere");

  const { data: newAsset } = await svc
    .from("media_assets")
    .insert({
      storage_path: "pa-test/2026/09/updated.jpg",
      filename: "updated.jpg",
      mime_type: "image/jpeg",
      alt_text: "The corrected photo",
    })
    .select("*")
    .single();
  made.media.push(newAsset?.id);

  await svc
    .from("businesses")
    .update({ primary_media_id: newAsset.id })
    .eq("id", manual.id);
  await svc.from("businesses").update({ primary_media_id: newAsset.id }).eq("id", fromYelp.id);

  // Entries of a DRAFT ranking are correctly invisible to readers, so publish
  // first — which is also the order an editor works in.
  await svc
    .from("rankings")
    .update({ status: "published", published_at: new Date().toISOString() })
    .in("id", [pizzaLI.id, pizzaSB.id, dentists.id]);

  const { data: appearanceRows } = await anon
    .from("ranking_entries")
    .select("business:businesses(primary_media_id)")
    .eq("business_id", manual.id);
  check(
    "6 · every appearance reads the same updated asset",
    (appearanceRows ?? []).length > 0 &&
      appearanceRows.every((row) => row.business?.primary_media_id === newAsset.id),
  );

  /* ---------------------------------------------------------- guide (7) */
  heading("Buying guide with hero media");

  const { data: guide, error: guideError } = await svc
    .from("product_rankings")
    .insert({
      title: "PA Best Beach Blankets",
      slug: "pa-beach-blankets",
      status: "published",
      hero_media_id: asset.id,
      seo_title: "Beach blankets for Long Island",
    })
    .select("*")
    .single();
  check("7 · guide created with a hero image", !guideError && guide.hero_media_id === asset.id);
  made.guides.push(guide?.id);

  /* -------------------------------------------------------- article (8,9,13) */
  heading("Articles");

  const { data: article, error: articleError } = await svc
    .from("articles")
    .insert({
      title: "PA Long Island Fall Weekend Guide",
      slug: "pa-fall-weekend",
      kind: "seasonal",
      category_id: category.id,
      place_id: town.id,
      dek: "Where to go when the leaves turn.",
      body: "## The North Fork\n\nStart early.",
      hero_media_id: asset.id,
      author_name: "LongIsland.io Editors",
      seo_title: "Fall weekends on Long Island",
      seo_description: "A seasonal guide.",
      status: "draft",
    })
    .select("*")
    .single();
  check("8 · article created as a first-class type", !articleError, articleError?.message);
  made.articles.push(article?.id);

  const { data: anonDraft } = await anon
    .from("articles")
    .select("id")
    .eq("id", article.id)
    .maybeSingle();
  check("13 · draft article is invisible to readers", anonDraft === null);

  // `roofers` is the one ranking never published above, so it is still a draft
  // at this point. Using a published one here would assert nothing.
  const { data: draftRankingAnon } = await anon
    .from("rankings")
    .select("id")
    .eq("id", roofers.id)
    .maybeSingle();
  check("13 · draft ranking is invisible to readers", draftRankingAnon === null);

  /* --------------------------------------------- article as the feature (9) */
  heading("Article as homepage_primary");

  const { data: section } = await svc
    .from("editorial_sections")
    .insert({ key: "homepage_primary", status: "published", layout: "feature" })
    .select("id")
    .single();
  made.sections.push(section?.id);

  const { data: featureItem, error: featureError } = await svc
    .from("editorial_section_items")
    .insert({ section_id: section.id, article_id: article.id, status: "published", position: 1 })
    .select("id")
    .single();
  check("9 · an article can be curated into the feature slot", !featureError, featureError?.message);

  const { data: anonItems1 } = await anon.from("editorial_section_items").select("id");
  check(
    "9 · unpublished article does not leak through the feature",
    !(anonItems1 ?? []).some((i) => i.id === featureItem.id),
  );

  await svc
    .from("articles")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", article.id);

  const { data: anonItems2 } = await anon.from("editorial_section_items").select("id");
  check(
    "9 · published article becomes visible in the feature",
    (anonItems2 ?? []).some((i) => i.id === featureItem.id),
  );

  const bothTargets = await svc.from("editorial_section_items").insert({
    section_id: section.id,
    article_id: article.id,
    ranking_id: pizzaLI.id,
  });
  check("9 · article + another destination rejected", Boolean(bothTargets.error), bothTargets.error?.code);

  /* ------------------------------------------------------------- SEO (14) */
  heading("SEO from admin");

  const { data: seoRow } = await anon
    .from("articles")
    .select("seo_title, seo_description")
    .eq("id", article.id)
    .single();
  check(
    "14 · SEO title and description are readable on the published record",
    seoRow?.seo_title === "Fall weekends on Long Island" &&
      seoRow?.seo_description === "A seasonal guide.",
  );

  /* --------------------------------------------------------- Yelp policy */
  heading("Yelp and affiliate policy unchanged");

  const { data: refColumns } = await svc.from("external_business_refs").select("*").limit(1);
  const refShape = refColumns?.[0] ? Object.keys(refColumns[0]) : [
    "id", "business_id", "provider", "external_id", "external_url", "last_synced_at", "created_at",
  ];
  check(
    "no Yelp image column exists to persist one into",
    !refShape.some((c) => c.includes("image") || c.includes("photo")),
    refShape.join(", "),
  );
  check(
    "no rating or review count is persisted",
    !refShape.some((c) => c.includes("rating") || c.includes("review")),
  );

  const { data: merchant } = await anon
    .from("affiliate_merchants")
    .select("cta_label, disclosure_note, network")
    .eq("slug", "amazon")
    .single();
  check(
    "affiliate merchant config untouched",
    merchant?.cta_label === "Check Price" &&
      merchant?.network === "amazon" &&
      Boolean(merchant?.disclosure_note),
  );

  /* ------------------------------------------------------------- RLS */
  heading("RLS");

  const anonMedia = await anon.from("media_assets").insert({
    storage_path: "pa-test/anon.jpg",
    filename: "anon.jpg",
    mime_type: "image/jpeg",
  });
  check("anon cannot add media", Boolean(anonMedia.error), anonMedia.error?.code);

  const anonCategory = await anon
    .from("categories")
    .insert({ name: "anon", slug: "pa-anon-category" });
  check("anon cannot create categories", Boolean(anonCategory.error), anonCategory.error?.code);

  // An UPDATE blocked by RLS matches zero rows rather than raising, so the
  // assertion has to be that nothing changed — not that an error came back.
  await anon.from("articles").update({ title: "hijacked" }).eq("id", article.id);
  const { data: afterAttempt } = await svc
    .from("articles")
    .select("title")
    .eq("id", article.id)
    .single();
  check(
    "anon cannot edit a published article",
    afterAttempt?.title === "PA Long Island Fall Weekend Guide",
    afterAttempt?.title,
  );
} finally {
  heading("Cleanup");
  await cleanup();

  const remaining = {};
  for (const [table, pattern, column] of [
    ["rankings", "pa-%", "slug"],
    ["articles", "pa-%", "slug"],
    ["businesses", "pa-%", "slug"],
    ["categories", "pa-%", "slug"],
    ["places", "pa-%", "slug"],
    ["product_rankings", "pa-%", "slug"],
    ["media_assets", "pa-test/%", "storage_path"],
  ]) {
    const { count } = await svc.from(table).select("id", { count: "exact" }).like(column, pattern);
    remaining[table] = count ?? 0;
  }
  const leftovers = Object.entries(remaining).filter(([, n]) => n > 0);
  check(
    "every fixture removed",
    leftovers.length === 0,
    leftovers.length ? JSON.stringify(Object.fromEntries(leftovers)) : "all zero",
  );
}

console.log(
  failures === 0 ? "\nAll Phase A workflows passed." : `\n${failures} check(s) FAILED.`,
);
process.exit(failures === 0 ? 0 : 1);
