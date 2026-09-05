"use client";

import { Check, Loader2 } from "lucide-react";
import { useId, useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export interface NewsletterSignupProps {
  /** "footer" is the compact dark treatment; "section" is the full band. */
  variant?: "footer" | "section";
  source?: string;
}

export function NewsletterSignup({
  variant = "section",
  source = "site",
}: NewsletterSignupProps) {
  const inputId = useId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const isFooter = variant === "footer";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });

      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setStatus("error");
        setMessage(body.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Could not reach the server. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <p
        role="status"
        className={`flex items-center gap-2 text-sm ${
          isFooter ? "text-gold-400" : "text-brand-600"
        }`}
      >
        <Check aria-hidden="true" className="size-4 shrink-0" />
        You are on the list. Look for us in your inbox on Thursday.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label
        htmlFor={inputId}
        className={`block text-sm font-medium ${
          isFooter ? "text-white" : "text-navy-900"
        }`}
      >
        {isFooter ? "Get the best of Long Island weekly" : "Email address"}
      </label>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          aria-describedby={status === "error" ? `${inputId}-error` : undefined}
          aria-invalid={status === "error"}
          className={`min-w-0 flex-1 rounded-full px-4 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-brand-500 ${
            isFooter
              ? "bg-navy-900 text-white placeholder:text-navy-400 ring-1 ring-navy-700"
              : "bg-white text-ink-900 placeholder:text-ink-400 ring-1 ring-navy-200"
          }`}
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
            isFooter
              ? "bg-gold-400 text-navy-950 hover:bg-gold-300"
              : "bg-navy-900 text-white hover:bg-navy-800"
          }`}
        >
          {status === "submitting" ? (
            <span className="flex items-center gap-2">
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              Subscribing
            </span>
          ) : (
            "Subscribe"
          )}
        </button>
      </div>

      {status === "error" ? (
        <p
          id={`${inputId}-error`}
          role="alert"
          className={`mt-2 text-xs ${isFooter ? "text-red-300" : "text-red-600"}`}
        >
          {message}
        </p>
      ) : (
        <p
          className={`mt-2 text-xs ${isFooter ? "text-navy-400" : "text-ink-400"}`}
        >
          One email a week. Unsubscribe any time.
        </p>
      )}
    </form>
  );
}
