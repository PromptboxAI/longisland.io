import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
for (const l of readFileSync(".env.local","utf8").split("\n")) {
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g,"");
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

// Run every select the picker uses, exactly as written, against the real schema.
const specs = {
  ranking: ["rankings","id, title, slug, status, description, geography, hero_image_url, updated_at, category:categories(name), place:places(name), hero_media:media_assets!rankings_hero_media_id_fkey(*)"],
  article: ["articles","id, title, slug, status, dek, kind, hero_image_url, updated_at, category:categories(name), hero_media:media_assets!articles_hero_media_id_fkey(*)"],
  product_ranking: ["product_rankings","id, title, slug, status, description, hero_image_url, updated_at, category:product_categories(name), hero_media:media_assets!product_rankings_hero_media_id_fkey(*)"],
  product: ["products","id, name, brand, slug, status, short_description, editorial_summary, image_url, image_media_id, updated_at, category:product_categories(name), image_media:media_assets!products_image_media_id_fkey(*)"],
  business: ["businesses","id, name, slug, status, city, editorial_summary, description, primary_image_url, updated_at, category:categories(name), primary_media:media_assets!businesses_primary_media_id_fkey(*)"],
  category: ["categories","id, name, slug, status, description, hero_image_url, updated_at, hero_media:media_assets!categories_hero_media_id_fkey(*)"],
  place: ["places","id, name, slug, status, description, type, hero_image_url, updated_at, hero_media:media_assets!places_hero_media_id_fkey(*)"],
};
let bad = 0;
for (const [kind,[table,select]] of Object.entries(specs)) {
  const { error } = await db.from(table).select(select).limit(1);
  const ok = !error;
  if (!ok) bad++;
  console.log(`${ok?"PASS":"FAIL"}  ${kind.padEnd(16)} ${table.padEnd(18)} ${error? error.message : ""}`);
}
// And the searchable columns must exist too.
const searchable = { rankings:["title","slug"], articles:["title","slug"], product_rankings:["title","slug"],
  products:["name","brand","slug"], businesses:["name","city","slug"], categories:["name","slug"], places:["name","slug"] };
console.log("\nsearchable columns:");
for (const [table, cols] of Object.entries(searchable)) {
  const { error } = await db.from(table).select(cols.join(",")).limit(1);
  if (error) { bad++; console.log(`FAIL  ${table}: ${error.message}`); }
  else console.log(`PASS  ${table}: ${cols.join(", ")}`);
}
console.log(bad === 0 ? "\nALL SELECTS VALID" : `\n${bad} BROKEN`);
