"use client";

import { createBrowserClient } from "@supabase/ssr";

import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

/**
 * Browser Supabase client — publishable key only, subject to RLS.
 *
 * Used by the admin login form (`signInWithPassword`) and the admin sign-out
 * control. Public pages read on the server and never need this.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
