import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env=Object.fromEntries(readFileSync("./.env.local","utf8").split(/\r?\n/).filter(l=>l&&!l.startsWith("#")&&l.includes("=")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim()];}));
const svc=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}});
if(process.argv[2]==="down"){
  await svc.from("editorial_sections").delete().eq("key","homepage_primary");
  await svc.from("articles").delete().like("slug","vis-%");
  await svc.from("media_assets").delete().like("storage_path","vis-probe/%");
  const o={};for(const t of ["articles","media_assets","editorial_sections","editorial_section_items","rankings"]){const{count}=await svc.from(t).select("id",{count:"exact",head:true});o[t]=count;}
  console.log("cleaned:",JSON.stringify(o));process.exit(0);
}
// Upload a real file so the article renders a real image.
const bytes=readFileSync("./tmp-upload/probe-photo.png");
const path=`vis-probe/hero-${Date.now()}.png`;
await svc.storage.from("media").upload(path,bytes,{contentType:"image/png"});
const {data:asset}=await svc.from("media_assets").insert({storage_path:path,filename:"hero.png",mime_type:"image/png",width:64,height:64,size_bytes:bytes.length,alt_text:"A test hero image",credit:"Photograph by the LongIsland.io team",source:"own",focal_x:0.5,focal_y:0.4}).select("*").single();
const {data:cat}=await svc.from("categories").select("id").eq("status","published").limit(1).single();
const {data:art}=await svc.from("articles").insert({
  title:"Long Island Fall Weekend Guide",slug:"vis-fall-weekend",kind:"seasonal",category_id:cat.id,
  dek:"Where to go when the leaves turn, and what to do when you get there.",
  body:"## Start on the North Fork\n\nThe farm stands are still open in October, and the crowds have gone.\n\n- Leave before nine\n- Bring cash\n- **Do not** skip the cider\n\n> The best weekend here is the one you did not plan too tightly.\n\n### Then head south\n\nThe beaches are empty and the light is better.",
  hero_media_id:asset.id,author_name:"LongIsland.io Editors",
  seo_title:"Fall weekends on Long Island",seo_description:"A seasonal guide to the North Fork and the South Shore.",
  status:"published",published_at:new Date().toISOString()}).select("*").single();
const {data:sec}=await svc.from("editorial_sections").insert({key:"homepage_primary",status:"published",layout:"feature"}).select("id").single();
await svc.from("editorial_section_items").insert({section_id:sec.id,article_id:art.id,status:"published",position:1});
console.log("fixtures up: /articles/vis-fall-weekend, featured on the homepage");
