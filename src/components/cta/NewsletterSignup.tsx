"use client";

import { Check, Loader2 } from "lucide-react";
import { useId, useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export interface NewsletterSignupProps {
  /**
   * "footer" is the compact dark treatment, "section" the full light band and
   * "band" the single-line inline row used by the navy newsletter strip.
   */
  variant?: "footer" | "section" | "band";
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
  const isBand = variant === "band";
  const onDark = isFooter || isBand;

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
          onDark ? "text-gold-400" : "text-brand-600"
        }`}
      >
        <Check aria-hidden="true" className="size-4 shrink-0" />
        You are on the list. Look for us in your inbox on Thursday.
      </p>
    );
  }

  /*
   * The band sits inside an already-headed strip, so its label is visually
   * hidden and the control is a single joined row: white field, gold action.
   */
  return (
    <form onSubmit={handleSubmit} noValidate>
      <label
        htmlFor={inputId}
        className={
          isBand
            ? "sr-only"
            : `block text-sm font-medium ${
                isFooter ? "text-white" : "text-navy-900"
              }`
        }
      >
        {isFooter ? "Get the best of Long Island weekly" : "Email address"}
      </label>

      <div
        className={
          isBand
            ? "flex w-full"
            : "mt-2 flex flex-col gap-2 sm:flex-row"
        }
      >
        <input
          id={inputId}
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={isBand ? "Email address" : "you@example.com"}
          aria-describedby={status === "error" ? `${inputId}-error` : undefined}
          aria-invalid={status === "error"}
          className={`min-w-0 flex-1 text-sm outline-none transition-shadow focus:ring-2 focus:ring-gold-400 ${
            isBand
              ? "rounded-l-md bg-white px-4 py-2.5 text-ink-900 placeholder:text-ink-400"
              : isFooter
                ? "rounded-full bg-navy-900 px-4 py-2.5 text-white placeholder:text-navy-400 ring-1 ring-navy-700 focus:ring-brand-500"
                : "rounded-full bg-white px-4 py-2.5 text-ink-900 placeholder:text-ink-400 ring-1 ring-navy-200 focus:ring-brand-500"
          }`}
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className={`shrink-0 text-sm font-semibold transition-colors disabled:opacity-60 ${
            isBand
              ? "rounded-r-md bg-gold-400 px-5 py-2.5 text-navy-950 hover:bg-gold-300"
              : isFooter
                ? "rounded-full bg-gold-400 px-5 py-2.5 text-navy-950 hover:bg-gold-300"
                : "rounded-full bg-navy-900 px-5 py-2.5 text-white hover:bg-navy-800"
          }`}
        >
          {status === "submitting" ? (
            <span className="flex items-center gap-2">
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              {isBand ? "Signing up" : "Subscribing"}
            </span>
          ) : isBand ? (
            "Sign up"
          ) : (
            "Subscribe"
          )}
        </button>
      </div>

      {status === "error" ? (
        <p
          id={`${inputId}-error`}
          role="alert"
          className={`mt-2 text-xs ${onDark ? "text-red-300" : "text-red-600"}`}
        >
          {message}
        </p>
      ) : isBand ? null : (
        <p
          className={`mt-2 text-xs ${isFooter ? "text-navy-400" : "text-ink-400"}`}
        >
          One email a week. Unsubscribe any time.
        </p>
      )}
    </form>
  );
}
