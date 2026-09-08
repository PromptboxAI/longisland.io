/**
 * Click-tracking acceptance checks, runnable against any environment.
 *
 * Written during the acceptance test that found the fire-and-forget insert
 * losing writes under concurrency. Sequential requests keep hitting a warm
 * instance and hide the problem entirely — the burst is the part that matters,
 * so it is not optional here.
 *
 *   node scripts/verify-clicks.mjs <offerId> <productId> [baseUrl]
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, "");
}

const [offerId, productId, base = "https://www.longisland.io"] = process.argv.slice(2);
if (!offerId || !productId) {
  console.error("usage: node scripts/verify-clicks.mjs <offerId> <productId> [baseUrl]");
  process.exit(1);
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const clicksFor = async () => {
  const { data } = await db.from("affiliate_clicks").select("source_path").eq("product_id", productId);
  return new Set((data ?? []).map((r) => r.source_path));
};

const SEQ = 10, BURST = 12;
let fail = 0;

console.log(`${SEQ} sequential clicks…`);
for (let i = 1; i <= SEQ; i++) {
  await fetch(`${base}/go/${offerId}?from=%2Fseq-${i}&placement=verify_seq`, { redirect: "manual" });
}

console.log(`${BURST} concurrent clicks…`);
await Promise.all(
  Array.from({ length: BURST }, (_, i) =>
    fetch(`${base}/go/${offerId}?from=%2Fburst-${i + 1}&placement=verify_burst`, { redirect: "manual" }),
  ),
);

await new Promise((r) => setTimeout(r, 10000));
const seen = await clicksFor();

const missingSeq = [];
for (let i = 1; i <= SEQ; i++) if (!seen.has(`/seq-${i}`)) missingSeq.push(i);
const missingBurst = [];
for (let i = 1; i <= BURST; i++) if (!seen.has(`/burst-${i}`)) missingBurst.push(i);

const line = (label, missing, total) => {
  const ok = missing.length === 0;
  if (!ok) fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}: ${total - missing.length}/${total}` +
    (ok ? "" : ` — missing ${missing.join(", ")}`));
};

console.log("\nresults");
line("sequential", missingSeq, SEQ);
line("concurrent", missingBurst, BURST);

console.log(fail ? "\nFAILED" : "\nALL CLICKS RECORDED");
process.exit(fail ? 1 : 0);
