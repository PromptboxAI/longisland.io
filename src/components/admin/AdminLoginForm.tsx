"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { FormError } from "@/components/forms/Field";
import { createClient } from "@/lib/supabase/client";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      // Deliberately generic: distinguishing "no such user" from "wrong
      // password" tells an attacker which addresses are real.
      setError("Those credentials did not work. Check them and try again.");
      setSubmitting(false);
      return;
    }

    // Only accept internal redirect targets, so ?next= cannot bounce a signed-in
    // editor to an attacker-controlled URL.
    const next = searchParams.get("next");
    const destination = next && next.startsWith("/admin") ? next : "/admin";

    router.push(destination);
    router.refresh();
  }

  const inputClass =
    "w-full rounded-md border border-line px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="admin-email" className="block text-sm font-semibold text-navy-900">
          Email
        </label>
        <input
          id="admin-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={`mt-2 ${inputClass}`}
        />
      </div>

      <div>
        <label
          htmlFor="admin-password"
          className="block text-sm font-semibold text-navy-900"
        >
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={`mt-2 ${inputClass}`}
        />
      </div>

      <FormError message={error} />

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Signing in
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}
