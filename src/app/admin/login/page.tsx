import type { Metadata } from "next";
import Link from "next/link";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sand-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Link
            href="/"
            className="text-xl font-extrabold tracking-tight text-navy-900"
          >
            LongIsland<span className="text-gold-400">.io</span>
          </Link>
          <h1 className="mt-6 text-2xl font-extrabold text-navy-900">
            Staff sign in
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            This area is for LongIsland.io editors.
          </p>
        </div>

        <div className="mt-8 rounded-card border border-line bg-white p-6 shadow-card">
          {isSupabaseConfigured ? (
            <AdminLoginForm />
          ) : (
            <div className="text-sm leading-relaxed text-ink-700">
              <p className="font-bold text-navy-900">Database not connected</p>
              <p className="mt-2">
                Admin sign-in needs Supabase credentials. Add these to{" "}
                <code className="rounded bg-sand-100 px-1 py-0.5 text-xs">
                  .env.local
                </code>{" "}
                and restart the dev server:
              </p>
              <pre className="mt-3 overflow-x-auto rounded bg-navy-950 p-3 text-xs text-navy-100">
                {`NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=`}
              </pre>
              <p className="mt-3">
                Then create a user in the Supabase dashboard under
                Authentication &rarr; Users. See{" "}
                <code className="rounded bg-sand-100 px-1 py-0.5 text-xs">
                  docs/setup.md
                </code>
                .
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-400">
          <Link href="/" className="hover:underline">
            Back to LongIsland.io
          </Link>
        </p>
      </div>
    </div>
  );
}
