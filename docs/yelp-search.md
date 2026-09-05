# Yelp business search

Server-side Yelp Fusion integration behind `POST /api/yelp/search`.

`YELP_API_KEY` is read only in `src/lib/yelp/search.ts`, which is marked
`import "server-only"`. The key never reaches the browser, and no Yelp result is
persisted to Supabase by this route.

## Files

| File | Role |
| --- | --- |
| `src/lib/yelp/types.ts` | Raw Yelp wire types + the normalized `YelpBusiness` shape. Types only, safe to import from a Client Component. |
| `src/lib/yelp/schema.ts` | Zod request schema and `YelpSearchRequest` input type. No `server-only`, so a form can validate before submitting. |
| `src/lib/yelp/search.ts` | `searchYelpBusinesses()` — server-only client, normalization, `YelpSearchError`. |
| `src/app/api/yelp/search/route.ts` | The POST route: auth gate, validation, error mapping. |
| `src/app/dev/yelp-search/page.tsx` | Throwaway browser harness at `/dev/yelp-search`. Delete once `/admin/generate` calls the route. |

## Request

`POST /api/yelp/search`, `Content-Type: application/json`.

```json
{
  "term": "pizza",
  "location": "Huntington, NY",
  "categories": "pizza",
  "sortBy": "review_count",
  "limit": 20
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `term` | no | Free text. Omit for "everything in this location". Empty string is rejected — omit the key instead. |
| `location` | **yes** | Any string Yelp can geocode. |
| `categories` | no | Comma-separated Yelp category aliases, e.g. `pizza,italian`. |
| `sortBy` | no | `best_match` (default), `rating`, `review_count`, `distance`. |
| `limit` | no | 1–50, default 20. Yelp rejects anything above 50. |
| `offset` | no | 0–240, default 0. Yelp caps `offset + limit` at 240. |

## Response

```json
{
  "businesses": [
    {
      "id": "pL-sOsNU_m6D6xLR4MvgyA",
      "name": "Little Vincent's Pizza",
      "imageUrl": "https://s3-media0.fl.yelpcdn.com/bphoto/...",
      "rating": 3.9,
      "reviewCount": 484,
      "categories": ["Pizza"],
      "address": "329 New York Ave",
      "city": "Huntington",
      "state": "NY",
      "zip": "11743",
      "latitude": 40.8711923,
      "longitude": -73.4264869,
      "phone": "+16314239620",
      "displayPhone": "(631) 423-9620",
      "yelpUrl": "https://www.yelp.com/biz/little-vincents-pizza-huntington?...",
      "distance": 2069.28
    }
  ],
  "count": 20,
  "total": 262
}
```

`count` is the number of records returned; `total` is Yelp's total match count.
`distance` is in **meters** and is `null` when Yelp did not return it. Every
optional field is `null` rather than absent, so the shape is stable.

**No results is a 200**, not an error: `{"businesses": [], "count": 0, "total": 0}`.

## Errors

All failures share one envelope:

```json
{ "error": { "code": "invalid_request", "message": "…", "details": [ … ] } }
```

| Status | `code` | Cause |
| --- | --- | --- |
| 400 | `invalid_request` | Body is not JSON, fails the schema (`details` lists `field`/`message`), or Yelp rejected the parameters. |
| 401 | `unauthorized` | Supabase is configured and the caller has no session. |
| 429 | `rate_limited` | Yelp throttle, or the daily quota for the key is exhausted. |
| 500 | `not_configured` | `YELP_API_KEY` missing or rejected by Yelp. An operator problem, so the caller is not told it was an auth failure. |
| 502 / 504 | `upstream_error` | Yelp unreachable, timed out (10s), or returned an unreadable body. |
| 503 | `not_configured` | Production without Supabase credentials — see access, below. |

Yelp's own `error.description` is never forwarded. A **malformed** key makes Yelp
return `400 VALIDATION_ERROR` with the whole `Authorization` header echoed back
in `description` and `instance`; relaying that body to a caller would hand them
the credential.

## Access

The route spends metered third-party quota, so it is not public:

- **Supabase configured** → an authenticated user is required (matches the
  `/admin` gate in `src/middleware.ts`). Auth is re-checked in the route rather
  than trusted from middleware, which does not currently run on `/api/yelp/*`.
- **Supabase not configured** (today's local state) → allowed in development
  only; returns 503 in production.

## Testing

The route is exercised in the browser at `/dev/yelp-search`, or with curl:

```bash
curl -s -X POST http://localhost:3000/api/yelp/search \
  -H "Content-Type: application/json" \
  -d '{"term":"pizza","location":"Huntington, NY","sortBy":"review_count","limit":20}'
```

Verified locally on 2026-09-04: 20 records returned of 262 matches, all four
sort modes, the `categories` filter, the empty-result case, and the 400 paths
(missing `location`, bad `sortBy`, `limit` over 50, malformed JSON).

## Wiring `/admin/generate`

`/admin/generate` did not exist when this was written. To call the route from a
Client Component:

```ts
import type { YelpSearchRequest } from "@/lib/yelp/schema";
import type { YelpBusiness } from "@/lib/yelp/types";

async function searchYelp(body: YelpSearchRequest): Promise<YelpBusiness[]> {
  const response = await fetch("/api/yelp/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "Search failed.");

  return payload.businesses as YelpBusiness[];
}
```

Import types from `schema.ts` / `types.ts` only. `search.ts` is `server-only`
and will fail the build if a Client Component reaches it.

## Resolved: one Yelp client

There were briefly **two** Yelp callers in `src/lib/yelp/`, written concurrently
in two sessions. They have been collapsed into one.

**Kept** — `search.ts` + `schema.ts` + `types.ts`, backing `POST /api/yelp/search`:

- server-only API key handling (`import "server-only"`)
- zod request validation, including `sort_by: distance`
- a normalized `YelpBusiness` shape
- sanitized errors — Yelp's `error.description` is never forwarded
- `cache: "no-store"` and a 10s timeout

**Removed** — `client.ts` and `/api/admin/candidates`:

- It built its client-facing error message from the raw Yelp body
  (`detail.slice(0, 200)`). Yelp echoes the whole `Authorization` header back in
  `error.description` when the key is malformed, so that path could have
  returned the API key to the browser. This was the deciding reason to keep
  `search.ts` as the base.
- It cached responses for 300s, which can serve stale candidates into an
  editorial decision.

**Merged forward** from the removed client:

- `SEARCH_AREAS` / `SEARCH_TOWNS` / `resolveArea` — Long Island area presets,
  now in `areas.ts`
- `inferCounty` — Nassau/Suffolk derivation from town, also in `areas.ts` and
  applied during normalization, so `YelpBusiness.county` maps straight onto
  `businesses.county`

`/dev/yelp-search`, the throwaway browser harness, was deleted as intended once
`/admin/generate` began calling the canonical route.

### Where the review floor lives

`/admin/generate` applies "minimum reviews" client-side after the fetch, rather
than the route doing it. The route stays a thin Yelp proxy with one contract and
no editorial policy baked in.
