import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
for (const l of readFileSync(".env.local","utf8").split("\n")) {
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g,"");
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const src=readFileSync("src/lib/yelp/areas.ts","utf8");
const sets={};
for (const n of ["NASSAU_TOWNS","SUFFOLK_TOWNS"]) {
  const i=src.indexOf(`const ${n}`); const b=src.slice(src.indexOf("[",i), src.indexOf("]",i));
  sets[n]=new Set([...b.matchAll(/"([^"]+)"/g)].map(m=>m[1]));
}
const derive=(city)=>{ if(!city) return null; const k=city.trim().toLowerCase();
  return sets.NASSAU_TOWNS.has(k)?"Nassau County":sets.SUFFOLK_TOWNS.has(k)?"Suffolk County":null; };

console.log("=== SEARCH: Legends of Fear / Shelton ===");
const { data: legends } = await db.from("businesses").select("id,name,city,county,zip,status").or("name.ilike.%Legends%,city.ilike.%Shelton%");
console.log(legends?.length ? JSON.stringify(legends,null,2) : "  no stored business matches 'Legends' or 'Shelton'");

console.log("\n=== §5a: every business whose stored county contradicts its city ===");
const { data: all } = await db.from("businesses").select("id,name,city,county,zip,status");
let bad=0;
for (const b of all ?? []) {
  if (!b.county) continue;
  const real = derive(b.city);
  if (real !== b.county) { bad++; console.log(`  FABRICATED  ${b.name} | city=${b.city} | stored=${b.county} | derived=${real} | zip=${b.zip} | ${b.status}`); }
}
if (!bad) console.log("  none");

console.log("\n=== §5b: businesses in rankings that are not in a recognised LI town ===");
const { data: entries } = await db.from("ranking_entries")
  .select("id,position,ranking:rankings(title,slug,status,geography),business:businesses(id,name,city,county,zip,status)")
  .order("position");
let out=0;
for (const e of entries ?? []) {
  const c = derive(e.business?.city);
  void c;
  if (!c) { out++; console.log(`  REVIEW  "${e.ranking?.title}" #${e.position} -> ${e.business?.name} (${e.business?.city ?? "no city"}, zip ${e.business?.zip ?? "?"}) | ranking ${e.ranking?.status}`); }
}
if (!out) console.log("  none");

console.log(`\ntotals: ${all?.length ?? 0} businesses, ${bad} fabricated counties, ${out} ranking entries needing review`);
