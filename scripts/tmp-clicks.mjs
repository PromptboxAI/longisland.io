import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
for (const l of readFileSync(".env.local","utf8").split("\n")) {
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g,"");
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const { data } = await db.from("affiliate_clicks").select("*").order("clicked_at",{ascending:false});
console.log("rows recorded:", data?.length ?? 0);
console.log(JSON.stringify(data, null, 2));
console.log("\ncolumns actually present on a row:", data?.length ? Object.keys(data[0]).join(", ") : "(none)");
const forbidden = ["ip","ip_address","user_agent","ua","cookie","session","session_id","user_id","visitor_id","fingerprint","referrer_raw"];
const present = data?.length ? forbidden.filter(f => f in data[0]) : [];
console.log("identifying columns present:", present.length ? present.join(", ") : "NONE");
