"use client";

import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

/**
 * AI proposes. A human approves. Only then does an editorial field change.
 *
 * Drafting used to write straight into the real fields, which on a published
 * ranking meant AI copy reached readers before anyone had read it. The
 * generated text now lands here instead — editable, so an editor can fix a
 * phrase rather than regenerate and hope — and nothing moves until Apply.
 *
 * Editable is the important part. A panel that only offered accept or reject
 * would push people towards accepting a nearly-right paragraph, which is how
 * generated copy ends up published with a sentence nobody would have written.
 */

export interface AiDraftField {
  key: string;
  label: string;
  value: string;
  /** Textareas for prose, a single line for a phrase, a select for a badge. */
  kind: "text" | "textarea" | "select";
  options?: readonly string[];
  /** Set when applying this field would stage rather than publish. */
  staged?: boolean;
}

export function AiReviewPanel({
  fields,
  note,
  onApply,
  onRegenerate,
  onDiscard,
}: {
  fields: AiDraftField[];
  /** The model's own account of what it had to work with. */
  note?: string | null;
  onApply: (values: Record<string, string>) => Promise<{ error?: string }>;
  onRegenerate: () => void;
  onDiscard: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((field) => [field.key, field.value])),
  );
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");

  const input =
    "w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";

  const anyStaged = fields.some((field) => field.staged);

  return (
    <div className="mt-3 rounded-card border-2 border-brand-300 bg-brand-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-bold text-navy-900">
          <Sparkles aria-hidden="true" className="size-4 text-brand-600" />
          AI Draft — Not Live
        </p>
        <p className="text-xs text-ink-500">
          Nothing has changed yet. Edit anything below, then apply.
        </p>
      </div>

      <div className="mt-3 space-y-3">
        {fields.map((field) => (
          <div key={field.key}>
            <label
              htmlFor={`ai-${field.key}`}
              className="block text-xs font-semibold text-navy-900"
            >
              {field.label}
            </label>

            {field.kind === "select" ? (
              <select
                id={`ai-${field.key}`}
                value={values[field.key] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))
                }
                className={`mt-1 ${input}`}
              >
                <option value="">No badge</option>
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.kind === "textarea" ? (
              <textarea
                id={`ai-${field.key}`}
                rows={4}
                value={values[field.key] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))
                }
                className={`mt-1 ${input}`}
              />
            ) : (
              <input
                id={`ai-${field.key}`}
                type="text"
                value={values[field.key] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))
                }
                className={`mt-1 ${input}`}
              />
            )}
          </div>
        ))}
      </div>

      {note ? (
        <p className="mt-3 border-t border-brand-200 pt-2 text-xs leading-relaxed text-ink-500">
          <span className="font-semibold text-navy-900">What this rests on: </span>
          {note}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            startTransition(async () => {
              setError("");
              const result = await onApply(values);
              if (result.error) setError(result.error);
            })
          }
          className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : null}
          Apply to entry
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={onRegenerate}
          className="inline-flex items-center gap-1.5 rounded-full border border-navy-300 px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-50 disabled:opacity-60"
        >
          <Sparkles aria-hidden="true" className="size-3.5" />
          Regenerate
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={onDiscard}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-ink-500 hover:text-red-700 disabled:opacity-60"
        >
          <Trash2 aria-hidden="true" className="size-3.5" />
          Discard
        </button>
      </div>

      {/*
        Said before Apply rather than discovered after it. Applying to a
        published long-form field stages the text — one more deliberate step —
        and an editor who expects it to go live will otherwise read the
        unchanged public page as a bug.
      */}
      {anyStaged ? (
        <p className="mt-2 text-xs text-amber-800">
          Applying puts this into the editor as a saved change. It reaches the
          public page when you press Update live page.
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
