import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
for (const l of readFileSync(".env.local","utf8").split("\n")) {
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g,"");
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const { data } = await db.from("editorial_sections").select("id,key,scope_type,category_id").in("key",["category_module","category_links"]);
console.log("category sections in db:", data?.length ?? 0, JSON.stringify(data));
// Reproduce the insert the dashboard attempts.
const { error } = await db.from("editorial_sections").insert({
  key:"category_module", scope_type:"category", category_id:null, place_id:null,
  title:"Featured", layout:"grid", max_items:8, status:"draft",
});
console.log("insert with null category_id ->", error ? `REJECTED: ${error.message.slice(0,90)}` : "accepted (unexpected)");
