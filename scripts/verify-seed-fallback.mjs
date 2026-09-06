/**
 * Proves the seed-fallback boundary.
 *
 *   node scripts/verify-seed-fallback.mjs
 *
 * The seed dataset is fictional (src/lib/data/seed/businesses.ts). It may be
 * served when there is no usable database. It must NEVER be served because a
 * configured database returned an error — that would publish invented
 * businesses off the back of a transient fault.
 *
 * Three scenarios, each a real dev server driven by process env (Next does not
 * override variables already present in process.env, so no file is touched):
 *
 *   1. unconfigured        -> seed content EXPECTED
 *   2. configured + healthy -> live data, NO seed content
 *   3. configured + failing -> empty results, NO seed content, page still 200
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const envFile = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

/** Slugs that exist ONLY in the fictional seed set, never in the database. */
const SEED_MARKERS = [
  "/best/pizza-long-island",
  "/best/bagels-long-island",
  "/business/vitale-and-sons-coal-oven",
];

function seedMarkersIn(html) {
  return SEED_MARKERS.filter((m) => html.includes(`${m}"`));
}

async function waitForServer(port, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://localhost:${port}/`, { cache: "no-store" });
      if (r.status > 0) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function scenario({ name, port, env, expectSeed }) {
  /*
   * The Next binary is spawned directly rather than through `npm run dev`.
   * Going through npm adds a shell wrapper, and killing that wrapper leaves the
   * real `next` process alive — which then holds the per-directory dev-server
   * lock and makes every subsequent scenario fail to start.
   */
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "-p", String(port)],
    { env: { ...process.env, ...env }, stdio: "ignore" },
  );

  try {
    if (!(await waitForServer(port))) {
      console.log(`  ${name}: **FAIL** server did not start`);
      return false;
    }

    const res = await fetch(`http://localhost:${port}/`, { cache: "no-store" });
    const html = await res.text();
    const found = seedMarkersIn(html);
    const categories = (html.match(/\/category\/[a-z-]+"/g) ?? []).length;

    const seedOk = expectSeed ? found.length > 0 : found.length === 0;
    const statusOk = res.status === 200;
    const pass = seedOk && statusOk;

    console.log(
      `  ${name}\n` +
        `    http ${res.status}${statusOk ? "" : "  <-- expected 200"}\n` +
        `    seed markers: ${found.length}` +
        ` (expected ${expectSeed ? ">0" : "0"})${seedOk ? "" : "  <-- WRONG"}\n` +
        `    category links: ${categories}\n` +
        `    ${pass ? "PASS" : "**FAIL**"}`,
    );
    return pass;
  } finally {
    child.kill("SIGKILL");
    await new Promise((r) => setTimeout(r, 1500));
  }
}

console.log("Seed-fallback boundary\n");

const results = [];

results.push(
  await scenario({
    name: "1. Supabase unconfigured (seed mode allowed)",
    port: 3021,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    },
    expectSeed: true,
  }),
);

results.push(
  await scenario({
    name: "2. Supabase configured and healthy (live data)",
    port: 3022,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: envFile.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        envFile.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    },
    expectSeed: false,
  }),
);

results.push(
  await scenario({
    name: "3. Supabase configured but FAILING (must not serve seed)",
    port: 3023,
    env: {
      // Real-looking host that does not resolve: every query errors at the
      // network layer while the app still believes it is configured.
      NEXT_PUBLIC_SUPABASE_URL: "https://unreachable-host.invalid",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        envFile.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    },
    expectSeed: false,
  }),
);

const failed = results.filter((r) => !r).length;
console.log(`\n${failed === 0 ? "All scenarios passed." : `${failed} scenario(s) FAILED.`}`);
process.exit(failed === 0 ? 0 : 1);
