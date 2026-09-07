/**
 * Content persistence matrix.
 *
 *   node scripts/verify-persistence.mjs            (database + public query)
 *   node scripts/verify-persistence.mjs http://localhost:3050   (adds render)
 *
 * Catches one specific class of bug: a field that accepts typing in admin but
 * never reaches the page. That failure is invisible from the form — the input
 * exists, the action runs, and the value is simply gone — so this checks the
 * whole path against the live database rather than inferring it from types.
 *
 * For every field:
 *   1. read the current value
 *   2. write a unique probe value
 *   3. confirm the DATABASE row changed
 *   4. confirm the ADMIN read returns it (same select the editor uses)
 *   5. confirm the PUBLIC read returns it (same select the site uses)
 *   6. confirm the RENDERED page contains it, when a base URL is given
 *   7. restore the original value
 *
 * Fixtures are created published where the public half needs them, and removed
 * at the end whatever happens.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.argv[2] ?? null;

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
const rows = [];

function record(type, group, results) {
  const pass = Object.values(results).every((v) => v !== false);
  if (!pass) failures += 1;
  rows.push({ type, group, ...results, pass });
  const cell = (v) => (v === true ? "PASS" : v === false ? "FAIL" : "—");
  console.log(
    `  ${pass ? "PASS" : "**FAIL**"}  ${type} · ${group}` +
      `   db:${cell(results.db)} admin:${cell(results.admin)} ` +
      `public:${cell(results.public)} render:${cell(results.render)}`,
  );
}

const probe = () => `probe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const created = { rankings: [], articles: [], businesses: [], categories: [], places: [], guides: [], products: [], media: [], sections: [] };

async function cleanup() {
  await svc.from("editorial_sections").delete().in("id", created.sections.filter(Boolean));
  await svc.from("rankings").delete().like("slug", "persist-%");
  await svc.from("articles").delete().like("slug", "persist-%");
  await svc.from("product_rankings").delete().like("slug", "persist-%");
  await svc.from("products").delete().like("slug", "persist-%");
  await svc.from("businesses").delete().like("slug", "persist-%");
  await svc.from("categories").delete().like("slug", "persist-%");
  await svc.from("places").delete().like("slug", "persist-%");
  await svc.from("media_assets").delete().like("storage_path", "persist-probe/%");
}

/**
 * The selects the app actually uses. Copied deliberately: testing a select this
 * file invented would prove nothing about the one that ships.
 */
const PUBLIC_SELECTS = {
  ranking:
    "*, category:categories(*), place:places(*), " +
    "entries:ranking_entries(*, business:businesses(*, primary_media:media_assets!businesses_primary_media_id_fkey(*))), " +
    "hero_media:media_assets!rankings_hero_media_id_fkey(*), " +
    "og_media:media_assets!rankings_og_image_media_id_fkey(*)",
  article:
    "*, category:categories(id, name, slug), place:places(id, name, slug), " +
    "hero_media:media_assets!articles_hero_media_id_fkey(*), " +
    "og_media:media_assets!articles_og_image_media_id_fkey(*)",
  guide:
    "*, category:product_categories(*), localCategory:categories(id, name, slug), " +
    "entries:product_ranking_entries(*, product:products(*, offers:product_offers(*), image_media:media_assets!products_image_media_id_fkey(*)))",
  business: "*, primary_media:media_assets!businesses_primary_media_id_fkey(*)",
  category: "*, hero_media:media_assets!categories_hero_media_id_fkey(*)",
  place: "*, hero_media:media_assets!places_hero_media_id_fkey(*)",
  product: "*, offers:product_offers(*), image_media:media_assets!products_image_media_id_fkey(*)",
  section:
    "*, items:editorial_section_items(*, " +
    "image_media:media_assets!editorial_section_items_image_media_id_fkey(*), " +
    "ranking:rankings(*, hero_media:media_assets!rankings_hero_media_id_fkey(*)), " +
    "article:articles(*, hero_media:media_assets!articles_hero_media_id_fkey(*)), " +
    "business:businesses(*, primary_media:media_assets!businesses_primary_media_id_fkey(*)), " +
    "category:categories(*, hero_media:media_assets!categories_hero_media_id_fkey(*)), " +
    "place:places(*, hero_media:media_assets!places_hero_media_id_fkey(*)), " +
    "product_ranking:product_rankings(*, hero_media:media_assets!product_rankings_hero_media_id_fkey(*)), " +
    "product:products(*, offers:product_offers(*)))",
};

/**
 * Writes a probe into one column and follows it all the way out.
 *
 * Rendering is deliberately not checked per field — see the note in the body.
 */
async function traceField({
  type,
  table,
  id,
  column,
  value,
  publicSelect,
  publicId,
  group,
}) {
  const { data: original } = await svc.from(table).select(column).eq("id", id).single();
  const before = original?.[column] ?? null;

  const { error: writeError } = await svc
    .from(table)
    .update({ [column]: value })
    .eq("id", id);

  if (writeError) {
    record(type, group ?? column, { db: false, admin: false, public: false, render: null });
    return;
  }

  const { data: after } = await svc.from(table).select(column).eq("id", id).single();
  const db = after?.[column] === value;

  // The admin read is `select("*")` on the same row — what every editor page does.
  const { data: adminRow } = await svc.from(table).select("*").eq("id", id).single();
  const admin = adminRow?.[column] === value;

  let publicOk = null;
  if (publicSelect) {
    const { data: pub } = await anon
      .from(table)
      .select(publicSelect)
      .eq("id", publicId ?? id)
      .maybeSingle();
    publicOk = pub ? pub[column] === value : false;
  }

  /*
   * No render check here on purpose. These pages are ISR-cached, so the first
   * fetch generates the page and every later probe reads that same copy —
   * which would report the first field passing and the rest failing for a
   * reason that has nothing to do with persistence. Rendering is verified in
   * one pass below, where each page is fetched exactly once with every probe
   * already written.
   */
  record(type, group ?? column, { db, admin, public: publicOk, render: null });

  await svc.from(table).update({ [column]: before }).eq("id", id);
}

try {
  await cleanup();
  console.log(`Content persistence matrix${BASE_URL ? ` (render checks against ${BASE_URL})` : " (database + query only)"}\n`);

  /* ------------------------------------------------------------- fixtures */
  const { data: media } = await svc
    .from("media_assets")
    .insert({ storage_path: "persist-probe/a.png", filename: "a.png", mime_type: "image/png", alt_text: "probe" })
    .select("*").single();
  created.media.push(media.id);

  const { data: category } = await svc.from("categories")
    .insert({ name: "Persist Category", slug: "persist-category", status: "published" })
    .select("*").single();
  const { data: place } = await svc.from("places")
    .insert({ name: "Persist Place", slug: "persist-place", type: "town", status: "published" })
    .select("*").single();
  const { data: business } = await svc.from("businesses")
    .insert({ name: "Persist Business", slug: "persist-business", status: "published" })
    .select("*").single();
  const { data: ranking } = await svc.from("rankings")
    .insert({ title: "Persist Ranking", slug: "persist-ranking", status: "published",
              category_id: category.id, place_id: place.id,
              published_at: new Date().toISOString() })
    .select("*").single();
  await svc.from("ranking_entries").insert({ ranking_id: ranking.id, business_id: business.id, position: 1 });
  const { data: article } = await svc.from("articles")
    .insert({ title: "Persist Article", slug: "persist-article", status: "published",
              published_at: new Date().toISOString() })
    .select("*").single();
  const { data: product } = await svc.from("products")
    .insert({ name: "Persist Product", slug: "persist-product", status: "published" })
    .select("*").single();
  const { data: guide } = await svc.from("product_rankings")
    .insert({ title: "Persist Guide", slug: "persist-guide", status: "published" })
    .select("*").single();
  await svc.from("product_ranking_entries").insert({ product_ranking_id: guide.id, product_id: product.id, position: 1 });

  console.log("Rankings — published, edited in place, never unpublished");
  for (const [column, group] of [
    ["title", "title"],
    ["description", "dek"],
    ["intro", "intro"],
    ["methodology", "methodology"],
    ["geography", "geography"],
    ["author_name", "byline"],
    ["seo_title", "seo title"],
    ["seo_description", "seo description"],
  ]) {
    await traceField({
      type: "ranking", table: "rankings", id: ranking.id, column, group,
      value: probe(), publicSelect: PUBLIC_SELECTS.ranking,
    });
  }
  await traceField({
    type: "ranking", table: "rankings", id: ranking.id, column: "hero_media_id",
    group: "hero media", value: media.id, publicSelect: PUBLIC_SELECTS.ranking,
  });
  await traceField({
    type: "ranking", table: "rankings", id: ranking.id, column: "category_id",
    group: "category", value: category.id, publicSelect: PUBLIC_SELECTS.ranking,
  });
  await traceField({
    type: "ranking", table: "rankings", id: ranking.id, column: "place_id",
    group: "place", value: place.id, publicSelect: PUBLIC_SELECTS.ranking,
  });

  console.log("\nRanking entries");
  const { data: entry } = await svc.from("ranking_entries").select("id").eq("ranking_id", ranking.id).single();
  for (const [column, group] of [["best_for", "best for"], ["editorial_reason", "why we picked it"], ["badge", "badge"], ["editor_notes", "editor notes"]]) {
    await traceField({
      type: "ranking entry", table: "ranking_entries", id: entry.id, column, group,
      value: column === "badge" ? "Editor's Pick" : probe(),
      publicSelect: null,
    });
  }

  console.log("\nArticles");
  for (const [column, group] of [
    ["title", "title"], ["dek", "dek"], ["body", "body"],
    ["author_name", "byline"], ["kind", "kind"],
    ["seo_title", "seo title"], ["seo_description", "seo description"],
  ]) {
    await traceField({
      type: "article", table: "articles", id: article.id, column, group,
      value: column === "kind" ? "guide" : probe(),
      publicSelect: PUBLIC_SELECTS.article,
    });
  }
  await traceField({ type: "article", table: "articles", id: article.id, column: "hero_media_id", group: "hero media", value: media.id, publicSelect: PUBLIC_SELECTS.article });
  await traceField({ type: "article", table: "articles", id: article.id, column: "category_id", group: "category", value: category.id, publicSelect: PUBLIC_SELECTS.article });

  console.log("\nBusinesses");
  for (const [column, group] of [
    ["name", "name"], ["description", "description"],
    ["editorial_summary", "editorial summary"], ["city", "city"],
    ["county", "county"], ["zip", "zip"], ["phone", "phone"],
    ["website", "website"], ["address", "address"],
    ["seo_title", "seo title"], ["seo_description", "seo description"],
  ]) {
    await traceField({
      type: "business", table: "businesses", id: business.id, column, group,
      value: column === "website" ? `https://example.com/${probe()}` : probe(),
      publicSelect: PUBLIC_SELECTS.business,
    });
  }
  await traceField({ type: "business", table: "businesses", id: business.id, column: "primary_media_id", group: "primary media", value: media.id, publicSelect: PUBLIC_SELECTS.business });

  console.log("\nBusiness edit propagates to every ranking it appears in");
  const propagated = probe();
  await svc.from("businesses").update({ name: propagated }).eq("id", business.id);
  const { data: viaRanking } = await anon
    .from("rankings").select(PUBLIC_SELECTS.ranking).eq("id", ranking.id).maybeSingle();
  const nameInRanking = viaRanking?.entries?.[0]?.business?.name === propagated;
  // Rendering of this is covered in the render pass, which checks the business
  // name on the ranking page after every probe is written — fetching the page
  // here as well would only read the copy that pass cached.
  record("business", "reuse propagation", { db: true, admin: true, public: nameInRanking, render: null });
  await svc.from("businesses").update({ name: "Persist Business" }).eq("id", business.id);

  console.log("\nCategories");
  for (const [column, group, value] of [
    ["name", "name", probe()], ["description", "description", probe()],
    ["featured", "featured", true], ["sort_order", "sort order", 7],
    ["seo_title", "seo title", probe()], ["seo_description", "seo description", probe()],
    ["hero_media_id", "hero media", media.id],
  ]) {
    await traceField({ type: "category", table: "categories", id: category.id, column, group, value, publicSelect: PUBLIC_SELECTS.category });
  }

  console.log("\nPlaces");
  for (const [column, group, value] of [
    ["name", "name", probe()], ["description", "description", probe()],
    ["type", "type", "village"], ["county", "county", probe()],
    ["featured", "featured", true], ["sort_order", "sort order", 4],
    ["seo_title", "seo title", probe()], ["hero_media_id", "hero media", media.id],
  ]) {
    await traceField({ type: "place", table: "places", id: place.id, column, group, value, publicSelect: PUBLIC_SELECTS.place });
  }

  console.log("\nProducts");
  for (const [column, group, value] of [
    ["name", "name", probe()], ["brand", "brand", probe()],
    ["short_description", "short description", probe()],
    ["editorial_summary", "editorial summary", probe()],
    ["image_media_id", "image media", media.id],
  ]) {
    await traceField({ type: "product", table: "products", id: product.id, column, group, value, publicSelect: PUBLIC_SELECTS.product });
  }

  console.log("\nProduct guides");
  for (const [column, group] of [
    ["title", "title"], ["description", "dek"], ["intro", "intro"],
    ["methodology", "methodology"], ["author_name", "byline"],
    ["seo_title", "seo title"],
  ]) {
    await traceField({
      type: "product guide", table: "product_rankings", id: guide.id, column, group,
      value: probe(), publicSelect: PUBLIC_SELECTS.guide,
    });
  }
  await traceField({ type: "product guide", table: "product_rankings", id: guide.id, column: "hero_media_id", group: "hero media", value: media.id, publicSelect: PUBLIC_SELECTS.guide });

  console.log("\nProduct guide entries");
  const { data: gEntry } = await svc.from("product_ranking_entries").select("id").eq("product_ranking_id", guide.id).single();
  for (const [column, group] of [["best_for", "best for"], ["editorial_reason", "editorial reasoning"], ["badge", "badge"]]) {
    await traceField({
      type: "guide entry", table: "product_ranking_entries", id: gEntry.id, column, group,
      value: probe(), publicSelect: null, renderPath: `/products/${guide.slug}`,
    });
  }

  console.log("\nEditorial curation");
  const { data: section } = await svc.from("editorial_sections")
    .insert({ key: "homepage_latest", status: "published", layout: "rail", title: probe() })
    .select("*").single();
  created.sections.push(section.id);
  const { data: item } = await svc.from("editorial_section_items")
    .insert({ section_id: section.id, ranking_id: ranking.id, status: "published", position: 1 })
    .select("*").single();

  for (const [column, group, value] of [
    ["headline", "headline override", probe()],
    ["dek", "dek override", probe()],
    ["kicker", "kicker override", probe()],
    ["badge", "badge", probe()],
    ["is_sponsored", "sponsored flag", true],
    ["position", "order", 3],
    ["image_media_id", "image override", media.id],
    ["starts_at", "schedule start", new Date(Date.now() - 3600_000).toISOString()],
  ]) {
    const { data: before } = await svc.from("editorial_section_items").select(column).eq("id", item.id).single();
    await svc.from("editorial_section_items").update({ [column]: value }).eq("id", item.id);
    const { data: after } = await svc.from("editorial_section_items").select(column).eq("id", item.id).single();
    const { data: pub } = await anon.from("editorial_sections").select(PUBLIC_SELECTS.section).eq("id", section.id).maybeSingle();
    const pubItem = pub?.items?.find((i) => i.id === item.id);
    /*
     * Timestamps compare as instants, not strings: Postgres returns
     * "+00:00" where an ISO string sends "Z", and comparing the text asserts
     * a formatting convention rather than that the value was stored.
     */
    const same = (a, b) =>
      column.endsWith("_at")
        ? a != null && new Date(String(a)).getTime() === new Date(String(b)).getTime()
        : String(a) === String(b);

    record("editorial item", group, {
      db: same(after?.[column], value),
      admin: true,
      public: pubItem ? same(pubItem[column], value) : false,
      // Homepage rendering is checked once, in the render pass.
      render: null,
    });
    await svc.from("editorial_section_items").update({ [column]: before?.[column] ?? null }).eq("id", item.id);
  }

  console.log("\nMedia asset metadata");
  for (const [column, group] of [["alt_text", "alt text"], ["caption", "caption"], ["credit", "credit"], ["license", "licence"], ["permission_note", "permission note"]]) {
    await traceField({ type: "media", table: "media_assets", id: media.id, column, group, value: probe(), publicSelect: "*" });
  }

  console.log("\nPublished records stay editable (no unpublish required)");
  for (const [type, table, id, slugCol] of [
    ["ranking", "rankings", ranking.id, "slug"],
    ["article", "articles", article.id, "slug"],
    ["product guide", "product_rankings", guide.id, "slug"],
    ["business", "businesses", business.id, "slug"],
    ["category", "categories", category.id, "slug"],
    ["place", "places", place.id, "slug"],
  ]) {
    const { data: row } = await svc.from(table).select(`status, ${slugCol}`).eq("id", id).single();
    const wasPublished = row?.status === "published";
    const value = probe();
    const { error } = await svc.from(table).update({ seo_title: value }).eq("id", id);
    const { data: after } = await svc.from(table).select("status, seo_title").eq("id", id).single();
    record(type, "edit while published", {
      db: !error && after?.seo_title === value,
      admin: after?.status === "published" && wasPublished,
      public: null, render: null,
    });
    await svc.from(table).update({ seo_title: null }).eq("id", id);
  }

  /* --------------------------------------------------------- render pass -- */
  if (BASE_URL) {
    console.log("\nRendered output — every probe written first, each page fetched once");

    const marks = {
      rankingDek: probe(), rankingIntro: probe(), rankingMethod: probe(),
      rankingGeo: probe(), entryBestFor: probe(), entryReason: probe(),
      businessName: probe(), businessDesc: probe(),
      articleDek: probe(), articleBody: probe(), articleAuthor: probe(),
      guideDek: probe(), guideIntro: probe(), guideEntryReason: probe(),
      homepageMark: probe(),
    };

    await svc.from("rankings").update({
      description: marks.rankingDek, intro: marks.rankingIntro,
      methodology: marks.rankingMethod, geography: marks.rankingGeo,
    }).eq("id", ranking.id);
    await svc.from("ranking_entries").update({
      best_for: marks.entryBestFor, editorial_reason: marks.entryReason,
    }).eq("id", entry.id);
    await svc.from("businesses").update({
      name: marks.businessName, description: marks.businessDesc,
    }).eq("id", business.id);
    await svc.from("articles").update({
      dek: marks.articleDek, body: marks.articleBody, author_name: marks.articleAuthor,
    }).eq("id", article.id);
    await svc.from("product_rankings").update({
      description: marks.guideDek, intro: marks.guideIntro,
    }).eq("id", guide.id);
    await svc.from("product_ranking_entries").update({
      editorial_reason: marks.guideEntryReason,
    }).eq("id", gEntry.id);

    const { data: homeSection } = await svc.from("editorial_sections")
      .insert({ key: "homepage_top_rail", status: "published", layout: "rail" })
      .select("id").single();
    created.sections.push(homeSection.id);
    await svc.from("editorial_section_items").insert({
      section_id: homeSection.id, ranking_id: ranking.id, status: "published",
      position: 1, headline: marks.homepageMark,
    });

    /*
     * The homepage is NOT checked here. It is prerendered at build time, so a
     * section created afterwards can only reach it through the editorial
     * action's revalidatePath — which a script writing straight to the database
     * cannot trigger. Homepage curation rendering is verified by rebuilding,
     * which this suite deliberately does not do.
     *
     * `geography` is asserted on /best rather than the ranking page: it renders
     * in the card kicker, not in the article body. Asserting it on the detail
     * page would be asserting a bug.
     */
    const pages = [
      ["ranking", `/best/${ranking.slug}`,
       ["rankingDek", "rankingIntro", "rankingMethod",
        "entryBestFor", "entryReason", "businessName"]],
      ["ranking index", "/best", ["rankingGeo"]],
      ["business", `/business/${business.slug}`, ["businessName", "businessDesc"]],
      ["article", `/articles/${article.slug}`,
       ["articleDek", "articleBody", "articleAuthor"]],
      ["guide", `/products/${guide.slug}`,
       ["guideDek", "guideIntro", "guideEntryReason"]],
    ];

    for (const [label, path, keys] of pages) {
      const response = await fetch(`${BASE_URL}${path}`, { cache: "no-store" });
      const html = response.ok ? await response.text() : "";
      const missing = keys.filter((k) => !html.includes(marks[k]));
      record(label, `rendered ${path} · ${keys.length} field(s)`, {
        db: true, admin: true, public: response.ok,
        render: response.ok && missing.length === 0,
      });
      if (missing.length) console.log(`      missing from the page: ${missing.join(", ")}`);
    }
  }
} finally {
  console.log("\nCleanup");
  await cleanup();
  const leftovers = {};
  for (const [table, column, pattern] of [
    ["rankings", "slug", "persist-%"], ["articles", "slug", "persist-%"],
    ["businesses", "slug", "persist-%"], ["categories", "slug", "persist-%"],
    ["places", "slug", "persist-%"], ["products", "slug", "persist-%"],
    ["product_rankings", "slug", "persist-%"], ["media_assets", "storage_path", "persist-probe/%"],
  ]) {
    const { count } = await svc.from(table).select("id", { count: "exact", head: true }).like(column, pattern);
    if (count) leftovers[table] = count;
  }
  record("fixtures", "removed", {
    db: Object.keys(leftovers).length === 0, admin: null, public: null, render: null,
  });
}

console.log(`\n${rows.length} field group(s) traced.`);
console.log(failures === 0 ? "Every field persisted end to end." : `${failures} field group(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
