import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
for (const l of readFileSync(".env.local","utf8").split("\n")) {
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g,"");
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
for (const t of ["rankings","ranking_entries"]) {
  const { error } = await db.from(t).select("id, pending_changes, ai_draft").limit(1);
  console.log(`${t}: ${error ? "MISSING — " + error.message : "pending_changes + ai_draft present"}`);
}
