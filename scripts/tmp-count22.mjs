import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
for (const l of readFileSync(".env.local","utf8").split("\n")) {
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g,"");
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const { data } = await db.from("affiliate_clicks").select("source_path,placement")
  .eq("product_id","87bf8ce9-4056-4f69-83ce-5fba7d6fa71a");
const seq = (data??[]).filter(r=>r.placement==="reliability_test").length;
const burst = (data??[]).filter(r=>r.placement==="reliability_burst").length;
const seen = new Set((data??[]).map(r=>r.source_path));
const missing = [];
for (let i=1;i<=22;i++) if (!seen.has(`/rel-test-${i}`)) missing.push(i);
console.log(`sequential (1-10) : ${seq} of 10`);
console.log(`concurrent (11-22): ${burst} of 12`);
console.log(`total             : ${data?.length ?? 0} of 22`);
console.log("missing:", missing.length ? missing.join(", ") : "none");
