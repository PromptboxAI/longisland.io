import "server-only";

import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side gate for admin pages.
 *
 * Middleware already redirects unauthenticated traffic away from /admin, but
 * middleware can be bypassed by a misconfiguration and does not run for every
 * rendering path. Each admin page calls this so the check happens where the
 * data is actually read, and RLS remains the final boundary underneath.
 */
export async function requireAdmin() {
  if (!isSupabaseConfigured) redirect("/admin/login");

  const supabase = await createClient();
  if (!supabase) redirect("/admin/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  return { supabase, user };
}
