import "server-only";

import { getYelpApiKey } from "@/lib/env";
import type { YelpSearchParams } from "@/lib/yelp/schema";
import type {
  YelpApiBusiness,
  YelpApiErrorResponse,
  YelpApiSearchResponse,
  YelpBusiness,
} from "@/lib/yelp/types";

/**
 * Yelp Fusion business search. SERVER ONLY.
 *
 * `import "server-only"` makes the build fail if this module is ever pulled
 * into a Client Component, which is the guardrail that keeps `YELP_API_KEY` out
 * of the browser bundle — the same pattern as `src/lib/supabase/admin.ts`.
 *
 * NOTE — there are two Yelp callers in this folder, and that is not yet
 * resolved:
 *
 * - `client.ts` (`searchBusinesses`) returns `BusinessCandidate`, adds county
 *   inference, and backs `/api/admin/candidates`.
 * - this module (`searchYelpBusinesses`) returns the flat `YelpBusiness` shape
 *   and backs `/api/yelp/search`.
 *
 * They were written concurrently in two sessions. They should be collapsed into
 * one client before either grows further; see docs/yelp-search.md.
 *
 * Callers get either a normalized `YelpSearchResult` or a thrown `YelpError`
 * carrying an HTTP status we are happy to expose. Yelp's own error text is
 * never forwarded verbatim: a malformed key makes Yelp echo the whole
 * `Authorization` header back in `error.description`, so relaying that body to
 * a caller would hand them the credential.
 */

const YELP_SEARCH_URL = "https://api.yelp.com/v3/businesses/search";

/** Yelp is a third party on the request path; do not hang a route on it. */
const REQUEST_TIMEOUT_MS = 10_000;

/** Failure kinds a caller may want to branch on. */
export type YelpErrorKind =
  | "missing_api_key"
  | "unauthorized"
  | "invalid_request"
  | "rate_limited"
  | "timeout"
  | "network"
  | "upstream";

/**
 * A Yelp failure with a client-safe message and an HTTP status.
 *
 * Named `YelpSearchError` rather than `YelpError` so it cannot be confused with
 * the class of that name in `client.ts`, which carries Yelp's raw status.
 *
 * `status` is what the route handler should return. It is deliberately not
 * always Yelp's own status: a bad API key is a 4xx from Yelp but a 500 for our
 * caller, because the caller did nothing wrong and cannot fix it.
 */
export class YelpSearchError extends Error {
  readonly kind: YelpErrorKind;
  readonly status: number;
  /** Yelp's status code, when the failure came back from Yelp at all. */
  readonly upstreamStatus: number | null;

  constructor(
    kind: YelpErrorKind,
    message: string,
    status: number,
    upstreamStatus: number | null = null,
  ) {
    super(message);
    this.name = "YelpSearchError";
    this.kind = kind;
    this.status = status;
    this.upstreamStatus = upstreamStatus;
  }
}

export interface YelpSearchResult {
  businesses: YelpBusiness[];
  /** Yelp's total match count, which can far exceed the page we asked for. */
  total: number;
}

/* -------------------------------------------------------------------------- */
/* Normalization                                                               */
/* -------------------------------------------------------------------------- */

/** Empty strings are Yelp's "no value" for phone and image; treat them as null. */
function nullIfBlank(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Flattens one raw Yelp business.
 *
 * Yelp omits `location`, `coordinates` and `distance` on some records (chains
 * without a storefront, or a search it could not geocode), so every nested read
 * is optional-chained rather than assumed.
 */
export function normalizeYelpBusiness(raw: YelpApiBusiness): YelpBusiness {
  return {
    id: raw.id,
    name: raw.name,
    imageUrl: nullIfBlank(raw.image_url),
    rating: typeof raw.rating === "number" ? raw.rating : null,
    reviewCount: typeof raw.review_count === "number" ? raw.review_count : 0,
    categories: (raw.categories ?? []).map((c) => c.title).filter(Boolean),
    // `address1` is the street line; `display_address[0]` covers records where
    // Yelp only filled in the formatted variant.
    address:
      nullIfBlank(raw.location?.address1) ??
      nullIfBlank(raw.location?.display_address?.[0]),
    city: nullIfBlank(raw.location?.city),
    state: nullIfBlank(raw.location?.state),
    zip: nullIfBlank(raw.location?.zip_code),
    latitude: raw.coordinates?.latitude ?? null,
    longitude: raw.coordinates?.longitude ?? null,
    phone: nullIfBlank(raw.phone),
    displayPhone: nullIfBlank(raw.display_phone),
    yelpUrl: raw.url,
    distance: typeof raw.distance === "number" ? raw.distance : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Searches Yelp businesses and returns the normalized page.
 *
 * Throws `YelpSearchError` for every failure mode — missing key, rejected
 * request, rate limit, timeout, upstream outage — so a route handler has a
 * single `catch` to map onto a response. An empty result set is NOT an error: it
 * comes back as `{ businesses: [], total: 0 }` and the caller decides what that
 * means.
 */
export async function searchYelpBusinesses({
  term,
  location,
  categories,
  sortBy = "best_match",
  limit = 20,
  offset = 0,
}: YelpSearchParams): Promise<YelpSearchResult> {
  let apiKey: string;
  try {
    apiKey = getYelpApiKey();
  } catch {
    // Rethrown as a YelpSearchError so callers never need a second error shape.
    throw new YelpSearchError(
      "missing_api_key",
      "Yelp is not configured on this server.",
      500,
    );
  }

  const params = new URLSearchParams({
    location,
    sort_by: sortBy,
    limit: String(limit),
    offset: String(offset),
  });
  if (term) params.set("term", term);
  if (categories) params.set("categories", categories);

  let response: Response;
  try {
    response = await fetch(`${YELP_SEARCH_URL}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // Results are per-query and quota-metered; a cached response here would
      // silently serve stale candidates into an editorial decision.
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new YelpSearchError("timeout", "Yelp did not respond in time.", 504);
    }
    throw new YelpSearchError("network", "Could not reach Yelp.", 502);
  }

  if (!response.ok) {
    throw await toYelpSearchError(response);
  }

  let payload: YelpApiSearchResponse;
  try {
    payload = (await response.json()) as YelpApiSearchResponse;
  } catch {
    throw new YelpSearchError(
      "upstream",
      "Yelp returned a response we could not read.",
      502,
      response.status,
    );
  }

  const businesses = Array.isArray(payload.businesses) ? payload.businesses : [];

  return {
    businesses: businesses.map(normalizeYelpBusiness),
    total: typeof payload.total === "number" ? payload.total : businesses.length,
  };
}

/**
 * Maps a non-2xx Yelp response onto a `YelpSearchError`.
 *
 * Yelp's `error.code` and `error.field` are read to classify the failure, but
 * `error.description` is never surfaced — see the note on message safety at the
 * top of this file.
 */
async function toYelpSearchError(response: Response): Promise<YelpSearchError> {
  let code: string | undefined;
  let field: string | undefined;
  try {
    const body = (await response.json()) as YelpApiErrorResponse;
    code = body.error?.code;
    field = body.error?.field;
  } catch {
    // A non-JSON error body (an HTML gateway page, say) tells us nothing extra.
  }

  switch (response.status) {
    case 400:
      // A malformed key is a 400 with `field: "Authorization"`, not a 401 —
      // Yelp only reaches the 401 path for a well-formed key it rejects.
      // Without this branch a truncated `YELP_API_KEY` would surface as "your
      // search parameters are wrong", pointing the operator at the wrong thing.
      if (field === "Authorization") {
        return new YelpSearchError(
          "unauthorized",
          "Yelp rejected this server's credentials.",
          500,
          400,
        );
      }
      return new YelpSearchError(
        "invalid_request",
        "Yelp rejected the search parameters.",
        400,
        400,
      );
    case 401:
    case 403:
      // The key is wrong or lacks access — an operator problem, not a caller
      // one, so the caller sees a 500 rather than a misleading 401.
      return new YelpSearchError(
        "unauthorized",
        "Yelp rejected this server's credentials.",
        500,
        response.status,
      );
    case 429:
      return new YelpSearchError(
        "rate_limited",
        code === "ACCESS_LIMIT_REACHED"
          ? "The daily Yelp quota for this key is exhausted."
          : "Yelp is rate limiting this server. Try again shortly.",
        429,
        429,
      );
    default:
      return new YelpSearchError(
        "upstream",
        "Yelp is unavailable right now.",
        502,
        response.status,
      );
  }
}
