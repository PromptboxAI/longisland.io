import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
for (const l of readFileSync(".env.local","utf8").split("\n")) {
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g,"");
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const { data: sec } = await db.from("editorial_sections").select("id,status").eq("key","homepage_top_picks").single();
const { data: items } = await db.from("editorial_section_items").select("id, product:products(name)").eq("section_id", sec.id);
console.log("Top Picks section:", sec.id, "status:", sec.status);
console.log("existing items:", (items??[]).map(i=>i.product?.name ?? "(non-product)").join(", ") || "none");
