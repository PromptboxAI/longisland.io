import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

import { getAiApiKey, isAiConfigured } from "@/lib/env";

/**
 * The AI provider boundary. SERVER ONLY.
 *
 * `import "server-only"` makes the build fail if this is ever pulled into a
 * Client Component, which is the guardrail keeping the API key out of the
 * browser bundle — the same pattern as the Yelp client and the Supabase admin
 * client.
 *
 * Nothing above this file knows which provider or model is in use. Callers hand
 * over a Zod schema and a prompt and get back a validated object; swapping to
 * another provider means changing `complete()` here and nothing else. That is
 * the whole reason this exists rather than an SDK call inside an action.
 *
 * Structured output is enforced twice over. The model is told to return only
 * JSON, and the result is parsed through the caller's schema — so a response
 * that drifts is a caught error rather than a malformed draft written into an
 * editorial field.
 *
 * There used to be a third measure: prefilling an opening brace as the start of
 * an assistant turn, so the model had nowhere to put a preamble. It worked on
 * older models and fails outright on this one — "This model does not support
 * assistant message prefill", HTTP 400, on every single call. It was silent
 * because the surrounding code correctly refuses to echo provider errors, so
 * the only symptom an editor saw was drafting never working.
 *
 * The replacement is to tolerate what a model actually does: take the first
 * balanced JSON object out of the reply and ignore any prose or code fence
 * around it.
 */

const MODEL = "claude-sonnet-5";

/** Drafting a paragraph, not writing an essay. Keeps latency and cost sane. */
const MAX_TOKENS = 1200;

export type AiResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/** Whether the Generate controls should be offered at all. */
export function aiAvailable(): boolean {
  return isAiConfigured;
}

/**
 * Asks the model for one JSON object and validates it.
 *
 * `system` carries the standing editorial rules; `prompt` carries the case.
 * They are separate so the rules cannot be diluted by a long research payload,
 * and so a change to the rules is one edit rather than one per call site.
 */
export async function generateStructured<T>(
  schema: z.ZodType<T>,
  { system, prompt }: { system: string; prompt: string },
): Promise<AiResult<T>> {
  if (!isAiConfigured) {
    return {
      ok: false,
      error: "AI drafting is not configured. Add ANTHROPIC_API_KEY to enable it.",
    };
  }

  const client = new Anthropic({ apiKey: getAiApiKey() });

  let raw: string;
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      // Must end on a user turn: this model rejects an assistant prefill.
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content.find((part) => part.type === "text");
    raw = block && block.type === "text" ? block.text : "";
  } catch (error) {
    // Never surface the provider's raw error: it can echo request contents.
    const status =
      error instanceof Anthropic.APIError ? ` (${error.status})` : "";
    return { ok: false, error: `The drafting service did not respond${status}.` };
  }

  const json = extractJsonObject(raw);
  if (json === null) {
    return { ok: false, error: "The draft came back malformed. Try again." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "The draft came back malformed. Try again." };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: "The draft did not match the expected shape. Try again.",
    };
  }

  return { ok: true, value: result.data };
}

/**
 * The first balanced JSON object in a reply, or null.
 *
 * Brace counting rather than a regex, because a dek containing a `}` is
 * ordinary editorial text and a lazy match would truncate the object at it.
 * String literals are tracked so braces and escapes inside them are ignored.
 */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}
