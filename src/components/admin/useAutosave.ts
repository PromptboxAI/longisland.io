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

/**
 * Where the last save actually landed.
 *
 * "live" means readers can see it now. "pending" means it was staged and the
 * public page is still on the previous text. The distinction cannot be derived
 * on the client — only the action knows both the record's status and which
 * fields the policy sent where — so the action reports it back.
 */
export type SaveDestination = "live" | "pending" | "draft";

export interface AutosaveResult {
  status: SaveStatus;
  error: string;
  /** Whether the last successful save reached the public page. */
  destination: SaveDestination | null;
  /**
   * Column names currently staged, as of the last save.
   *
   * The pending bar reads this rather than the server row, because a Server
   * Action called as a plain function does not refresh the router — the bar
   * would otherwise stay hidden until a reload, which is precisely when an
   * editor would assume the edit had gone live.
   */
  stagedFields: string[] | null;
  /**
   * Overrides the staged list — for Update live page and Discard, which change
   * what is staged without going through a save.
   */
  setStagedFields: (fields: string[]) => void;
  /** Saves immediately, skipping the debounce. For blur, and for AI results. */
  saveNow: () => void;
}

type Values = Record<string, string>;

export function useAutosave(
  values: Values,
  save: (
    values: Values,
  ) => Promise<{
    ok?: boolean;
    error?: string;
    pending?: boolean;
    stagedFields?: string[];
  }>,
  options: { delay?: number; enabled?: boolean; published?: boolean } = {},
): AutosaveResult {
  const { delay = 900, enabled = true, published = false } = options;

  const signature = JSON.stringify(values);

  const [error, setError] = useState("");
  /** The value the form held on mount, so "Saved" only shows after a change. */
  const [initialSignature] = useState(signature);
  /** The signature the server has accepted. Equal means nothing to do. */
  const [savedSignature, setSavedSignature] = useState(signature);
  /** The signature a save has been requested for. */
  const [requested, setRequested] = useState<string | null>(null);
  /** What the last accepted save did with the text. */
  const [destination, setDestination] = useState<SaveDestination | null>(null);
  const [stagedFields, setStagedFields] = useState<string[] | null>(null);

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
      setDestination(
        result.pending ? "pending" : published ? "live" : "draft",
      );
      if (result.stagedFields) setStagedFields(result.stagedFields);
    });

    return () => {
      cancelled = true;
    };
    // `save` is intentionally excluded: callers pass an inline closure, and
    // depending on it would re-fire the request on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested, savedSignature, published]);

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

  return { status, error, destination, stagedFields, setStagedFields, saveNow };
}

/**
 * The one place the save indicator's wording lives.
 *
 * "Saved" on its own is the wording that caused the trouble: it answered
 * whether the work was safe and left the reader guessing about whether it was
 * public, which are different questions with different answers.
 */
export function saveStatusLabel(
  status: SaveStatus,
  error: string,
  destination: SaveDestination | null,
): string {
  if (status === "saving") return "Saving…";
  if (status === "error") return error || "Not saved";
  if (status !== "saved") return "";

  if (destination === "pending") return "Saved draft · Changes not live";
  if (destination === "live") return "Saved — Live";
  return "Saved — Draft";
}
