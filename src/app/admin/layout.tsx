import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user } = { user: null },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  // The login page renders inside this layout too, before a session exists,
  // so an unauthenticated render must be allowed here. Access control lives in
  // middleware.ts and requireAdmin(), not in this layout.
  if (!user) return <>{children}</>;

  return <AdminShell email={user.email ?? "Signed in"}>{children}</AdminShell>;
}
