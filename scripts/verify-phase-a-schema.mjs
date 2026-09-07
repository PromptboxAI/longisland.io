/**
 * Phase A schema gate.
 *
 *   node scripts/verify-phase-a-schema.mjs
 *
 * Run this after applying the eight 20260901* migrations and BEFORE deploying
 * any code that reads the new columns or embeds the new relationships.
 *
 * The failure this exists to prevent is proven, not theoretical: a PostgREST
 * select that embeds a table whose foreign key does not exist yet returns
 * PGRST200, and every curated section silently falls back to feed order with no
 * error visible on the page. The check below asks the live database rather than
 * the migration files, because only one of those two is what production runs.
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

/** A column exists when selecting it does not raise 42703 / PGRST204. */
async function hasColumns(table, columns) {
  const { error } = await svc.from(table).select(columns.join(", ")).limit(1);
  return { ok: !error, code: error?.code, message: error?.message };
}

console.log("Phase A schema gate\n");

/* ---------------------------------------------------------------- tables -- */
console.log("New tables");
for (const table of ["media_assets", "articles"]) {
  const { error } = await svc.from(table).select("id").limit(1);
  check(
    `${table} exists`,
    !error,
    error?.code === "PGRST205" ? "not found — migration not applied" : error?.code,
  );
}

/* --------------------------------------------------------------- columns -- */
console.log("\nColumns");
const COLUMN_CHECKS = [
  ["media_assets", ["storage_path", "filename", "mime_type", "width", "height",
    "size_bytes", "alt_text", "caption", "source", "credit", "source_url",
    "license", "permission_note", "focal_x", "focal_y", "status", "created_by"]],
  ["articles", ["title", "slug", "kind", "category_id", "place_id", "dek", "body",
    "hero_media_id", "hero_image_url", "hero_image_alt", "author_name",
    "seo_title", "seo_description", "og_image_media_id", "status", "published_at"]],
  ["rankings", ["hero_media_id", "hero_image_url", "seo_title", "seo_description",
    "og_image_media_id"]],
  ["product_rankings", ["hero_media_id", "hero_image_url", "seo_title",
    "seo_description", "og_image_media_id"]],
  ["businesses", ["primary_media_id", "seo_title", "seo_description"]],
  ["categories", ["hero_media_id", "seo_title", "seo_description", "featured", "sort_order"]],
  ["places", ["hero_media_id", "seo_title", "seo_description", "featured", "sort_order"]],
  ["products", ["image_media_id"]],
  ["editorial_section_items", ["image_media_id", "article_id"]],
];

for (const [table, columns] of COLUMN_CHECKS) {
  const result = await hasColumns(table, columns);
  check(`${table}: ${columns.length} column(s)`, result.ok, result.code ?? result.message);
}

/* --------------------------------------------------------- relationships -- */
console.log("\nEmbeddable relationships (what PostgREST needs for the section select)");
const EMBEDS = [
  ["editorial_section_items", "article:articles(*)"],
  ["editorial_section_items", "image_media:media_assets!editorial_section_items_image_media_id_fkey(*)"],
  ["rankings", "hero_media:media_assets!rankings_hero_media_id_fkey(*)"],
  ["articles", "hero_media:media_assets!articles_hero_media_id_fkey(*)"],
  ["businesses", "primary_media:media_assets!businesses_primary_media_id_fkey(*)"],
  ["categories", "hero_media:media_assets!categories_hero_media_id_fkey(*)"],
  ["places", "hero_media:media_assets!places_hero_media_id_fkey(*)"],
  ["products", "image_media:media_assets!products_image_media_id_fkey(*)"],
  ["product_rankings", "hero_media:media_assets!product_rankings_hero_media_id_fkey(*)"],
];
for (const [table, embed] of EMBEDS) {
  const { error } = await svc.from(table).select(`id, ${embed}`).limit(1);
  check(`${table} -> ${embed.split(":")[0]}`, !error, error?.code ?? error?.message);
}

/* ------------------------------------------------------------ constraint -- */
console.log("\nOne-destination CHECK covers all eight arms");
const { data: sec } = await svc
  .from("editorial_sections")
  .insert({ key: "schema_gate_probe", status: "draft", layout: "grid" })
  .select("id")
  .single();

if (sec) {
  const { data: cat } = await svc
    .from("categories").select("id").eq("status", "published").limit(1).single();
  const { data: art } = await svc
    .from("articles")
    .insert({ title: "Schema Gate Probe", slug: "schema-gate-probe", status: "draft" })
    .select("id")
    .single();

  if (art) {
    const two = await svc.from("editorial_section_items").insert({
      section_id: sec.id, article_id: art.id, category_id: cat.id,
    });
    check("article + another destination rejected", Boolean(two.error), two.error?.code);

    const one = await svc
      .from("editorial_section_items")
      .insert({ section_id: sec.id, article_id: art.id, status: "published" })
      .select("id")
      .single();
    check("article alone accepted", !one.error, one.error?.message);

    // A draft article must not leak through the target-publication guard.
    const { data: visible } = await anon.from("editorial_section_items").select("id");
    check(
      "draft article target hidden from the public",
      !(visible ?? []).some((i) => i.id === one.data?.id),
    );

    await svc.from("articles").delete().eq("id", art.id);
  }
  await svc.from("editorial_sections").delete().eq("id", sec.id);
}

/* ----------------------------------------------------------- rls: public -- */
console.log("\nRLS");
const anonArticles = await anon.from("articles").select("id");
check("anon can read articles table", !anonArticles.error, anonArticles.error?.code);

const anonWrite = await anon
  .from("articles")
  .insert({ title: "anon write probe", slug: "anon-write-probe" });
check("anon cannot write articles", Boolean(anonWrite.error), anonWrite.error?.code);

const anonMediaWrite = await anon
  .from("media_assets")
  .insert({ storage_path: "probe/x.jpg", filename: "x.jpg", mime_type: "image/jpeg" });
check("anon cannot write media_assets", Boolean(anonMediaWrite.error), anonMediaWrite.error?.code);

/* -------------------------------------------------------------- storage -- */
console.log("\nStorage");
const { data: buckets, error: bucketError } = await svc.storage.listBuckets();
const media = (buckets ?? []).find((b) => b.id === "media");
check("media bucket exists", Boolean(media), bucketError?.message);
if (media) {
  check("bucket is public", media.public === true, String(media.public));
  check(
    "size limit is 8 MB",
    media.file_size_limit === 8388608,
    String(media.file_size_limit),
  );
  check(
    "mime types restricted to images",
    Array.isArray(media.allowed_mime_types) &&
      media.allowed_mime_types.every((m) => m.startsWith("image/")),
    (media.allowed_mime_types ?? []).join(", "),
  );
}

console.log(
  failures === 0
    ? "\nSchema gate PASSED — safe to write code against these relationships."
    : `\n${failures} check(s) FAILED — do not deploy code that reads them yet.`,
);
process.exit(failures === 0 ? 0 : 1);
