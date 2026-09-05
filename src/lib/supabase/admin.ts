import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getSupabaseSecretKey, supabaseUrl } from "@/lib/env";

/**
 * Privileged Supabase client (SUPABASE_SECRET_KEY). BYPASSES RLS.
 *
 * `import "server-only"` makes the build fail if this module is ever pulled
 * into a Client Component, which is the guardrail that keeps the key off the
 * browser.
 *
 * Only use this where RLS genuinely cannot express the rule — currently the
 * public form submissions (nominations, leads, newsletter), which must insert
 * without an authenticated session but must not be able to read anything back.
 */
export function createAdminClient() {
  return createSupabaseClient(supabaseUrl, getSupabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
