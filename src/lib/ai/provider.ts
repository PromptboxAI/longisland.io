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
      messages: [
        { role: "user", content: prompt },
        // Prefilling the opening brace is the cheapest way to stop a model
        // wrapping its JSON in prose or a code fence.
        { role: "assistant", content: "{" },
      ],
    });

    const block = response.content.find((part) => part.type === "text");
    raw = block && block.type === "text" ? `{${block.text}` : "";
  } catch (error) {
    // Never surface the provider's raw error: it can echo request contents.
    const status =
      error instanceof Anthropic.APIError ? ` (${error.status})` : "";
    return { ok: false, error: `The drafting service did not respond${status}.` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
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
