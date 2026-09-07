import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
for (const l of readFileSync(".env.local","utf8").split("\n")) {
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g,"");
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const R="8f2b8261-1050-4858-a1e1-7989e94ba505";
const { data: r } = await db.from("rankings").select("description,intro,methodology,pending_changes,ai_draft,status").eq("id",R).single();
console.log("RANKING:", JSON.stringify(r,null,2));
const { data: es } = await db.from("ranking_entries")
  .select("id,position,best_for,editorial_reason,badge,pending_changes,ai_draft,business:businesses(name)")
  .eq("ranking_id",R).order("position");
for (const e of es) console.log(`ENTRY ${e.position} ${e.business.name}\n  best_for=${JSON.stringify(e.best_for)}\n  reason=${JSON.stringify(e.editorial_reason)}\n  pending=${JSON.stringify(e.pending_changes)}\n  ai_draft=${JSON.stringify(e.ai_draft)}`);
