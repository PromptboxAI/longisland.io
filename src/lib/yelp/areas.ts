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
 * A town not on either list gets NO county rather than a guess. The previous
 * rule — anything not Nassau is Suffolk — was defensible inside Long Island and
 * catastrophic outside it: a Yelp search for "Long Island" reaches New Haven and
 * Queens, and every one of those businesses was being stamped "Suffolk County".
 * That is a fabricated fact written onto a record, and it is worse than a blank
 * field an editor can fill in.
 */
const NASSAU_TOWNS = new Set([
  "garden city", "rockville centre", "massapequa", "massapequa park",
  "farmingdale", "mineola", "great neck", "manhasset", "roslyn",
  "roslyn heights", "oyster bay", "long beach", "freeport", "hicksville",
  "hempstead", "west hempstead", "levittown", "valley stream", "westbury",
  "old westbury", "glen cove", "port washington", "syosset", "plainview",
  "bethpage", "wantagh", "seaford", "merrick", "bellmore", "north bellmore",
  "baldwin", "lynbrook", "malverne", "floral park", "new hyde park",
  "franklin square", "uniondale", "east meadow", "garden city park",
  "carle place", "jericho", "woodbury", "locust valley", "sea cliff",
  "island park", "oceanside", "elmont", "lawrence", "cedarhurst", "inwood",
  "woodmere", "hewlett", "atlantic beach", "point lookout", "east rockaway",
  "lido beach", "albertson", "williston park", "mineola park", "greenvale",
  "glen head", "bayville", "east norwich", "brookville", "old brookville",
  "muttontown", "wheatley heights", "north massapequa", "south hempstead",
  "roosevelt", "baldwin harbor", "merrick park", "salisbury",
]);

/**
 * Suffolk towns, villages and hamlets.
 *
 * Not exhaustive — Suffolk has hundreds of hamlets — but it covers the places a
 * ranking is realistically about. An unrecognised town returns no county, which
 * an editor sees as blank and can correct, rather than being told something
 * untrue.
 */
const SUFFOLK_TOWNS = new Set([
  "huntington", "huntington station", "cold spring harbor", "northport",
  "east northport", "centerport", "greenlawn", "commack", "smithtown",
  "saint james", "st james", "st. james", "nesconset", "hauppauge",
  "kings park", "stony brook", "setauket", "east setauket", "port jefferson",
  "port jefferson station", "mount sinai", "miller place", "rocky point",
  "wading river", "riverhead", "calverton", "aquebogue", "jamesport",
  "mattituck", "cutchogue", "southold", "greenport", "orient", "shelter island",
  "sag harbor", "east hampton", "amagansett", "montauk", "bridgehampton",
  "water mill", "southampton", "hampton bays", "westhampton",
  "westhampton beach", "quogue", "east quogue", "remsenburg", "eastport",
  "center moriches", "east moriches", "moriches", "mastic", "mastic beach",
  "shirley", "brookhaven", "bellport", "patchogue", "east patchogue",
  "blue point", "bayport", "sayville", "west sayville", "oakdale",
  "bohemia", "holbrook", "holtsville", "farmingville", "medford",
  "selden", "centereach", "lake grove", "ronkonkoma", "lake ronkonkoma",
  "islip", "east islip", "west islip", "central islip", "brentwood",
  "bay shore", "islip terrace", "great river", "bayville beach",
  "babylon", "north babylon", "west babylon", "lindenhurst", "copiague",
  "amityville", "deer park", "wyandanch", "dix hills", "melville",
  "wheatley", "east farmingdale", "yaphank", "manorville", "ridge",
  "shoreham", "sound beach", "coram", "port jeff", "hampton",
  "new suffolk", "peconic", "laurel", "baiting hollow", "fishers island",
]);

/**
 * The county a business is in, or null when we do not know.
 *
 * `state` matters: a Connecticut town sharing a name with a Long Island one
 * must not inherit its county, and a Yelp search for Long Island genuinely
 * reaches Connecticut.
 */
export function inferCounty(
  city: string | null | undefined,
  state?: string | null,
): string | null {
  if (!city) return null;
  if (state && state.trim().toUpperCase() !== "NY") return null;

  const key = city.trim().toLowerCase();
  if (NASSAU_TOWNS.has(key)) return "Nassau County";
  if (SUFFOLK_TOWNS.has(key)) return "Suffolk County";
  return null;
}

/**
 * Whether a candidate is on Long Island as we define it: Nassau or Suffolk.
 *
 * Queens and Brooklyn are on the island geographically and are deliberately
 * excluded — "Long Island" in our editorial sense means the two counties, and a
 * bagel shop in Sunnyside does not belong in a Long Island ranking.
 */
export function isOnLongIsland(
  city: string | null | undefined,
  state?: string | null,
): boolean {
  return inferCounty(city, state) !== null;
}

export function resolveArea(value: string): { location: string; radius?: number } {
  const preset = SEARCH_AREAS.find((area) => area.value === value);
  if (preset) return { location: preset.location, radius: preset.radius };

  // Anything else is treated as a town name typed by the editor.
  return { location: `${value}, NY` };
}
