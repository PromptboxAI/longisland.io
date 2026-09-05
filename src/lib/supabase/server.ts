import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/env";

/**
 * Server Supabase client bound to the request's cookies.
 *
 * Publishable key only, so RLS still applies: an authenticated admin session gets
 * admin policies, an anonymous visitor gets the public-read policies.
 *
 * Returns `null` when Supabase is not configured, which is how the public data
 * layer knows to fall back to seed content instead of throwing at build time.
 */
export async function createClient() {
  if (!isSupabaseConfigured) return null;

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Session refresh is handled by middleware.ts, so this is safe to ignore.
        }
      },
    },
  });
}
