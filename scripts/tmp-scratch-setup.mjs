import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
for (const l of readFileSync(".env.local","utf8").split("\n")) {
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g,"");
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const SLUG = "zz-scratch-staging-test";

// Clean any previous run first, so this is repeatable.
const { data: old } = await db.from("rankings").select("id").eq("slug", SLUG).maybeSingle();
if (old) {
  await db.from("ranking_entries").delete().eq("ranking_id", old.id);
  await db.from("rankings").delete().eq("id", old.id);
  console.log("removed previous scratch ranking");
}
for (const n of ["ZZ Scratch Bagel Co","ZZ Scratch Pizza Co","ZZ Scratch Deli Co"]) {
  await db.from("businesses").delete().eq("name", n);
}

// Three scratch businesses in real Suffolk towns.
const towns = [["ZZ Scratch Bagel Co","Stony Brook"],["ZZ Scratch Pizza Co","Smithtown"],["ZZ Scratch Deli Co","Commack"]];
const bizIds = [];
for (const [name, city] of towns) {
  const { data, error } = await db.from("businesses").insert({
    name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g,"-"),
    city, county: "Suffolk County", status: "published",
    address: `1 Scratch Road, ${city}`, phone: "(631) 555-0100",
  }).select("id").single();
  if (error) { console.error(name, error.message); process.exit(1); }
  bizIds.push(data.id);
}

const { data: ranking, error: rErr } = await db.from("rankings").insert({
  title: "ZZ Scratch Staging Test",
  slug: SLUG,
  geography: "Long Island",
  description: "LIVE-DEK original",
  intro: "LIVE-INTRO original",
  methodology: "LIVE-METHODOLOGY original",
  author_name: "Scratch",
  status: "published",
  published_at: new Date().toISOString(),
}).select("id").single();
if (rErr) { console.error(rErr.message); process.exit(1); }

for (let i = 0; i < bizIds.length; i++) {
  await db.from("ranking_entries").insert({
    ranking_id: ranking.id, business_id: bizIds[i], position: i + 1,
    // Entry 1 carries manual copy, so Generate Missing has something to skip.
    ...(i === 0 ? { best_for: "MANUAL-BESTFOR keep me", editorial_reason: "MANUAL-REASON keep me too." } : {}),
  });
}

console.log("scratch ranking id:", ranking.id);
console.log("public url: /best/" + SLUG);
const { data: ents } = await db.from("ranking_entries")
  .select("id, position, best_for, business:businesses(name)").eq("ranking_id", ranking.id).order("position");
for (const e of ents) console.log(`  entry ${e.position} ${e.id} ${e.business.name} best_for=${JSON.stringify(e.best_for)}`);
