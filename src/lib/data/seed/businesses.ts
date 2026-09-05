import type { Business } from "@/types/database";

/**
 * Development seed businesses — ALL FICTIONAL.
 *
 * Every name, address and phone number here is invented. Phone numbers use the
 * 555-01xx range reserved for fiction, and no website is set, so nothing in
 * this file points at a real company.
 *
 * This is deliberate: the brief forbids fabricating ratings or editorial claims
 * about real businesses. Real businesses enter the system through the admin
 * research flow (/admin/generate), where an editor sources them and writes the
 * copy. Seed rows are marked with `SEED_BUSINESS_IDS` so the UI can badge them.
 */

const NOW = "2026-01-15T12:00:00.000Z";

type BizTuple = [
  name: string,
  slug: string,
  city: string,
  county: "Nassau" | "Suffolk",
  categorySlug: string,
  address: string,
  description: string,
  editorial: string,
];

function biz(
  [name, slug, city, county, categorySlug, address, description, editorial]: BizTuple,
  index: number,
): Business {
  return {
    id: `biz_${slug}`,
    name,
    slug,
    address,
    city,
    county: `${county} County`,
    zip: null,
    latitude: null,
    longitude: null,
    // 555-01xx is reserved for fictional use.
    phone: `(${county === "Nassau" ? "516" : "631"}) 555-01${String(10 + (index % 89)).padStart(2, "0")}`,
    website: null,
    category_id: `cat_${categorySlug}`,
    subcategory: null,
    description,
    editorial_summary: editorial,
    status: "published",
    featured: index % 9 === 0,
    claimed: false,
    primary_image_url: null,
    created_at: NOW,
    updated_at: NOW,
  };
}

const ROWS: BizTuple[] = [
  /* ----------------------------- Pizza ---------------------------------- */
  ["Vitale & Sons Coal Oven", "vitale-and-sons-coal-oven", "Huntington", "Suffolk", "pizza", "218 Wall Street", "A coal-fired room turning out blistered, thin-crust pies since the counter seated eight.", "The char is the whole argument here: a 90-second bake that leaves the cornicione crackling and the center just structural enough to fold."],
  ["Cardinal Street Pizzeria", "cardinal-street-pizzeria", "Rockville Centre", "Nassau", "pizza", "42 Cardinal Street", "A corner slice shop with a line out the door at 11pm on a Friday.", "The plain slice is the tell — restrained sauce, dry-milk-free mozzarella, and a reheat that does not turn it to cardboard."],
  ["The Blue Awning Pizza Co.", "blue-awning-pizza-co", "Patchogue", "Suffolk", "pizza", "77 East Main Street", "Neapolitan-leaning pies from a wood oven near the theater district.", "Best pre-show slice in the village, and the only kitchen on this block that will still fire an order at 10:45."],
  ["Nonna Perrino's", "nonna-perrinos", "Massapequa", "Nassau", "pizza", "310 Broadway", "A family room where the grandma pie outsells everything else two to one.", "Square, thin, garlicky and finished with basil after the bake — the version other shops are copying."],
  ["Harbor Slice", "harbor-slice", "Port Jefferson", "Suffolk", "pizza", "19 East Broadway", "A walk-up window steps from the ferry line.", "Built for a walk down the hill: sturdy enough to eat standing up, which is the only way anyone eats it."],
  ["Torre's Brick Oven", "torres-brick-oven", "Garden City", "Nassau", "pizza", "155 Seventh Street", "A sit-down room with a brick oven and a short, disciplined menu.", "The vodka pie is the outlier that works — cream cut hard with tomato so it never goes cloying."],
  ["Sixth Avenue Sicilian", "sixth-avenue-sicilian", "Freeport", "Nassau", "pizza", "6 Sixth Avenue", "A neighborhood counter known almost entirely for its square pie.", "A proper Sicilian: 24-hour cold ferment, an airy crumb, and a bottom crisped in oil rather than fried in it."],
  ["Marconi's Corner Slice", "marconis-corner-slice", "Farmingdale", "Nassau", "pizza", "88 Main Street", "An old-school slice joint on the Main Street strip.", "Nothing reinvented, everything executed — the control case for what a Long Island slice is supposed to taste like."],
  ["Bayview Pie House", "bayview-pie-house", "Bay Shore", "Suffolk", "pizza", "41 West Main Street", "A wood-fired shop with a patio and a rotating seasonal pie.", "The seasonal board is worth trusting; the corn-and-chili pie in August is the one regulars plan around."],
  ["Old Post Pizzeria", "old-post-pizzeria", "Smithtown", "Suffolk", "pizza", "620 Old Post Road", "A long-running counter with a deep regular base and a devoted lunch rush.", "Grandma and Sicilian both come out of the same deck oven, and both are better than the round."],
  ["Falzone's Grandma Pie", "falzones-grandma-pie", "Hicksville", "Nassau", "pizza", "204 Broadway Avenue", "A takeout-first shop built around one very good square pie.", "One thing, done relentlessly — the reason a shop with four tables has a 20-minute wait at six."],
  ["Lantern & Ash", "lantern-and-ash", "Riverhead", "Suffolk", "pizza", "130 East Main Street", "A wood-fired kitchen sourcing produce from farms within ten miles.", "The most seasonal pizza program on the island, and the only one where the toppings change because the fields did."],
  ["Salvi's of Commack", "salvis-of-commack", "Commack", "Suffolk", "pizza", "515 Jericho Turnpike", "A strip-mall standby with a fiercely loyal youth-sports clientele.", "Feeds a team of twelve in under fifteen minutes without the quality falling off — an underrated skill."],
  ["The Sound Slice", "the-sound-slice", "Great Neck", "Nassau", "pizza", "12 Middle Neck Road", "A modern counter with a short menu and a long fermentation.", "A 72-hour dough that reads more bakery than pizzeria, with a crust that stays crisp to the last bite."],

  /* ----------------------------- Bagels --------------------------------- */
  ["Bay Street Bagel Works", "bay-street-bagel-works", "Sayville", "Suffolk", "bagels", "35 Bay Street", "Hand-rolled, kettle-boiled bagels from a shop that opens at five.", "You can see the boil from the register, which is the entire point — and the reason the crust actually shatters."],
  ["Kettle & Board Bagels", "kettle-and-board-bagels", "Huntington", "Suffolk", "bagels", "260 New York Avenue", "A village bagel counter with a serious cream cheese program.", "Eleven house spreads, none of them gimmicks, and a scallion that tastes like scallions rather than green flecks."],
  ["Sunrise Bagel Co.", "sunrise-bagel-co", "Massapequa", "Nassau", "bagels", "990 Sunrise Highway", "A high-volume South Shore shop that still hand-rolls.", "Volume usually kills a bagel; here the line moves fast and the everything bagel is still crackling at eight."],
  ["The Boiled Dozen", "the-boiled-dozen", "Garden City", "Nassau", "bagels", "61 Franklin Avenue", "A small-batch shop that sells out most weekend mornings.", "Deliberately underbakes nothing — a dense, chewy interior that holds up to a full sandwich build."],
  ["North Fork Bagel House", "north-fork-bagel-house", "Mattituck", "Suffolk", "bagels", "1140 Main Road", "A farm-country bagel shop with local egg and produce sandwiches.", "The farm-egg sandwich is the reason to detour off Route 25, and the bagel underneath earns its keep."],
  ["Corner Kettle Bagels", "corner-kettle-bagels", "Mineola", "Nassau", "bagels", "180 Jericho Turnpike", "A commuter-oriented counter near the station.", "Built for the 7:12 — a bagel that survives twenty minutes in a bag without steaming itself soft."],
  ["Anchor Bagels", "anchor-bagels", "Long Beach", "Nassau", "bagels", "88 West Park Avenue", "A boardwalk-adjacent shop that runs on beach traffic all summer.", "The salt bagel here is the correct order, and the only one on the island finished with a coarse flake."],
  ["Village Bake & Boil", "village-bake-and-boil", "Roslyn", "Nassau", "bagels", "1370 Old Northern Boulevard", "A bakery-bagel hybrid with a strong pastry case.", "Rare crossover competence: the babka is as good as the bagels, which is not usually how this goes."],
  ["Harborline Bagels", "harborline-bagels", "Port Jefferson", "Suffolk", "bagels", "44 Main Street", "A harbor-village shop with a whitefish counter.", "An appetizing counter in bagel-shop clothing — the sable and the whitefish salad are the draw."],
  ["Twin Forks Bagel", "twin-forks-bagel", "Riverhead", "Suffolk", "bagels", "410 East Main Street", "The last real bagel stop before the forks split.", "Positioned perfectly and priced honestly, with a pumpernickel that most shops have quietly stopped making."],

  /* -------------------------- Date night -------------------------------- */
  ["Wren & Hollow", "wren-and-hollow", "Roslyn", "Nassau", "date-night", "1425 Old Northern Boulevard", "A candlelit room with a seasonal American menu and a low-volume dining room.", "Tables are spaced for actual conversation, which sounds minor until you have tried to have one anywhere else on this strip."],
  ["The Salt Room", "the-salt-room", "Greenport", "Suffolk", "date-night", "210 Front Street", "A harbor-front kitchen built around North Fork produce and local shellfish.", "Order whatever came out of the bay that morning; the kitchen's restraint with it is the whole appeal."],
  ["Meridian Supper Club", "meridian-supper-club", "Garden City", "Nassau", "date-night", "900 Franklin Avenue", "A supper club with live piano and a proper cocktail program.", "The rare room that gets the volume right — music you can hear, at a level you can talk over."],
  ["Candlewick", "candlewick", "Westhampton Beach", "Suffolk", "date-night", "120 Main Street", "A small seasonal dining room with a nightly changing menu.", "Twenty-six seats and one seating a night, so the kitchen cooks like it means it."],
  ["Pier & Pine", "pier-and-pine", "Bay Shore", "Suffolk", "date-night", "18 Maple Avenue", "Waterfront dining with sunset views over the Great South Bay.", "Book the 7:30 in summer and the sunset does most of the work — the kitchen holds up its end regardless."],
  ["Ilaria", "ilaria", "Huntington", "Suffolk", "date-night", "310 Main Street", "A northern Italian room with handmade pasta and a deep regional wine list.", "The pasta is rolled in-house daily and it shows in the bite; the list leans toward growers you cannot find elsewhere out here."],
  ["The Gilded Fork", "the-gilded-fork", "Southampton", "Suffolk", "fine-dining", "56 Jobs Lane", "A tasting-menu room with a seasonal East End focus.", "The most ambitious cooking in the village, and the service knows when to disappear."],
  ["Blackwood Chophouse", "blackwood-chophouse", "Hauppauge", "Suffolk", "steakhouses", "1800 Motor Parkway", "A dry-aging program and a dark-wood dining room off the parkway.", "Forty-five day dry-age handled properly, with a crust that justifies the whole enterprise."],
  ["Lantern House", "lantern-house", "Port Jefferson", "Suffolk", "date-night", "108 Main Street", "A historic building turned intimate dining room up the hill from the harbor.", "Low ceilings, real fireplaces and a winter menu that suits both — the best cold-weather table in the village."],
  ["Cormorant", "cormorant", "Montauk", "Suffolk", "seafood", "40 South Edgemere Street", "An off-season-friendly seafood room that stays open when the crowds leave.", "Open in February, which locals will tell you is the real test out here."],

  /* ------------------------- Kids activities ---------------------------- */
  ["Tidepool Discovery Center", "tidepool-discovery-center", "Riverhead", "Suffolk", "kids-activities", "220 West Main Street", "A hands-on marine science center with touch tanks and daily feedings.", "The touch tanks are staffed by people who answer the follow-up questions, which is what separates this from an aquarium hallway."],
  ["The Climbing Barn", "the-climbing-barn", "Farmingdale", "Nassau", "kids-activities", "75 Milbar Boulevard", "Indoor bouldering and rope walls with kid-specific programming.", "Auto-belays mean a parent can supervise two kids at once without a harness of their own."],
  ["Pinecone Play Museum", "pinecone-play-museum", "Stony Brook", "Suffolk", "kids-activities", "90 Christian Avenue", "A children's museum of build-it exhibits for the under-eight set.", "Designed for the age where everything gets touched, so nothing in it minds being touched."],
  ["Harbor Carousel Commons", "harbor-carousel-commons", "Greenport", "Suffolk", "kids-activities", "5 Front Street", "A waterfront green with a carousel, playground and open lawn.", "The cheapest good afternoon on the North Fork, and the brass ring still counts for something."],
  ["Sandbar Splash Park", "sandbar-splash-park", "Long Beach", "Nassau", "kids-activities", "300 Shore Road", "A seasonal water play area a block off the boardwalk.", "Zero-depth entry and full shade sails — the two things that decide whether a toddler afternoon works."],
  ["The Great Room Trampoline Park", "the-great-room-trampoline-park", "Commack", "Suffolk", "kids-activities", "6100 Jericho Turnpike", "A trampoline and obstacle facility with a separate toddler zone.", "The toddler zone is genuinely walled off from the teenagers, which is the entire difference in a place like this."],
  ["Little Anchors Play Cafe", "little-anchors-play-cafe", "Babylon", "Suffolk", "kids-activities", "22 Deer Park Avenue", "An indoor play space with real coffee for the adults.", "Solves the rainy Tuesday problem: they play, you get an espresso that is not from a pod."],
  ["Wickham Meadow Farm", "wickham-meadow-farm", "Mattituck", "Suffolk", "farms", "3800 Sound Avenue", "A working farm with u-pick fields, a corn maze and a fall weekend program.", "Still a farm first and an attraction second, which is increasingly rare on Sound Avenue in October."],
  ["Starlight Lanes", "starlight-lanes", "Hicksville", "Nassau", "bowling", "410 South Broadway", "A bowling alley with bumper leagues and a full arcade.", "Bumpers that actually stay up, and a snack bar that has not raised the price of a hot dog in years."],
  ["The Maker Loft", "the-maker-loft", "Patchogue", "Suffolk", "kids-activities", "50 North Ocean Avenue", "Drop-in craft and build sessions for school-age kids.", "Drop-in rather than semester-long, so a Saturday plan does not require a September commitment."],

  /* --------------------- Huntington restaurants ------------------------- */
  ["Osprey & Oak", "osprey-and-oak", "Huntington", "Suffolk", "restaurants", "45 Gerard Street", "A seasonal American kitchen with an open pass and a bar menu until midnight.", "The late bar menu is the village's best-kept secret — a full kitchen running when everything else has closed."],
  ["The Copper Kettle", "the-copper-kettle", "Huntington", "Suffolk", "brunch", "12 Green Street", "A brunch-forward room with a pastry case and a long weekend wait.", "Get there before ten or plan on an hour; the laminated pastry is worth exactly one of those two things."],
  ["Saffron & Stone", "saffron-and-stone", "Huntington", "Suffolk", "restaurants", "285 Main Street", "A tandoor-driven kitchen with regional Indian plates and a strong vegetarian section.", "The vegetarian half of the menu is not an afterthought, which in this village makes it the most interesting cooking on the street."],
  ["Bright Star Diner", "bright-star-diner", "Huntington", "Suffolk", "diners", "500 West Jericho Turnpike", "A 24-hour diner with a menu the length of a paperback.", "Open at 3am and competent at 3am — two different accomplishments, both earned here."],
  ["Quarry Lane Tavern", "quarry-lane-tavern", "Huntington", "Suffolk", "bars", "8 Quarry Lane", "A neighborhood tavern with a deep draft list and a working fireplace.", "Twenty-four taps that rotate for real, and a bartender who will tell you when you would rather have something else."],
  ["Mizu Counter", "mizu-counter", "Huntington", "Suffolk", "sushi", "331 New York Avenue", "A ten-seat omakase counter with a single nightly menu.", "Ten seats, one chef, no menu — the closest thing to a city counter without the bridge."],
  ["Fen & Fig", "fen-and-fig", "Huntington", "Suffolk", "coffee", "104 Wall Street", "A café and bakery with single-origin pourovers and a small lunch menu.", "Roasts in-house on Tuesdays, and will hand you the cupping notes if you ask."],
];

export const SEED_BUSINESSES: Business[] = ROWS.map(biz);

/** Ids of rows that came from this file, so the UI can badge them in dev. */
export const SEED_BUSINESS_IDS = new Set(SEED_BUSINESSES.map((b) => b.id));
