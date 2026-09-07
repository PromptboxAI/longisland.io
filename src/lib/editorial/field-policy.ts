/**
 * Which fields may go live as you type, and which must be applied deliberately.
 *
 * The rule is about the shape of the text, not its importance. A badge is a
 * choice from a list and a geography label is two words: there is no state
 * halfway through typing them that reads as a broken sentence on a public page.
 * An intro paragraph has hundreds of such states, and the autosave fires 900ms
 * after you stop — which is roughly the length of a thought.
 *
 * So long-form text on a PUBLISHED record autosaves into a pending value and
 * waits for "Update live page". Everything else, and everything on a draft
 * record, writes straight through. Draft records need no staging at all: there
 * is no public page to protect.
 *
 * Kept as data in one file because the alternative — each form deciding for
 * itself — is how two forms end up disagreeing about whether the dek is risky.
 */

/** Fields that are multi-sentence editorial prose. */
const LONG_FORM: Record<string, readonly string[]> = {
  /* Ranking-level. `description` is the dek. */
  ranking: ["description", "intro", "methodology"],
  /* Per-entry. `editor_notes` is internal and never public, so it is not here. */
  ranking_entry: ["editorial_reason"],
  article: ["dek", "body"],
};

export type PolicyScope = keyof typeof LONG_FORM;

/**
 * Where a value written now should land.
 *
 * `live` writes the real column. `pending` writes the staged one and leaves the
 * public page alone until it is applied.
 */
export type WriteTarget = "live" | "pending";

export function writeTargetFor(
  scope: PolicyScope,
  field: string,
  isPublished: boolean,
): WriteTarget {
  if (!isPublished) return "live";
  return (LONG_FORM[scope] ?? []).includes(field) ? "pending" : "live";
}

export function isLongForm(scope: PolicyScope, field: string): boolean {
  return (LONG_FORM[scope] ?? []).includes(field);
}

/**
 * Splits a set of edits into what goes live now and what waits.
 *
 * Both halves come back even when empty, so a caller never has to decide what
 * an absent key means.
 */
export function splitByPolicy(
  scope: PolicyScope,
  values: Record<string, string>,
  isPublished: boolean,
): { live: Record<string, string>; pending: Record<string, string> } {
  const live: Record<string, string> = {};
  const pending: Record<string, string> = {};

  for (const [field, value] of Object.entries(values)) {
    if (writeTargetFor(scope, field, isPublished) === "pending") pending[field] = value;
    else live[field] = value;
  }

  return { live, pending };
}

/**
 * What the editor should be looking at: the pending value if there is one,
 * otherwise the live one.
 *
 * An empty string is a real pending value — clearing an intro is an edit — so
 * this checks for the key's presence rather than its truthiness.
 */
export function displayValue(
  field: string,
  liveValue: string | null,
  pending: Record<string, unknown> | null,
): string {
  if (pending && Object.prototype.hasOwnProperty.call(pending, field)) {
    return String(pending[field] ?? "");
  }
  return liveValue ?? "";
}

/** Whether anything is actually waiting. NULL and {} mean the same thing. */
export function hasPending(pending: Record<string, unknown> | null): boolean {
  return Boolean(pending && Object.keys(pending).length > 0);
}

/**
 * Drops pending entries that now match the live value.
 *
 * Typing a change and typing it back should leave nothing pending, or the
 * editor is told changes are waiting when none are — and "Update live page"
 * becomes a button that does nothing, which teaches people to ignore it.
 */
export function prunePending(
  pending: Record<string, string>,
  liveValues: Record<string, string | null>,
): Record<string, string> {
  const kept: Record<string, string> = {};
  for (const [field, value] of Object.entries(pending)) {
    if (value !== (liveValues[field] ?? "")) kept[field] = value;
  }
  return kept;
}
