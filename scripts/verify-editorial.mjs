/**
 * Editorial curation test matrix.
 *
 *   node scripts/verify-editorial.mjs
 *
 * Requires supabase/migrations/20260301000000_editorial_sections.sql and
 * ..._rls.sql to be applied. Creates its own fixtures and removes them again.
 *
 * The point of this file is the RLS matrix: a public reader must never receive
 * a draft section, a draft item, an item outside its schedule window, or an
 * item whose target is unpublished.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const anon = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } },
);

let failures = 0;
function check(label, pass, detail = "") {
  if (!pass) failures += 1;
  console.log(`  ${pass ? "PASS" : "**FAIL**"}  ${label}${detail ? `  — ${detail}` : ""}`);
}

// Preflight: are the tables there?
const probe = await svc.from("editorial_sections").select("id").limit(1);
if (probe.error?.code === "PGRST205") {
  console.log(
    "editorial_sections not found — apply the two migrations first:\n" +
      "  supabase/migrations/20260301000000_editorial_sections.sql\n" +
      "  supabase/migrations/20260301000001_editorial_sections_rls.sql",
  );
  process.exit(2);
}

console.log("Editorial curation matrix\n");

// ---------------------------------------------------------------- fixtures
const { data: pubCat } = await svc
  .from("categories")
  .select("id")
  .eq("status", "published")
  .limit(1)
  .single();

const { data: draftCat } = await svc
  .from("categories")
  .insert({ name: "Draft Target Probe", slug: "draft-target-probe", status: "draft" })
  .select("id")
  .single();

const { data: pubSection } = await svc
  .from("editorial_sections")
  .insert({ key: "probe_published", status: "published", layout: "grid" })
  .select("id")
  .single();

const { data: draftSection } = await svc
  .from("editorial_sections")
  .insert({ key: "probe_draft", status: "draft", layout: "grid" })
  .select("id")
  .single();

const hour = 3600_000;
const items = {
  live: { category_id: pubCat.id, status: "published", position: 1 },
  draftItem: { category_id: pubCat.id, status: "draft", position: 2 },
  notYet: {
    category_id: pubCat.id,
    status: "published",
    position: 3,
    starts_at: new Date(Date.now() + hour).toISOString(),
  },
  expired: {
    category_id: pubCat.id,
    status: "published",
    position: 4,
    ends_at: new Date(Date.now() - hour).toISOString(),
  },
  draftTarget: { category_id: draftCat.id, status: "published", position: 5 },
  external: {
    external_url: "https://example.com/seasonal",
    headline: "Seasonal feature",
    status: "published",
    position: 6,
  },
};

const created = {};
for (const [name, row] of Object.entries(items)) {
  const { data, error } = await svc
    .from("editorial_section_items")
    .insert({ section_id: pubSection.id, ...row })
    .select("id")
    .single();
  if (error) {
    console.log(`  setup failed for ${name}: ${error.message}`);
    failures += 1;
  }
  created[name] = data?.id;
}

// An item under the DRAFT section, itself fully published.
const { data: underDraft } = await svc
  .from("editorial_section_items")
  .insert({ section_id: draftSection.id, category_id: pubCat.id, status: "published" })
  .select("id")
  .single();

// --------------------------------------------------------------- RLS matrix
console.log("RLS — what an anonymous reader receives");

const { data: anonSections } = await anon.from("editorial_sections").select("id, key");
const anonSectionIds = new Set((anonSections ?? []).map((s) => s.id));
check("published section is readable", anonSectionIds.has(pubSection.id));
check("draft section is hidden", !anonSectionIds.has(draftSection.id));

const { data: anonItems } = await anon.from("editorial_section_items").select("id");
const visible = new Set((anonItems ?? []).map((i) => i.id));

check("published item, open window, published target → visible", visible.has(created.live));
check("draft item → hidden", !visible.has(created.draftItem));
check("scheduled for the future → hidden", !visible.has(created.notYet));
check("already expired → hidden", !visible.has(created.expired));
check("target is draft → hidden", !visible.has(created.draftTarget));
check("external_url item → visible", visible.has(created.external));
check("item under a draft section → hidden", !visible.has(underDraft?.id));

// ------------------------------------------------------------- constraints
console.log("\nConstraints");

const twoTargets = await svc.from("editorial_section_items").insert({
  section_id: pubSection.id,
  category_id: pubCat.id,
  place_id: pubCat.id,
});
check("two destinations rejected", Boolean(twoTargets.error), twoTargets.error?.code);

const noTarget = await svc
  .from("editorial_section_items")
  .insert({ section_id: pubSection.id });
check("zero destinations rejected", Boolean(noTarget.error), noTarget.error?.code);

const externalNoHeadline = await svc.from("editorial_section_items").insert({
  section_id: pubSection.id,
  external_url: "https://example.com/x",
});
check(
  "external URL without a headline rejected",
  Boolean(externalNoHeadline.error),
  externalNoHeadline.error?.code,
);

const badWindow = await svc.from("editorial_section_items").insert({
  section_id: pubSection.id,
  category_id: pubCat.id,
  starts_at: new Date(Date.now() + hour).toISOString(),
  ends_at: new Date(Date.now() - hour).toISOString(),
});
check("ends_at before starts_at rejected", Boolean(badWindow.error), badWindow.error?.code);

const dupeScope = await svc
  .from("editorial_sections")
  .insert({ key: "probe_published", status: "draft" });
check("duplicate key in same scope rejected", Boolean(dupeScope.error), dupeScope.error?.code);

const badScope = await svc
  .from("editorial_sections")
  .insert({ key: "probe_bad_scope", scope_type: "global", category_id: pubCat.id });
check("scope_type inconsistent with scope columns rejected", Boolean(badScope.error));

// ---------------------------------------------------------------- ordering
console.log("\nOrdering");

const { data: ordered } = await svc
  .from("editorial_section_items")
  .select("id, position, created_at")
  .eq("section_id", pubSection.id)
  .order("position")
  .order("created_at")
  .order("id");

const positions = (ordered ?? []).map((i) => i.position);
check(
  "positions read back ascending",
  positions.every((p, i) => i === 0 || p >= positions[i - 1]),
  positions.join(","),
);

// Swap 1 and 2 the way the admin action does, then confirm it stuck.
await svc.from("editorial_section_items").update({ position: 2 }).eq("id", created.live);
await svc
  .from("editorial_section_items")
  .update({ position: 1 })
  .eq("id", created.draftItem);

const { data: afterSwap } = await svc
  .from("editorial_section_items")
  .select("id, position")
  .in("id", [created.live, created.draftItem]);

const liveNow = afterSwap.find((i) => i.id === created.live)?.position;
const draftNow = afterSwap.find((i) => i.id === created.draftItem)?.position;
check("reorder persists", liveNow === 2 && draftNow === 1, `live=${liveNow} draft=${draftNow}`);

// ------------------------------------------------------------------ cleanup
await svc.from("editorial_sections").delete().in("id", [pubSection.id, draftSection.id]);
await svc.from("categories").delete().eq("id", draftCat.id);

const { count: leftSections } = await svc
  .from("editorial_sections")
  .select("id", { count: "exact" });
const { count: leftItems } = await svc
  .from("editorial_section_items")
  .select("id", { count: "exact" });

console.log(
  `\nCleanup: ${leftSections} section(s), ${leftItems} item(s) remain (items cascade with sections).`,
);
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
