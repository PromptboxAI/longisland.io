import { z } from "zod";

/**
 * Request contract for `POST /api/yelp/search`.
 *
 * Kept in its own module (no `server-only`) so a Client Component — the admin
 * generate screen, eventually — can import the schema and the input type to
 * validate a form before it hits the network, without dragging the API key
 * holding client into the browser bundle.
 */

/** Yelp's `sort_by` values. Anything else is a 400 before we call Yelp. */
export const YELP_SORT_OPTIONS = [
  "best_match",
  "rating",
  "review_count",
  "distance",
] as const;

export type YelpSortBy = (typeof YELP_SORT_OPTIONS)[number];

/** Yelp rejects `limit` above 50 outright, so cap it here instead. */
export const YELP_MAX_LIMIT = 50;

export const yelpSearchRequestSchema = z.object({
  /** Free-text query, e.g. "pizza". Optional — Yelp defaults to all businesses. */
  term: z.string().trim().min(1).max(128).optional(),
  /** Required by Yelp unless searching by coordinates, which we do not expose. */
  location: z.string().trim().min(1).max(250),
  /** Comma-separated Yelp category aliases, e.g. "pizza,italian". */
  categories: z.string().trim().min(1).max(250).optional(),
  sortBy: z.enum(YELP_SORT_OPTIONS).default("best_match"),
  limit: z.number().int().min(1).max(YELP_MAX_LIMIT).default(20),
  /** Pagination offset. Yelp caps `offset + limit` at 240 on this endpoint. */
  offset: z.number().int().min(0).max(240).default(0),
});

/** What callers send. `sortBy`, `limit` and `offset` may be omitted. */
export type YelpSearchRequest = z.input<typeof yelpSearchRequestSchema>;

/** What the route and client work with, after defaults are applied. */
export type YelpSearchParams = z.output<typeof yelpSearchRequestSchema>;
