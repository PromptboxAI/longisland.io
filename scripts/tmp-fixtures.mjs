import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
for (const l of readFileSync(".env.local","utf8").split("\n")) {
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g,"");
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
// Reuse a real library image so the cards render with a picture.
const { data: asset } = await db.from("media_assets").select("id,storage_path").eq("status","active").limit(1).single();
console.log("using media asset:", asset?.id);

const specs = [
  ["ZZ Pick One","ZZ Brand","published"],
  ["ZZ Pick Two","ZZ Brand","published"],
  ["ZZ Pick Three","ZZ Brand","published"],
  ["ZZ Pick Four","ZZ Brand","published"],
  ["ZZ Pick Five","ZZ Brand","published"],
  ["ZZ Draft Pick","ZZ Brand","draft"],
];
const out=[];
for (const [name,brand,status] of specs) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,"-");
  const { data: p, error } = await db.from("products").insert({
    name, brand, slug, status,
    short_description:`${name} — scratch product for the Top Picks acceptance test.`,
    image_media_id: asset?.id ?? null,
  }).select("id").single();
  if (error) { console.error(name, error.message); continue; }
  await db.from("product_offers").insert({
    product_id: p.id, merchant:"amazon",
    affiliate_url:`https://www.amazon.com/dp/B0ZZ${slug.slice(-4).toUpperCase()}?tag=longislandio-20&th=1`,
    price: 24.99, currency:"USD", availability:"in_stock",
  });
  out.push({ name, id: p.id, status });
}
console.log(JSON.stringify(out,null,2));
