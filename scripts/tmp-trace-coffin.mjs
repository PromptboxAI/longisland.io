import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
for (const l of readFileSync(".env.local","utf8").split("\n")) {
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g,"");
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const { data: p } = await db.from("products").select("*").ilike("name","%Coffin%").single();
console.log("1. PRODUCT");
console.log(`   name=${p.name}  status=${p.status}`);
console.log(`   image_url=${p.image_url}  image_media_id=${p.image_media_id}`);

const { data: offers } = await db.from("product_offers").select("*").eq("product_id",p.id);
console.log("\n2. OFFERS:", offers?.length ?? 0);
for (const o of offers??[]) console.log(`   ${o.merchant} affiliate=${o.affiliate_url ? "yes" : "no"} direct=${o.direct_url ? "yes":"no"} availability=${o.availability}`);

const { data: sec } = await db.from("editorial_sections").select("*").eq("key","homepage_top_picks").single();
console.log("\n3. PLACEMENT: status=", sec.status);

const { data: items } = await db.from("editorial_section_items").select("*").eq("section_id",sec.id).eq("product_id",p.id);
console.log("\n4. ITEM:", items?.length ?? 0);
for (const i of items??[]) console.log(`   status=${i.status} position=${i.position} headline=${i.headline ?? "(uses product)"} image_media_id=${i.image_media_id}`);

console.log("\n5. WOULD IT RENDER?");
const usable = (offers??[]).some(o => (o.affiliate_url || o.direct_url) && o.availability !== "out_of_stock" && o.availability !== "discontinued");
console.log(`   product published: ${p.status === "published"}`);
console.log(`   section published: ${sec.status === "published"}`);
console.log(`   item published   : ${(items??[]).every(i=>i.status==="published")}`);
console.log(`   usable offer     : ${usable}`);
console.log(`   has an image     : ${Boolean(p.image_url || p.image_media_id)}`);
