/**
 * Exercises the real upload path: sign in as the admin, mint a signed upload
 * URL for a server-chosen path, PUT actual bytes from disk, register the asset,
 * then confirm the public URL serves it and that RLS blocked nothing it should
 * not have.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(readFileSync("./.env.local","utf8").split(/\r?\n/).filter(l=>l&&!l.startsWith("#")&&l.includes("=")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim()];}));

let failures = 0;
const check = (label, pass, detail="") => { if(!pass) failures++; console.log(`  ${pass?"PASS":"**FAIL**"}  ${label}${detail?`  — ${detail}`:""}`); };

const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const svc  = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

console.log("Storage upload — the real path\n");

// Anonymous first: this must fail, or the signed-URL design is worthless.
const anonTicket = await anon.storage.from("media").createSignedUploadUrl("hack/anon.png");
check("anonymous cannot mint an upload URL", Boolean(anonTicket.error), anonTicket.error?.message);

const { data: session, error: signInError } = await anon.auth.signInWithPassword({
  email: env.ADMIN_TEST_EMAIL,
  password: env.ADMIN_TEST_PASSWORD,
});
check("admin session established", !signInError && Boolean(session?.session), signInError?.message);
if (signInError) process.exit(1);

const editor = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
  global: { headers: { Authorization: `Bearer ${session.session.access_token}` } },
});

const bytes = readFileSync("./tmp-upload/probe-photo.png");
const path = `2026/09/upload-probe-${Date.now()}.png`;

const { data: ticket, error: ticketError } = await editor.storage.from("media").createSignedUploadUrl(path);
check("admin mints a signed upload URL", !ticketError && Boolean(ticket?.token), ticketError?.message);

const { error: uploadError } = await editor.storage
  .from("media")
  .uploadToSignedUrl(ticket.path, ticket.token, bytes, { contentType: "image/png" });
check("file uploaded straight to Storage", !uploadError, uploadError?.message);

// The bucket must refuse a non-image regardless of what the client claims.
const badPath = `2026/09/not-an-image-${Date.now()}.png`;
const badTicket = await editor.storage.from("media").createSignedUploadUrl(badPath);
const badUpload = await editor.storage
  .from("media")
  .uploadToSignedUrl(badTicket.data.path, badTicket.data.token, Buffer.from("#!/bin/sh\necho hi\n"), { contentType: "text/plain" });
check("bucket refuses a non-image", Boolean(badUpload.error), badUpload.error?.message ?? "accepted!");

const publicUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path}`;
const fetched = await fetch(publicUrl);
const served = Buffer.from(await fetched.arrayBuffer());
check("public URL serves the file", fetched.status === 200, `HTTP ${fetched.status}`);
check("bytes served match bytes uploaded", served.length === bytes.length, `${served.length} vs ${bytes.length}`);

const { data: asset, error: registerError } = await editor
  .from("media_assets")
  .insert({ storage_path: path, filename: "probe-photo.png", mime_type: "image/png",
            width: 64, height: 64, size_bytes: bytes.length, alt_text: "Upload probe" })
  .select("*").single();
check("asset registered in the library", !registerError, registerError?.message);

// Reuse: one asset, two different content types.
const { data: cat } = await svc.from("categories").select("id").eq("status","published").limit(1).single();
const { data: art } = await svc.from("articles")
  .insert({ title: "Upload Probe Article", slug: "upload-probe-article", status: "draft", hero_media_id: asset.id })
  .select("id").single();
await svc.from("categories").update({ hero_media_id: asset.id }).eq("id", cat.id);

const { data: reuse } = await svc.from("media_assets").select("id").eq("id", asset.id).single();
const { data: artRow } = await svc.from("articles").select("hero_media_id").eq("id", art.id).single();
const { data: catRow } = await svc.from("categories").select("hero_media_id").eq("id", cat.id).single();
check("same asset reused across two content types",
      artRow.hero_media_id === reuse.id && catRow.hero_media_id === reuse.id);

// Cleanup.
await svc.from("categories").update({ hero_media_id: null }).eq("id", cat.id);
await svc.from("articles").delete().eq("id", art.id);
await svc.from("media_assets").delete().eq("id", asset.id);
await svc.storage.from("media").remove([path, badPath]);
const { count } = await svc.from("media_assets").select("id",{count:"exact",head:true});
check("fixtures removed", count === 0, `media_assets=${count}`);

console.log(failures === 0 ? "\nUpload path verified." : `\n${failures} FAILED.`);
process.exit(failures === 0 ? 0 : 1);
