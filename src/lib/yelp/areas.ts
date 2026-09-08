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
  // Added after a live sweep of eight Yelp searches turned them up as real
  // results our list did not recognise.
  "great neck plaza",
  "south farmingdale",
  "north new hyde park",
  "east hills",
  "roslyn estates",
  "kensington",
  "saddle rock",
  "russell gardens",
  "thomaston",
  "harbor hills",
  "flower hill",
  "plandome manor",
  "baxter estates",
  // Added after a live data audit found Old Bethpage stored as Suffolk: the
  // list simply did not contain it, and an unknown town is how a wrong county
  // gets typed in by hand.
  "old bethpage",
  "east massapequa",
  "north merrick",
  "north woodmere",
  "mill neck",
  "matinecock",
  "lattingtown",
  "upper brookville",
  "centre island",
  "cove neck",
  "laurel hollow",
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
  /*
   * Fire Island. Every community on it is in Suffolk County, and the whole
   * barrier island was missing — 45 businesses across one sweep, all silently
   * dropped, which is how an allowlist fails: quietly, and only for the places
   * nobody thought of.
   */
  "ocean beach",
  "ocean bay park",
  "fire island",
  "fire island pines",
  "cherry grove",
  "kismet",
  "fair harbor",
  "davis park",
  "saltaire",
  "seaview",
  "atlantique",
  "dunewood",
  "lonelyville",
  "point o woods",
  "water island",
  "robbins rest",
  // Mainland Suffolk hamlets the list had missed.
  "middle island",
  "speonk",
  "islandia",
  "upton",
  "wainscott",
  "westhampton dunes",
  "napeague",
  "east marion",
  "northville",
  "sagaponack",
  "noyack",
  "north sea",
  "flanders",
  "riverside",
  "shinnecock hills",
  "springs",
  /*
   * Variants and misspellings Yelp actually returns. They are the same places;
   * refusing to recognise them loses real businesses over a full stop.
   */
  "mt sinai",
  "port jefferson sta",
  "bellport village",
  "huntingtion",
  "e setauket",
  "s setauket",
  "pt jefferson",
  "cent islip",
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

/**
 * Why a candidate is or is not eligible — three answers, not two.
 *
 * A yes/no test on an allowlist has one failure mode and it is a bad one: a
 * place the list has never heard of is indistinguishable from a place we know
 * to be elsewhere, so both vanish together. A live sweep found 45 Fire Island
 * businesses being dropped that way, and nothing on screen could have told an
 * editor they existed.
 *
 * Splitting "not in New York" from "in New York, unrecognised" makes the gap
 * visible. The first is a confident exclusion. The second is the list admitting
 * what it does not know, and it belongs in front of a person.
 */
/**
 * Whether a ZIP code is on Long Island at all.
 *
 * Deliberately narrower than "which county". Nassau and Suffolk interleave —
 * Hicksville is 11801 and Amityville is 11701, so no contiguous split exists —
 * and a hand-rolled table that got those edges wrong would raise false alarms
 * until people stopped reading them. A check nobody trusts is worse than none.
 *
 * What a ZIP CAN settle is the failure that actually happened: a Connecticut or
 * Westchester address stored as Suffolk County. Those are not 11xxx at all, and
 * that is a fact with no edge cases. Brooklyn and Queens are excluded by name
 * because they share the prefix, which is exactly what makes them dangerous.
 *
 * Returns null when there is nothing to judge — a missing or malformed ZIP is
 * common and must never be read as "not Long Island".
 */
export function zipIsLongIsland(zip: string | null | undefined): boolean | null {
  if (!zip) return null;
  const digits = zip.trim().slice(0, 5);
  if (!/^\d{5}$/.test(digits)) return null;

  const n = Number(digits);

  // Anywhere outside 11xxx is not Nassau or Suffolk. This is the whole point.
  if (n < 11000 || n > 11999) return false;

  // Brooklyn.
  if (n >= 11201 && n <= 11256) return false;
  // Queens, including the Rockaways and the two Floral Park exceptions.
  if (n === 11004 || n === 11005) return false;
  if (n >= 11101 && n <= 11109) return false;
  if (n >= 11351 && n <= 11499) return false;
  if (n >= 11690 && n <= 11697) return false;

  return true;
}

/**
 * Where the town list and the ZIP code disagree.
 *
 * Returns the disagreement in words, or null when they agree or when there is
 * not enough to compare. Two directions matter, and they mean different things:
 * a county asserted over an off-island ZIP is a fabrication, and an unknown
 * town with a Long Island ZIP is a gap in our list.
 */
export function countyConflict(
  city: string | null | undefined,
  state: string | null | undefined,
  zip: string | null | undefined,
): string | null {
  const byName = inferCounty(city, state);
  const onIsland = zipIsLongIsland(zip);

  if (onIsland === null) return null;

  if (byName && !onIsland) {
    return `Stored as ${byName}, but ZIP ${zip} is not on Long Island.`;
  }
  if (!byName && onIsland) {
    return `ZIP ${zip} is on Long Island, but ${city ?? "this town"} is not in our town list.`;
  }
  return null;
}

export type LocationVerdict = "long_island" | "outside_ny" | "unrecognised";

export function classifyLocation(
  city: string | null | undefined,
  state?: string | null,
): LocationVerdict {
  if (state && state.trim().toUpperCase() !== "NY") return "outside_ny";
  if (inferCounty(city, state)) return "long_island";
  return "unrecognised";
}

export function resolveArea(value: string): { location: string; radius?: number } {
  const preset = SEARCH_AREAS.find((area) => area.value === value);
  if (preset) return { location: preset.location, radius: preset.radius };

  // Anything else is treated as a town name typed by the editor.
  return { location: `${value}, NY` };
}
