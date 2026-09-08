import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
for (const l of readFileSync(".env.local","utf8").split("\n")) {
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g,"");
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const { data: p } = await db.from("products").insert({
  name:"ZZ Reliability Product", slug:"zz-reliability-product", brand:"ZZ Brand",
  short_description:"Scratch product for the 10-click reliability test.", status:"published",
}).select("id").single();
const { data: o } = await db.from("product_offers").insert({
  product_id: p.id, merchant:"amazon",
  affiliate_url:"https://www.amazon.com/dp/B0ZZREL01?tag=longislandio-20&linkCode=ogi&th=1&psc=1&ref_=rel%3Dtest",
  price: 39.99, currency:"USD", availability:"in_stock",
}).select("id").single();
console.log("PRODUCT_ID=" + p.id);
console.log("OFFER_ID=" + o.id);
