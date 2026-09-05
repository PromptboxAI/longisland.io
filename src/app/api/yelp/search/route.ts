import { type NextRequest, NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  YelpSearchError,
  type YelpErrorKind,
  searchYelpBusinesses,
} from "@/lib/yelp/search";
import { yelpSearchRequestSchema } from "@/lib/yelp/schema";
import type { YelpBusiness } from "@/lib/yelp/types";

/**
 * `POST /api/yelp/search` — proxies a Yelp Fusion business search.
 *
 * POST rather than GET on purpose: the response is never cacheable (it burns
 * Yelp quota per call and feeds an editorial workflow), and a GET would invite
 * search URLs being shared around and replayed.
 *
 * Access: this endpoint spends a metered third-party quota, so it is not public.
 * Once Supabase credentials exist it requires a signed-in user, matching the
 * /admin gate in `src/middleware.ts`. Before then — the current local state —
 * it is available in development only, so the route can be exercised while the
 * admin area is still being built, and returns 503 in production.
 */

/** Yelp results are per-query and quota-metered; never prerender or cache. */
export const dynamic = "force-dynamic";

type ErrorCode =
  | "unauthorized"
  | "not_configured"
  | "invalid_request"
  | "rate_limited"
  | "upstream_error"
  | "server_error";

interface ErrorBody {
  error: { code: ErrorCode; message: string; details?: unknown };
}

function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  details?: unknown,
) {
  const body: ErrorBody = { error: { code, message } };
  if (details !== undefined) body.error.details = details;
  return NextResponse.json(body, { status });
}

/**
 * Confirms the caller may spend Yelp quota.
 *
 * Returns `null` when allowed, or the response to send back when not. Auth is
 * re-checked here rather than trusted from middleware: middleware does not run
 * on this path today, and an API route that assumes an upstream gate is one
 * matcher edit away from being wide open.
 */
async function authorize(): Promise<NextResponse | null> {
  if (!isSupabaseConfigured) {
    if (process.env.NODE_ENV === "production") {
      return errorResponse(
        503,
        "not_configured",
        "Authentication is not configured on this server.",
      );
    }
    // Local development without Supabase credentials: allow, so the Yelp
    // integration is testable before the admin login exists.
    return null;
  }

  const supabase = await createClient();
  if (!supabase) {
    // Unreachable given the guard above, but `createClient` is nullable by
    // contract and a 503 is the right answer if that ever changes.
    return errorResponse(
      503,
      "not_configured",
      "Authentication is not configured on this server.",
    );
  }

  // getUser() revalidates against the auth server; getSession() would trust the
  // cookie as-is, which is not good enough for an access decision.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse(401, "unauthorized", "Sign in to search Yelp.");
  }
  return null;
}

/** How a client-facing error code is chosen for each Yelp failure kind. */
const ERROR_CODE_BY_KIND: Record<YelpErrorKind, ErrorCode> = {
  missing_api_key: "not_configured",
  unauthorized: "not_configured",
  invalid_request: "invalid_request",
  rate_limited: "rate_limited",
  timeout: "upstream_error",
  network: "upstream_error",
  upstream: "upstream_error",
};

export async function POST(request: NextRequest) {
  const denied = await authorize();
  if (denied) return denied;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return errorResponse(
      400,
      "invalid_request",
      "Request body must be valid JSON.",
    );
  }

  const parsed = yelpSearchRequestSchema.safeParse(json);
  if (!parsed.success) {
    // `issues` is flattened to path + message so the caller can point at the
    // offending field without us shipping zod internals over the wire.
    return errorResponse(
      400,
      "invalid_request",
      "The search request is not valid.",
      parsed.error.issues.map((issue) => ({
        field: issue.path.join(".") || "(root)",
        message: issue.message,
      })),
    );
  }

  try {
    const { businesses, total } = await searchYelpBusinesses(parsed.data);

    // No matches is a successful search, not an error — 200 with an empty list
    // and an explicit `count`, so the UI can say "no results" without guessing.
    return NextResponse.json({
      businesses: businesses satisfies YelpBusiness[],
      count: businesses.length,
      total,
    });
  } catch (error) {
    if (error instanceof YelpSearchError) {
      // Logged server-side with the upstream status, which is the part that is
      // useful for debugging and the part we do not return to the caller.
      console.error(
        `[yelp/search] ${error.kind}` +
          (error.upstreamStatus ? ` (upstream ${error.upstreamStatus})` : ""),
        error.message,
      );

      return errorResponse(
        error.status,
        ERROR_CODE_BY_KIND[error.kind],
        error.message,
      );
    }

    console.error("[yelp/search] unexpected error", error);
    return errorResponse(500, "server_error", "The search could not be run.");
  }
}
