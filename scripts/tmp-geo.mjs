import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
for (const l of readFileSync(".env.local","utf8").split("\n")) {
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g,"");
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const { data } = await db.from("rankings").select("geography").eq("id","8f2b8261-1050-4858-a1e1-7989e94ba505").single();
console.log("geography (short field) live value:", JSON.stringify(data.geography));
