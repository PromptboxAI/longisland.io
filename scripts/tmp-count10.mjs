import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
for (const l of readFileSync(".env.local","utf8").split("\n")) {
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g,"");
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const { data } = await db.from("affiliate_clicks").select("source_path,clicked_at")
  .eq("product_id","87bf8ce9-4056-4f69-83ce-5fba7d6fa71a").order("clicked_at");
console.log(`rows recorded: ${data?.length ?? 0} of 10`);
const seen = new Set((data ?? []).map(r => r.source_path));
const missing = [];
for (let i=1;i<=10;i++) if (!seen.has(`/rel-test-${i}`)) missing.push(i);
console.log("distinct source paths:", seen.size);
console.log("missing clicks:", missing.length ? missing.join(", ") : "none");
