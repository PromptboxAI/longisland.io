"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Debounced autosave for routine editorial fields.
 *
 * A ranking of twenty entries carries eighty text fields across it. A Save
 * button on each is eighty clicks and eighty ways to lose an edit by navigating
 * away — and worse, when the details form and the Publish button are separate
 * forms, clicking Publish silently discards whatever was typed above it.
 *
 * Written as state and effects rather than refs and timers on purpose. The
 * imperative version needed mutable bookkeeping for "is a save running" and
 * "did something change while it ran", and mutating refs is exactly what makes
 * a hook unsafe under concurrent rendering. Here the request being saved IS a
 * piece of state: a change schedules one, an effect performs it, and a change
 * arriving mid-flight simply supersedes it.
 *
 * Consequential actions are deliberately NOT autosaved — publishing, deleting
 * and changing the slug of a published page stay explicit, because undoing them
 * is not a matter of typing again.
 */

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface AutosaveResult {
  status: SaveStatus;
  error: string;
  /** Saves immediately, skipping the debounce. For blur, and for AI results. */
  saveNow: () => void;
}

type Values = Record<string, string>;

export function useAutosave(
  values: Values,
  save: (values: Values) => Promise<{ ok?: boolean; error?: string }>,
  options: { delay?: number; enabled?: boolean } = {},
): AutosaveResult {
  const { delay = 900, enabled = true } = options;

  const signature = JSON.stringify(values);

  const [error, setError] = useState("");
  /** The value the form held on mount, so "Saved" only shows after a change. */
  const [initialSignature] = useState(signature);
  /** The signature the server has accepted. Equal means nothing to do. */
  const [savedSignature, setSavedSignature] = useState(signature);
  /** The signature a save has been requested for. */
  const [requested, setRequested] = useState<string | null>(null);

  const saveNow = useCallback(() => setRequested(signature), [signature]);

  // Debounce: a quiet moment schedules a save of whatever is current.
  useEffect(() => {
    if (!enabled) return;
    if (signature === savedSignature) return;

    const handle = setTimeout(() => setRequested(signature), delay);
    return () => clearTimeout(handle);
  }, [signature, savedSignature, delay, enabled]);

  // Perform it. A newer request replaces this effect run, and `cancelled`
  // stops the superseded response from reporting a stale status.
  useEffect(() => {
    if (requested === null || requested === savedSignature) return;

    let cancelled = false;

    /*
     * A superseded response reports nothing, and `savedSignature` only ever
     * stops further work rather than scheduling more — so this cannot loop.
     */
    void save(JSON.parse(requested) as Values).then((result) => {
      if (cancelled) return;

      if (result.error) {
        // Not recorded as saved, so the next change retries it.
        setError(result.error);
        return;
      }

      setError("");
      setSavedSignature(requested);
    });

    return () => {
      cancelled = true;
    };
    // `save` is intentionally excluded: callers pass an inline closure, and
    // depending on it would re-fire the request on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested, savedSignature]);

  /*
   * Derived rather than stored. A status that is set as well as computed has
   * two sources of truth, and the one that goes stale is always the one on
   * screen.
   */
  const saving = requested !== null && requested !== savedSignature && !error;
  const status: SaveStatus = error
    ? "error"
    : saving
      ? "saving"
      : savedSignature !== initialSignature
        ? "saved"
        : "idle";

  return { status, error, saveNow };
}

/** The one place the save indicator's wording lives. */
export function saveStatusLabel(status: SaveStatus, error: string): string {
  if (status === "saving") return "Saving…";
  if (status === "saved") return "Saved";
  if (status === "error") return error || "Not saved";
  return "";
}
