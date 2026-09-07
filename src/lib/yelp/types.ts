/**
 * Yelp Fusion types.
 *
 * Split into two halves:
 *
 * - `YelpApi*` mirrors the raw wire format of
 *   `GET https://api.yelp.com/v3/businesses/search`. Nothing outside
 *   `src/lib/yelp/search.ts` should touch these.
 * - `YelpBusiness` is the flat, normalized shape the rest of the app consumes.
 *
 * This file deliberately has no `server-only` guard: it is types only, so it is
 * safe for a Client Component to `import type` from it. The client that holds
 * the API key lives in `search.ts`, which IS server-only.
 */

/* -------------------------------------------------------------------------- */
/* Raw Yelp wire format                                                        */
/* -------------------------------------------------------------------------- */

export interface YelpApiCategory {
  alias: string;
  title: string;
}

export interface YelpApiLocation {
  address1: string | null;
  address2: string | null;
  address3: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  display_address: string[];
}

export interface YelpApiCoordinates {
  latitude: number | null;
  longitude: number | null;
}

export interface YelpApiBusiness {
  id: string;
  alias: string;
  name: string;
  image_url: string;
  is_closed: boolean;
  url: string;
  review_count: number;
  categories: YelpApiCategory[];
  rating: number;
  coordinates: YelpApiCoordinates | null;
  location: YelpApiLocation | null;
  phone: string;
  display_phone: string;
  /** Meters from the search location. Absent when Yelp cannot compute it. */
  distance?: number;
  price?: string;
}

export interface YelpApiSearchResponse {
  businesses: YelpApiBusiness[];
  total: number;
  region?: { center: { latitude: number; longitude: number } };
}

/** Yelp's error envelope, e.g. `{ error: { code: "VALIDATION_ERROR", ... } }`. */
export interface YelpApiErrorResponse {
  error?: {
    code?: string;
    description?: string;
    field?: string;
  };
}

/* -------------------------------------------------------------------------- */
/* Normalized shape                                                            */
/* -------------------------------------------------------------------------- */

/**
 * One business, flattened for the admin UI and (later) for mapping onto the
 * `businesses` table in Supabase.
 *
 * Every field that Yelp can omit is `null` rather than `undefined` so the shape
 * survives `JSON.stringify` over the wire without keys disappearing.
 */
export interface YelpBusiness {
  id: string;
  name: string;
  imageUrl: string | null;
  rating: number | null;
  reviewCount: number;
  /** Human-readable category titles, e.g. `["Pizza", "Italian"]`. */
  categories: string[];
  /** Yelp category aliases, e.g. "pizza", "bakeries". Stable; titles are not. */
  categoryAliases: string[];
  address: string | null;
  city: string | null;
  /**
   * Derived from `city`, not returned by Yelp. Mirrors `businesses.county` so a
   * candidate can be written straight into our schema.
   */
  county: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  displayPhone: string | null;
  yelpUrl: string;
  /** Meters from the search location, or `null` when Yelp did not return it. */
  distance: number | null;
}
