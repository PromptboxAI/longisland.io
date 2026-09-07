"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";

import { saveStatusLabel, type SaveStatus } from "@/components/admin/useAutosave";

/**
 * The one save indicator, used everywhere autosave is.
 *
 * `aria-live="polite"` rather than assertive: an editor typing does not want
 * "Saved" interrupting them, but does want to hear it if they stop and listen.
 * A failure is the exception and says what to do about it.
 */
export function SaveIndicator({
  status,
  error,
  className = "",
  live,
}: {
  status: SaveStatus;
  error: string;
  className?: string;
  /**
   * Whether a save reaches the public page.
   *
   * "Saved" on its own leaves an editor wondering whether they still have to
   * press Publish. On a published record they do not, and this is where that
   * gets said.
   */
  live?: boolean;
}) {
  const base = saveStatusLabel(status, error);
  const label =
    status === "saved" && live !== undefined
      ? `${base} — ${live ? "Live" : "Draft"}`
      : base;
  if (!label) return <span aria-live="polite" className={className} />;

  return (
    <span
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
        status === "error" ? "text-red-600" : "text-ink-500"
      } ${className}`}
    >
      {status === "saving" ? (
        <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
      ) : null}
      {status === "saved" ? (
        <Check aria-hidden="true" className="size-3.5 text-emerald-600" />
      ) : null}
      {status === "error" ? (
        <AlertCircle aria-hidden="true" className="size-3.5" />
      ) : null}
      {label}
    </span>
  );
}
