/**
 * Seeds the taxonomy (categories and places) into Supabase.
 *
 *   npm run db:seed
 *
 * Reads the SAME taxonomy the app falls back to (src/lib/data/seed/taxonomy.ts)
 * so there is one source of truth. Requires the schema to exist already — run
 * the migrations first (npm run db:push, or paste supabase/migrations/*.sql
 * into the dashboard SQL editor in filename order).
 *
 * Idempotent: upserts on `slug`, so running it twice changes nothing.
 *
 * Only categories and places are seeded. The seed BUSINESSES are fictional and
 * must never reach a real database — real businesses come in through
 * /admin/generate.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import { SEED_CATEGORIES, SEED_PLACES } from "../src/lib/data/seed/taxonomy.ts";

function readEnv() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      }),
  );
}

const env = readEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secret = env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local",
  );
  process.exit(1);
}

// Service role: seeding writes rows an anonymous client is not allowed to write.
const db = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Inserts rows in two passes.
 *
 * The seed files use synthetic string ids (`cat_pizza`) to express parentage,
 * but the database generates uuids. So: insert everything parentless, read the
 * uuid Supabase assigned for each slug, then wire parents up by slug.
 */
async function seedTree(table, rows, toRow) {
  const bySeedId = new Map(rows.map((row) => [row.id, row]));

  const { error: upsertError } = await db
    .from(table)
    .upsert(rows.map(toRow), { onConflict: "slug" });

  if (upsertError) {
    throw new Error(`${table}: ${upsertError.message}`);
  }

  const { data: saved, error: readError } = await db
    .from(table)
    .select("id, slug");

  if (readError) throw new Error(`${table}: ${readError.message}`);

  const idBySlug = new Map(saved.map((row) => [row.slug, row.id]));

  let linked = 0;
  for (const row of rows) {
    if (!row.parent_id) continue;

    const parentSlug = bySeedId.get(row.parent_id)?.slug;
    const parentId = parentSlug ? idBySlug.get(parentSlug) : undefined;
    const childId = idBySlug.get(row.slug);
    if (!parentId || !childId) continue;

    const { error } = await db
      .from(table)
      .update({ parent_id: parentId })
      .eq("id", childId);

    if (error) throw new Error(`${table} parent link: ${error.message}`);
    linked += 1;
  }

  return { total: rows.length, linked };
}

const categories = await seedTree(
  "categories",
  SEED_CATEGORIES,
  ({ name, slug, description, icon, status }) => ({
    name,
    slug,
    description,
    icon,
    status,
  }),
);
console.log(
  `categories: ${categories.total} upserted, ${categories.linked} parents linked`,
);

const places = await seedTree(
  "places",
  SEED_PLACES,
  ({ name, slug, type, county, description, status }) => ({
    name,
    slug,
    type,
    county,
    description,
    status,
  }),
);
console.log(`places:     ${places.total} upserted, ${places.linked} parents linked`);

console.log("\nDone. Public pages will now read live data instead of seed content.");
