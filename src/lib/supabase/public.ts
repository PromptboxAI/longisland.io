import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/env";

/**
 * Cookie-free Supabase client for public reads.
 *
 * Public pages are anonymous: they read `status = 'published'` rows under the
 * anon RLS policies and never need a user session. Binding them to cookies
 * would be wrong twice over —
 *
 *   1. `cookies()` cannot be called from `generateStaticParams`, which runs at
 *      build time with no HTTP request, and
 *   2. reading cookies opts a route into dynamic rendering, defeating the
 *      static generation the public site depends on.
 *
 * Session-bound reads belong in `./server.ts` (admin pages and Server Actions).
 *
 * Returns `null` when Supabase is not configured, which is how the data layer
 * knows to fall back to seed content.
 */
export function createPublicClient() {
  if (!isSupabaseConfigured) return null;

  return createSupabaseClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
