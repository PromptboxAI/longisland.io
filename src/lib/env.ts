/**
 * Environment access.
 *
 * Supabase key naming — this project uses the CURRENT key system:
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  (browser-safe, RLS applies)
 *   SUPABASE_SECRET_KEY                   (server-only, bypasses RLS)
 *
 * The legacy `ANON_KEY` / `SERVICE_ROLE_KEY` names are still read as a fallback
 * so an older .env keeps working, but new setups should use the names above.
 *
 * `NEXT_PUBLIC_*` reads are written out literally so Next can inline them into
 * the client bundle — do not refactor them behind a dynamic lookup.
 *
 * Server-only secrets are exposed through functions that throw when missing, so
 * a misconfigured deploy fails at the call site with a useful message instead of
 * sending `undefined` to an API.
 */

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

/**
 * True once the project has real Supabase credentials.
 *
 * The public site falls back to `src/lib/data/seed.ts` when this is false, so
 * the app builds and renders before the database exists. See docs/setup.md.
 */
export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabasePublishableKey.length > 0;

/**
 * Whether serving the fictional seed dataset is permitted at all.
 *
 * The seed businesses and rankings are invented — see
 * src/lib/data/seed/businesses.ts. They exist so the app renders before a
 * database is provisioned. Publishing them from a production deployment would
 * put fabricated editorial content about businesses on a live site.
 *
 * So seed content is allowed outside production, or in production only when an
 * operator opts in explicitly for a demo build. It is deliberately NOT a
 * NEXT_PUBLIC_ variable: this decision is made server-side only.
 *
 * This gate governs the "no database yet" case. It never licenses falling back
 * to seed because a configured database returned an error — see
 * src/lib/data/queries.ts.
 */
export const isSeedContentAllowed =
  process.env.NODE_ENV !== "production" ||
  process.env.ENABLE_SEED_CONTENT === "true";

/**
 * Server-only. Bypasses RLS — never import from a Client Component, and never
 * prefix this variable with NEXT_PUBLIC_.
 */
export function getSupabaseSecretKey(): string {
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error(
      "SUPABASE_SECRET_KEY is not set. Add it to .env.local — see docs/setup.md.",
    );
  }
  return key;
}

/** Server-only. */
export function getYelpApiKey(): string {
  const key = process.env.YELP_API_KEY;
  if (!key) {
    throw new Error(
      "YELP_API_KEY is not set. Add it to .env.local — see docs/setup.md.",
    );
  }
  return key;
}

export const isYelpConfigured = Boolean(process.env.YELP_API_KEY);
