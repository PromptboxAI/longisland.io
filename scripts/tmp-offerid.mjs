import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
for (const l of readFileSync(".env.local","utf8").split("\n")) {
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g,"");
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const { data } = await db.from("product_offers")
  .select("id, product_id, merchant, affiliate_url, direct_url")
  .eq("product_id","26f553b1-eb83-4e41-b443-1bcfda894c25").single();
console.log("OFFER_ID=" + data.id);
console.log("STORED_URL=" + data.affiliate_url);
