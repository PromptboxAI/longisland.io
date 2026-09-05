/**
 * Search areas offered in the admin research tool.
 *
 * Yelp takes a free-text location, so each area maps to a location string plus
 * an optional radius. Regions that Yelp does not recognise as a place (the
 * North Fork, the East End) are anchored on a town inside them with a radius
 * wide enough to cover the area.
 *
 * Radius is metres and capped by Yelp at 40000 (~25 miles).
 */

export interface SearchArea {
  value: string;
  label: string;
  /** Location string sent to Yelp. */
  location: string;
  /** Optional metres radius; omitted lets Yelp choose. */
  radius?: number;
}

export const SEARCH_AREAS: SearchArea[] = [
  { value: "long-island", label: "Long Island", location: "Long Island, NY", radius: 40000 },
  { value: "nassau-county", label: "Nassau County", location: "Nassau County, NY", radius: 24000 },
  { value: "suffolk-county", label: "Suffolk County", location: "Suffolk County, NY", radius: 40000 },
  { value: "north-shore", label: "North Shore", location: "Huntington, NY", radius: 24000 },
  { value: "south-shore", label: "South Shore", location: "Babylon, NY", radius: 24000 },
  { value: "north-fork", label: "North Fork", location: "Mattituck, NY", radius: 24000 },
  { value: "hamptons", label: "The Hamptons", location: "Southampton, NY", radius: 32000 },
  { value: "east-end", label: "East End", location: "Riverhead, NY", radius: 40000 },
  { value: "fire-island", label: "Fire Island", location: "Ocean Beach, NY", radius: 16000 },
];

/** Towns an editor can target directly. Mirrors the seed place list. */
export const SEARCH_TOWNS = [
  "Huntington", "Garden City", "Rockville Centre", "Patchogue", "Port Jefferson",
  "Smithtown", "Stony Brook", "Babylon", "Bay Shore", "Sayville", "Massapequa",
  "Farmingdale", "Mineola", "Great Neck", "Manhasset", "Roslyn", "Oyster Bay",
  "Long Beach", "Freeport", "Hicksville", "Commack", "Hauppauge", "Ronkonkoma",
  "Riverhead", "Greenport", "Mattituck", "Southampton", "East Hampton",
  "Montauk", "Westhampton Beach",
];

/**
 * Nassau and Suffolk are the only two counties on Long Island, and Yelp does
 * not return a county field. Deriving it from the town keeps candidate records
 * consistent with the rest of the data model, where `businesses.county` is how
 * a business is attached to a county page.
 *
 * Anything not in the Nassau list is treated as Suffolk — Suffolk is far larger
 * and has many more small hamlets, so it is the safer default, and an editor
 * can correct it in the business editor.
 */
const NASSAU_TOWNS = new Set([
  "garden city", "rockville centre", "massapequa", "farmingdale", "mineola",
  "great neck", "manhasset", "roslyn", "oyster bay", "long beach", "freeport",
  "hicksville", "hempstead", "levittown", "valley stream", "westbury",
  "glen cove", "port washington", "syosset", "plainview", "bethpage",
  "wantagh", "seaford", "merrick", "bellmore", "baldwin", "lynbrook",
  "malverne", "floral park", "new hyde park", "franklin square", "uniondale",
  "east meadow", "garden city park", "carle place", "jericho", "woodbury",
  "locust valley", "sea cliff", "island park", "oceanside", "elmont",
]);

export function inferCounty(city: string | null | undefined): string | null {
  if (!city) return null;
  return NASSAU_TOWNS.has(city.trim().toLowerCase())
    ? "Nassau County"
    : "Suffolk County";
}

export function resolveArea(value: string): { location: string; radius?: number } {
  const preset = SEARCH_AREAS.find((area) => area.value === value);
  if (preset) return { location: preset.location, radius: preset.radius };

  // Anything else is treated as a town name typed by the editor.
  return { location: `${value}, NY` };
}
