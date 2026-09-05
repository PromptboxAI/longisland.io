import type { Category, Place, PlaceType } from "@/types/database";

/**
 * Development seed taxonomy.
 *
 * Categories and places are real Long Island geography and ordinary category
 * nouns, so these are safe to ship as-is and become the first rows you insert
 * into Supabase. The *businesses* in this seed set are invented — see
 * ./businesses.ts.
 */

const NOW = "2026-01-15T12:00:00.000Z";

function category(
  name: string,
  slug: string,
  parentSlug: string | null,
  description: string,
  icon: string | null = null,
): Category {
  return {
    id: `cat_${slug}`,
    name,
    slug,
    description,
    parent_id: parentSlug ? `cat_${parentSlug}` : null,
    icon,
    hero_image_url: null,
    status: "published",
    created_at: NOW,
    updated_at: NOW,
  };
}

/** Child categories written compactly: [name, slug, blurb]. */
type ChildTuple = [name: string, slug: string, description: string];

function children(parentSlug: string, rows: ChildTuple[]): Category[] {
  return rows.map(([name, slug, description]) =>
    category(name, slug, parentSlug, description),
  );
}

export const TOP_LEVEL_CATEGORIES: Category[] = [
  category(
    "Eat & Drink",
    "eat-drink",
    null,
    "Where Long Island actually eats — slice shops, Sunday-morning bagel lines, waterfront tables and the bars worth the drive.",
    "utensils",
  ),
  category(
    "Things to Do",
    "things-to-do",
    null,
    "Beaches, trails, farms, museums and the seasonal traditions that make the calendar here worth keeping.",
    "ferris-wheel",
  ),
  category(
    "Home & Services",
    "home-services",
    null,
    "The trades and advisors Long Island homeowners call twice — and recommend to their neighbors.",
    "hammer",
  ),
  category(
    "Family",
    "family",
    null,
    "Schools, camps, classes and the places that make a rainy Saturday with kids survivable.",
    "users",
  ),
  category(
    "Health & Beauty",
    "health-beauty",
    null,
    "Practices, studios and chairs worth booking, from your dentist to your barber.",
    "heart-pulse",
  ),
  category(
    "Shopping",
    "shopping",
    null,
    "Main-street boutiques, specialty food counters and the shops that beat next-day delivery.",
    "shopping-bag",
  ),
];

export const CHILD_CATEGORIES: Category[] = [
  ...children("eat-drink", [
    ["Pizza", "pizza", "Coal-fired, Sicilian, grandma and the corner slice — Long Island takes it seriously."],
    ["Bagels", "bagels", "Boiled, hand-rolled and gone by ten on a Sunday."],
    ["Italian", "italian", "Red sauce institutions and the newer kitchens rewriting them."],
    ["Steakhouses", "steakhouses", "Dry-aged, dark-wood and built for an occasion."],
    ["Seafood", "seafood", "Off the boat on both forks, plus the shacks worth the wait."],
    ["Burgers", "burgers", "Griddled, smashed and stacked across the island."],
    ["Breakfast", "breakfast", "Counters, diners and the early tables worth setting an alarm for."],
    ["Brunch", "brunch", "Late plates, long tables and bottomless everything."],
    ["Coffee", "coffee", "Roasters and cafés that treat the bean like the point."],
    ["Ice Cream", "ice-cream", "Scoop shops, soft serve and the summer lines outside both."],
    ["Sushi", "sushi", "Omakase counters and neighborhood rooms worth a standing order."],
    ["Chinese", "chinese", "Regional kitchens and takeout standbys."],
    ["Mexican", "mexican", "Taquerias, mariscos and the salsa worth driving for."],
    ["Diners", "diners", "The Long Island institution — vinyl booths, endless menus, open late."],
    ["Bakeries", "bakeries", "Bread, cannoli, crumb cake and holiday cookie trays."],
    ["Delis", "delis", "Hero counters, cold cuts and the breakfast sandwich economy."],
    ["Wings", "wings", "Crisp, saucy and argued about endlessly."],
    ["Cocktails", "cocktails", "Rooms where the bar program is the reason to go."],
    ["Date Night", "date-night", "Tables built for a real evening out, not just dinner."],
    ["Fine Dining", "fine-dining", "Tasting menus and special-occasion rooms."],
    ["Waterfront Dining", "waterfront-dining", "Docks, decks and dinner with the boats coming in."],
    ["Restaurants", "restaurants", "The full field — every kitchen worth knowing on Long Island."],
    ["Bars", "bars", "Neighborhood taps, dive classics and late-night rooms."],
    ["Breweries", "breweries", "Taprooms and production houses across both counties."],
    ["Wineries", "wineries", "North Fork tasting rooms and the vineyards behind them."],
  ]),
  ...children("things-to-do", [
    ["Beaches", "beaches", "Ocean, sound and bay — the reason people move here."],
    ["Parks", "parks", "State parks, preserves and the green space in between."],
    ["Hiking", "hiking", "Pine barrens, bluff trails and greenbelt miles."],
    ["Kids Activities", "kids-activities", "Somewhere to take them that everyone survives."],
    ["Museums", "museums", "Art, maritime history and the collections worth an afternoon."],
    ["Golf", "golf", "Public tracks, resort play and the courses you can actually get on."],
    ["Mini Golf", "mini-golf", "Windmills, waterfalls and summer-night scorecards."],
    ["Bowling", "bowling", "Leagues, lanes and rainy-day plans."],
    ["Arcades", "arcades", "Tokens, tickets and the boardwalk classics."],
    ["Farms", "farms", "Stands, u-pick and the fall weekends built around them."],
    ["Vineyards", "vineyards", "Rows, tasting rooms and long afternoons on the North Fork."],
    ["Fishing", "fishing", "Party boats, surf casting and the fall run."],
    ["Boating", "boating", "Marinas, launches and charters on both shores."],
    ["Seasonal Activities", "seasonal-activities", "What is worth doing right now, whenever now is."],
    ["Fall Activities", "fall-activities", "Cider, corn mazes and peak-color drives."],
    ["Holiday Lights", "holiday-lights", "Displays, drive-throughs and the streets that go all out."],
    ["Festivals", "festivals", "Street fairs, food festivals and town traditions."],
    ["Live Music", "live-music", "Clubs, theaters and the rooms with real sound."],
    ["Attractions", "attractions", "The landmarks worth the trip, in season and out."],
    ["Date Ideas", "date-ideas", "Beyond dinner — plans that make an evening."],
    ["Rainy Day Activities", "rainy-day-activities", "Indoor plans for the weekends the forecast ruins."],
  ]),
  ...children("home-services", [
    ["Contractors", "contractors", "General contractors for work that outlasts the invoice."],
    ["Roofers", "roofers", "Tear-offs, storm work and the crews who answer the phone."],
    ["Plumbers", "plumbers", "Emergency calls, repipes and renovation rough-ins."],
    ["Electricians", "electricians", "Panels, service upgrades and the permits done right."],
    ["HVAC", "hvac", "Heating, cooling and the maintenance that prevents August."],
    ["Landscapers", "landscapers", "Design, build and the weekly crew that shows up."],
    ["Pool Companies", "pool-companies", "Installs, openings, closings and the liner you forgot about."],
    ["Painters", "painters", "Interior, exterior and prep work that actually happens."],
    ["Remodelers", "remodelers", "Whole-home renovation and additions."],
    ["Kitchen Contractors", "kitchen-contractors", "Cabinetry, counters and the timeline you were promised."],
    ["Bathroom Contractors", "bathroom-contractors", "Gut renovations and the tile work behind them."],
    ["Cleaning Services", "cleaning-services", "Recurring, deep and move-out."],
    ["Pest Control", "pest-control", "Termites, ticks and the seasonal invasions."],
    ["Movers", "movers", "Local, long-distance and the stairs nobody mentioned."],
    ["Real Estate Agents", "real-estate-agents", "Agents who know the school district lines by heart."],
    ["Mortgage Brokers", "mortgage-brokers", "Rate shopping and the paperwork behind a close."],
    ["Home Inspectors", "home-inspectors", "The report that changes a negotiation."],
    ["Public Adjusters", "public-adjusters", "Representing the policyholder on a property claim."],
    ["Insurance Agencies", "insurance-agencies", "Coastal coverage, flood and the annual review."],
  ]),
  ...children("family", [
    ["Schools", "schools", "Public, private and parochial options across the island."],
    ["School Districts", "school-districts", "How the districts compare, in plain language."],
    ["Daycare", "daycare", "Infant through pre-K, and the waitlists to plan around."],
    ["Summer Camps", "summer-camps", "Day, sleepaway and specialty programs."],
    ["Birthday Parties", "birthday-parties", "Venues that handle the mess for you."],
    ["Tutors", "tutors", "Subject help, test prep and the standing weekly slot."],
    ["Sports Programs", "sports-programs", "Travel, rec and the leagues in between."],
    ["Pediatric Dentists", "pediatric-dentists", "Offices built for small patients."],
    ["Family Restaurants", "family-restaurants", "Rooms that welcome a stroller and a loud six-year-old."],
  ]),
  ...children("health-beauty", [
    ["Dentists", "dentists", "General and cosmetic practices taking new patients."],
    ["Doctors", "doctors", "Primary care and specialists across both counties."],
    ["Dermatologists", "dermatologists", "Medical and cosmetic dermatology."],
    ["Med Spas", "med-spas", "Injectables, lasers and physician-led programs."],
    ["Salons", "salons", "Color, cut and the chair worth booking out."],
    ["Barbers", "barbers", "Old-school shops and modern grooming rooms."],
    ["Gyms", "gyms", "Full-floor clubs and 24-hour access."],
    ["Fitness Studios", "fitness-studios", "Pilates, spin, lifting and small-group training."],
    ["Massage", "massage", "Therapeutic, sports and recovery work."],
    ["Spas", "spas", "Day spas and the full afternoon version."],
    ["Wellness", "wellness", "Recovery, nutrition and preventative care."],
  ]),
  ...children("shopping", [
    ["Boutiques", "boutiques", "Main-street clothing and the buyers with taste."],
    ["Furniture", "furniture", "Showrooms, custom work and local makers."],
    ["Jewelry", "jewelry", "Fine, estate and the local bench that does repairs."],
    ["Specialty Foods", "specialty-foods", "Cheese, olive oil, imports and the good pantry stuff."],
    ["Local Markets", "local-markets", "Farm stands, fish markets and butcher counters."],
    ["Gift Shops", "gift-shops", "The village shops that solve December."],
    ["Shopping Centers", "shopping-centers", "Where the anchors and the parking are."],
  ]),
];

export const SEED_CATEGORIES: Category[] = [
  ...TOP_LEVEL_CATEGORIES,
  ...CHILD_CATEGORIES,
];

/* -------------------------------------------------------------------------- */
/* Places                                                                      */
/* -------------------------------------------------------------------------- */

function place(
  name: string,
  slug: string,
  type: PlaceType,
  parentSlug: string | null,
  county: string | null,
  description: string,
): Place {
  return {
    id: `place_${slug}`,
    name,
    slug,
    type,
    parent_id: parentSlug ? `place_${parentSlug}` : null,
    county,
    description,
    hero_image_url: null,
    status: "published",
    created_at: NOW,
    updated_at: NOW,
  };
}

/** Towns written compactly: [name, slug, county, blurb]. */
type TownTuple = [name: string, slug: string, county: "Nassau" | "Suffolk", description: string];

const TOWNS: TownTuple[] = [
  ["Huntington", "huntington", "Suffolk", "A walkable village downtown with the densest restaurant and music scene on the North Shore."],
  ["Garden City", "garden-city", "Nassau", "Tree-lined streets, Seventh Street shopping and some of Nassau's most sought-after blocks."],
  ["Rockville Centre", "rockville-centre", "Nassau", "A South Shore village with a downtown that fills up every night of the week."],
  ["Patchogue", "patchogue", "Suffolk", "Main Street theaters, breweries and the ferry to Fire Island."],
  ["Port Jefferson", "port-jefferson", "Suffolk", "A harbor village of ferries, ice cream and hill-climbing side streets."],
  ["Smithtown", "smithtown", "Suffolk", "Central Suffolk crossroads with the Bull and a long main drag."],
  ["Stony Brook", "stony-brook", "Suffolk", "University town with a historic village green and a working grist mill."],
  ["Babylon", "babylon", "Suffolk", "A South Shore village oriented toward the water and the Fire Island ferries."],
  ["Bay Shore", "bay-shore", "Suffolk", "Main Street revival, waterfront dining and the Ocean Beach boats."],
  ["Sayville", "sayville", "Suffolk", "Small-village Main Street with the Sailors Haven and Cherry Grove ferries."],
  ["Massapequa", "massapequa", "Nassau", "South Shore suburb with canals, parks and a serious pizza density."],
  ["Farmingdale", "farmingdale", "Nassau", "A revived Main Street with one of the island's best restaurant rows."],
  ["Mineola", "mineola", "Nassau", "County-seat energy, the hospital corridor and a fast LIRR ride."],
  ["Great Neck", "great-neck", "Nassau", "Peninsula villages, waterfront parks and a deep dining bench."],
  ["Manhasset", "manhasset", "Nassau", "The Miracle Mile and the North Shore's flagship shopping stretch."],
  ["Roslyn", "roslyn", "Nassau", "A clock-tower village pond, historic homes and a dense restaurant cluster."],
  ["Oyster Bay", "oyster-bay", "Nassau", "Harborfront hamlet with Sagamore Hill and a working waterfront."],
  ["Long Beach", "long-beach", "Nassau", "A barrier-island city with a boardwalk, a surf scene and year-round locals."],
  ["Freeport", "freeport", "Nassau", "The Nautical Mile, party boats and seafood on the water."],
  ["Hicksville", "hicksville", "Nassau", "Central Nassau hub with a major LIRR junction and a global food scene."],
  ["Commack", "commack", "Suffolk", "Suburban crossroads with the shopping and youth sports gravity of central Suffolk."],
  ["Hauppauge", "hauppauge", "Suffolk", "The island's largest industrial park and the lunch spots that feed it."],
  ["Ronkonkoma", "ronkonkoma", "Suffolk", "Lake, LIRR terminus and the airport-adjacent corridor."],
  ["Riverhead", "riverhead", "Suffolk", "The gateway to both forks, with a downtown on the Peconic."],
  ["Greenport", "greenport", "Suffolk", "North Fork harbor village — carousel, oysters and the Shelter Island ferry."],
  ["Mattituck", "mattituck", "Suffolk", "North Fork farmland, a creek inlet and the strawberry festival."],
  ["Southampton", "southampton", "Suffolk", "Village shopping, ocean beaches and a long summer season."],
  ["East Hampton", "east-hampton", "Suffolk", "Main Street, ocean beaches and the East End's most photographed village."],
  ["Montauk", "montauk", "Suffolk", "The end of the island — lighthouse, surf, and a fishing fleet that still works."],
  ["Westhampton Beach", "westhampton-beach", "Suffolk", "A walkable Main Street with a performing arts center and dune beaches."],
];

export const SEED_PLACES: Place[] = [
  place(
    "Long Island",
    "long-island",
    "island",
    null,
    null,
    "Nassau and Suffolk counties — 118 miles of shoreline, farmland, villages and everything in between.",
  ),
  place(
    "Nassau County",
    "nassau-county",
    "county",
    "long-island",
    "Nassau",
    "The island's western county: dense villages, deep restaurant rows and a short ride to the city.",
  ),
  place(
    "Suffolk County",
    "suffolk-county",
    "county",
    "long-island",
    "Suffolk",
    "The island's eastern county: farmland, forks, pine barrens and the majority of the coastline.",
  ),
  place(
    "North Shore",
    "north-shore",
    "region",
    "long-island",
    null,
    "The Sound side — harbors, bluffs, Gold Coast estates and the villages built around them.",
  ),
  place(
    "South Shore",
    "south-shore",
    "region",
    "long-island",
    null,
    "Barrier beaches, bays and the boardwalk towns facing the Atlantic.",
  ),
  place(
    "North Fork",
    "north-fork",
    "region",
    "suffolk-county",
    "Suffolk",
    "Farmland, vineyards and harbor villages running east to Orient Point.",
  ),
  place(
    "The Hamptons",
    "hamptons",
    "region",
    "suffolk-county",
    "Suffolk",
    "The South Fork's ocean villages, from Westhampton out to Amagansett.",
  ),
  place(
    "East End",
    "east-end",
    "region",
    "suffolk-county",
    "Suffolk",
    "Both forks and everything past the Riverhead split.",
  ),
  place(
    "Fire Island",
    "fire-island",
    "region",
    "suffolk-county",
    "Suffolk",
    "A car-free barrier island of boardwalk communities, reachable by ferry.",
  ),
  ...TOWNS.map(([name, slug, county, description]) =>
    place(
      name,
      slug,
      "town",
      county === "Nassau" ? "nassau-county" : "suffolk-county",
      `${county} County`,
      description,
    ),
  ),
];

export const SEED_TOWN_SLUGS = TOWNS.map(([, slug]) => slug);
