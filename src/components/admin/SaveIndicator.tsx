"use client";

import { AlertCircle, Check, CloudOff, Loader2 } from "lucide-react";

import {
  saveStatusLabel,
  type SaveDestination,
  type SaveStatus,
} from "@/components/admin/useAutosave";

/**
 * The one save indicator, used everywhere autosave is.
 *
 * It answers two questions that used to be conflated into the single word
 * "Saved": is my work safe, and can readers see it. Those have different
 * answers on a published record, where a paragraph is autosaved but staged, and
 * an editor who reads "Saved" and assumes "live" has been misled by one word.
 *
 * `aria-live="polite"` rather than assertive: an editor typing does not want
 * "Saved" interrupting them, but does want to hear it if they stop and listen.
 */
export function SaveIndicator({
  status,
  error,
  destination,
  className = "",
}: {
  status: SaveStatus;
  error: string;
  /**
   * Where the last save landed. Comes from the action rather than the client,
   * because only the action knows both the record's status and which fields
   * the field policy staged.
   */
  destination?: SaveDestination | null;
  className?: string;
}) {
  const label = saveStatusLabel(status, error, destination ?? null);
  if (!label) return <span aria-live="polite" className={className} />;

  const staged = status === "saved" && destination === "pending";

  return (
    <span
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
        status === "error"
          ? "text-red-600"
          : staged
            ? "text-amber-700"
            : "text-ink-500"
      } ${className}`}
    >
      {status === "saving" ? (
        <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
      ) : null}
      {status === "saved" && !staged ? (
        <Check aria-hidden="true" className="size-3.5 text-emerald-600" />
      ) : null}
      {/* A different mark, not a different colour: staged is not a lesser
          success, it is a different state, and colour alone does not say so. */}
      {staged ? <CloudOff aria-hidden="true" className="size-3.5" /> : null}
      {status === "error" ? (
        <AlertCircle aria-hidden="true" className="size-3.5" />
      ) : null}
      {label}
    </span>
  );
}
