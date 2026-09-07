import type { Ranking, RankingEntry } from "@/types/database";

/**
 * Development seed rankings.
 *
 * Entries reference the fictional businesses in ./businesses.ts by slug. The
 * editorial copy models the voice and structure a real ranking should use:
 * a specific reason, a "best for" line, and at most one badge.
 */

const NOW = "2026-01-15T12:00:00.000Z";

type RankingSeed = {
  slug: string;
  title: string;
  categorySlug: string;
  placeSlug: string;
  geography: string;
  description: string;
  intro: string;
  methodology: string;
  publishedAt: string;
  author: string;
  /** [businessSlug, reason, bestFor, badge] in ranked order. */
  entries: [
    businessSlug: string,
    reason: string,
    bestFor: string,
    badge: string | null,
  ][];
};

const SEEDS: RankingSeed[] = [
  {
    slug: "pizza-long-island",
    title: "The 10 Best Pizza Places on Long Island",
    categorySlug: "pizza",
    placeSlug: "long-island",
    geography: "Long Island",
    description:
      "Coal-fired, Sicilian, grandma and the corner slice — the ten pizzerias we send people to first.",
    intro:
      "Long Island argues about pizza the way other places argue about politics, and the argument is usually about the wrong thing. A great pie is not about the toppings or the name over the door. It is about dough that was given time, sauce that tastes like tomatoes, and an oven hot enough to finish the job. These ten do those three things better than anyone else out here, and they span both counties, four ovens and about sixty years of collective practice.",
    methodology:
      "We ate at more than forty pizzerias across Nassau and Suffolk, ordering a plain slice at every one so there was a common baseline. We weighted crust structure, sauce and cheese quality, consistency across visits, and how well a pie held up to a fifteen-minute drive home. We also considered longevity and local standing, but no shop was included on reputation alone.",
    publishedAt: "2026-01-08T14:00:00.000Z",
    author: "The LongIsland.io Editorial Team",
    entries: [
      ["vitale-and-sons-coal-oven", "The coal oven runs hot enough to blister the rim in ninety seconds, which produces the one thing almost no other shop on the island manages: a crust that is simultaneously charred, chewy and structurally sound. Three visits, three identical pies.", "A pie worth planning an evening around", "Best Overall"],
      ["nonna-perrinos", "The grandma pie is the benchmark other shops are quietly imitating — thin, square, aggressively garlicky, with basil dropped after the bake so it stays green instead of turning to ash.", "Grandma pie converts", "Local Favorite"],
      ["cardinal-street-pizzeria", "The plain slice is the entire case. Restrained sauce, real mozzarella, and a reheat that comes back crisp rather than leathery, which is the hardest trick in a high-volume slice shop.", "A late-night slice on the way home", null],
      ["lantern-and-ash", "The only pizza program on the island where the menu changes because the fields did. Produce comes from farms inside ten miles and the kitchen treats it accordingly.", "Seasonal cooking on a pizza", "Hidden Gem"],
      ["sixth-avenue-sicilian", "A textbook Sicilian: twenty-four-hour cold ferment, an open airy crumb, and a bottom crisped in oil instead of drowned in it. Most shops have stopped making one this carefully.", "The square-pie purist", null],
      ["the-sound-slice", "A seventy-two-hour dough that reads closer to a bakery than a pizzeria. It stays crisp to the last bite, which is not something most modern-style pies can claim.", "Long-fermentation dough nerds", null],
      ["blue-awning-pizza-co", "The best pre-theater option in Patchogue, and the only kitchen on the block that will still fire a fresh pie at 10:45 on a Saturday.", "Dinner before a show", null],
      ["torres-brick-oven", "The vodka pie is the outlier that actually works, with enough tomato acid cutting the cream that it never goes cloying halfway through a slice.", "Sitting down with a bottle of wine", null],
      ["harbor-slice", "Engineered for a walk down the hill to the ferry — sturdy enough to eat standing up, which is the only way anyone actually eats it.", "Eating on your feet by the harbor", null],
      ["falzones-grandma-pie", "One product, made relentlessly, which is why a shop with four tables has a twenty-minute wait at six on a Tuesday.", "Takeout for the whole house", "Best Value"],
    ],
  },
  {
    slug: "bagels-long-island",
    title: "The 10 Best Bagel Shops on Long Island",
    categorySlug: "bagels",
    placeSlug: "long-island",
    geography: "Long Island",
    description:
      "Hand-rolled, kettle-boiled and gone by ten — where to go before the good ones sell out.",
    intro:
      "The test for a bagel shop is simple and unforgiving: is it boiled, is it hand-rolled, and is it still good at nine in the morning rather than only at six. Plenty of shops out here steam their dough and call it a day. These ten do not. We ordered a plain and an everything at each, ate one on the spot and one twenty minutes later in a car, which is how most people actually eat them.",
    methodology:
      "We visited more than thirty shops across both counties, always on a weekend morning at peak volume. We assessed crust, chew, interior density, and whether quality held up under a rush. Shops that par-bake or steam rather than boil were excluded regardless of popularity. Spreads and appetizing counters were considered as a tiebreaker, not a primary factor.",
    publishedAt: "2026-01-05T14:00:00.000Z",
    author: "The LongIsland.io Editorial Team",
    entries: [
      ["bay-street-bagel-works", "You can watch the kettle from the register, and it shows in the result: a crust that genuinely shatters against a dense, properly chewy interior. The five a.m. open is not a gimmick.", "The purist who wants to see the boil", "Best Overall"],
      ["the-boiled-dozen", "Nothing here is underbaked. The interior is dense enough to hold a full sandwich build without compressing into paste, which is the failure mode of most modern bagels.", "Building a real sandwich", null],
      ["kettle-and-board-bagels", "Eleven house-made spreads and not one of them a gimmick. The scallion cream cheese tastes like scallions rather than looking like it.", "Anyone who orders by the spread", "Local Favorite"],
      ["sunrise-bagel-co", "High volume usually kills a bagel. Here the line moves fast and the everything is still crackling at eight on a Sunday, which is a genuine operational achievement.", "Feeding a crowd on a weekend morning", null],
      ["north-fork-bagel-house", "The farm-egg sandwich is worth the detour off Route 25, and unusually the bagel underneath is good enough to carry it.", "A stop on the way east", "Hidden Gem"],
      ["harborline-bagels", "An appetizing counter wearing bagel-shop clothes. The sable and the whitefish salad are the reason to come, and both are handled with real care.", "Sunday appetizing", null],
      ["anchor-bagels", "The salt bagel is the correct order and the only one on the island finished with a coarse flake rather than fine grains that dissolve on the drive home.", "A beach morning", null],
      ["village-bake-and-boil", "Rare crossover competence — the babka is as good as the bagels, which is almost never how this goes.", "Bringing something to someone's house", null],
      ["corner-kettle-bagels", "Built for the commute. A bagel that survives twenty minutes in a paper bag without steaming itself soft is a specific piece of engineering.", "The train platform", null],
      ["twin-forks-bagel", "Positioned perfectly for the last stop before the forks split, priced honestly, and still making a pumpernickel that most shops quietly dropped years ago.", "Loading up before a weekend east", "Best Value"],
    ],
  },
  {
    slug: "date-night-restaurants-long-island",
    title: "The 10 Best Date-Night Restaurants on Long Island",
    categorySlug: "date-night",
    placeSlug: "long-island",
    geography: "Long Island",
    description:
      "Rooms built for an actual evening out — where the food, the volume and the pacing all cooperate.",
    intro:
      "A date-night restaurant has a harder job than a good restaurant. The food has to be excellent, but the room also has to let you hear each other, the service has to know when to disappear, and the pacing has to leave room for a second glass. Plenty of very good Long Island kitchens fail on the last three. These ten do not, and they range from a twenty-six-seat dining room out east to a supper club with a piano in Nassau.",
    methodology:
      "We dined at each restaurant on a weekend evening at peak hours, which is when a room's acoustics and pacing actually reveal themselves. We weighted kitchen quality first, then noise level, table spacing, service judgment and the strength of the wine and cocktail lists. Rooms that were excellent but too loud to hold a conversation in were left off deliberately.",
    publishedAt: "2026-01-12T14:00:00.000Z",
    author: "The LongIsland.io Editorial Team",
    entries: [
      ["wren-and-hollow", "Tables are spaced for an actual conversation, which sounds like a small thing until you have tried to have one anywhere else on this strip. The seasonal menu is disciplined and the room is genuinely quiet.", "A conversation you want to finish", "Best Date Night"],
      ["candlewick", "Twenty-six seats and a single seating a night, so the kitchen cooks like it means it and nobody is rushing you toward a turn.", "A long, unhurried evening", "Best Overall"],
      ["the-salt-room", "Order whatever came out of the bay that morning. The kitchen's restraint with very good shellfish is the entire appeal, and the harbor view does not hurt.", "Shellfish and a sunset", null],
      ["ilaria", "Pasta rolled in-house every day, and you can taste it in the bite. The regional wine list leans toward growers you will not find anywhere else out here.", "A serious wine list", "Local Favorite"],
      ["meridian-supper-club", "The rare room that gets volume right — live piano you can actually hear, at a level you can still talk over. The cocktail program is the real thing.", "Dinner that turns into a night out", null],
      ["the-gilded-fork", "The most ambitious cooking in the village, with service that knows precisely when to step back. Worth the price of a tasting menu on a real occasion.", "An anniversary", null],
      ["pier-and-pine", "Book the 7:30 in summer and the sunset over the bay does half the work. The kitchen holds up its end regardless of the view.", "A summer evening on the water", null],
      ["lantern-house", "Low ceilings, working fireplaces and a winter menu built for both. The best cold-weather table in the village by a distance.", "A January night", "Hidden Gem"],
      ["blackwood-chophouse", "Forty-five-day dry-age handled properly, with a crust that justifies the whole enterprise. A steakhouse that earns the room it is in.", "A steak and a bottle of red", null],
      ["cormorant", "Open in February, which anyone who lives out here will tell you is the real test. Off-season it becomes a locals' dining room.", "The off-season", "Best Value"],
    ],
  },
  {
    slug: "things-to-do-with-kids-long-island",
    title: "The 10 Best Things to Do With Kids on Long Island",
    categorySlug: "kids-activities",
    placeSlug: "long-island",
    geography: "Long Island",
    description:
      "Places that survive a rainy Saturday, a toddler and a twelve-year-old — sometimes all at once.",
    intro:
      "The bar for a good kids' activity is not whether children enjoy it. Children enjoy almost anything. The bar is whether the adult who brought them can also stand it, whether it works when it rains, and whether it is priced so it can happen more than once a year. We visited these with kids in tow and judged them on exactly those terms.",
    methodology:
      "We visited each location with children in the target age range, on both a weekday and a weekend where possible. We weighted age-appropriateness, safety and supervision design, weather resilience, staff engagement, and cost for a family of four. Seasonal-only locations were assessed within their season and are flagged as such.",
    publishedAt: "2026-01-10T14:00:00.000Z",
    author: "The LongIsland.io Editorial Team",
    entries: [
      ["tidepool-discovery-center", "The touch tanks are staffed by people who answer the follow-up questions, which is the difference between a science center and a hallway with an aquarium in it.", "Curious six-to-ten-year-olds", "Best Overall"],
      ["pinecone-play-museum", "Built for the age at which everything gets touched, so nothing in it minds being touched. The under-eight focus keeps the older kids from taking over.", "Toddlers and early elementary", "Best for Families"],
      ["the-climbing-barn", "Auto-belays mean one parent can supervise two climbers without getting into a harness, which quietly makes this the most practical option on the list.", "Burning off a lot of energy", null],
      ["the-great-room-trampoline-park", "The toddler zone is genuinely walled off from the teenagers, and that single design decision is the whole difference in a place like this.", "Mixed-age siblings", null],
      ["wickham-meadow-farm", "Still a working farm first and an attraction second, which is increasingly rare on Sound Avenue once October arrives.", "A fall weekend", "Local Favorite"],
      ["little-anchors-play-cafe", "Solves the rainy Tuesday problem completely: they play, you get an espresso that did not come out of a pod.", "A rainy weekday morning", "Hidden Gem"],
      ["harbor-carousel-commons", "The cheapest genuinely good afternoon on the North Fork, and the brass ring still counts for something.", "A cheap afternoon out east", "Best Value"],
      ["starlight-lanes", "Bumpers that actually stay up for a full game, and a snack bar that has not raised the price of a hot dog in years.", "A birthday party that runs itself", null],
      ["sandbar-splash-park", "Zero-depth entry and full shade sails — the two features that decide whether a toddler afternoon works or ends early in tears.", "Summer with a toddler", null],
      ["the-maker-loft", "Drop-in rather than semester-long, so a Saturday plan does not require a commitment made back in September.", "An unplanned Saturday", null],
    ],
  },
  {
    slug: "pizza-nassau-county",
    title: "The Best Pizza in Nassau County",
    categorySlug: "pizza",
    placeSlug: "nassau-county",
    geography: "Nassau County",
    description:
      "The seven Nassau pizzerias worth crossing town for, from grandma pies to a proper Sicilian.",
    intro:
      "Nassau's pizza density is absurd — you are rarely more than a few minutes from a slice, which makes the merely adequate very easy to settle for. These seven are the ones worth driving past three other shops to reach. They skew traditional, because in Nassau the traditional version is usually being done extremely well.",
    methodology:
      "A county-level cut of our island-wide pizza research, re-tasted and re-ranked against Nassau shops only. Same criteria: crust structure, sauce and cheese, consistency across visits, and travel resilience. Ranking positions differ from the island-wide list because the field is different.",
    publishedAt: "2026-01-09T14:00:00.000Z",
    author: "The LongIsland.io Editorial Team",
    entries: [
      ["nonna-perrinos", "The grandma pie that set the local standard — thin, square and finished with basil after the bake rather than before it.", "Grandma pie", "Best Overall"],
      ["cardinal-street-pizzeria", "The plain slice is the whole argument, and it reheats better than anything else in the county.", "A late slice", "Local Favorite"],
      ["sixth-avenue-sicilian", "A twenty-four-hour cold ferment and a bottom crisped in oil rather than swimming in it.", "The square-pie purist", null],
      ["the-sound-slice", "Seventy-two-hour dough with a bakery's sense of structure. Stays crisp to the last bite.", "Modern-style dough", "Hidden Gem"],
      ["torres-brick-oven", "A short, disciplined menu and a vodka pie with enough acid to stay drinkable through a whole slice.", "A sit-down dinner", null],
      ["falzones-grandma-pie", "One square pie, made relentlessly well, at a price that makes feeding a family trivial.", "Takeout for a crowd", "Best Value"],
      ["marconis-corner-slice", "Nothing reinvented, everything executed. The control case for what a Long Island slice is supposed to be.", "A benchmark slice", null],
    ],
  },
  {
    slug: "pizza-suffolk-county",
    title: "The Best Pizza in Suffolk County",
    categorySlug: "pizza",
    placeSlug: "suffolk-county",
    geography: "Suffolk County",
    description:
      "Coal ovens, wood ovens and farm-driven pies — the seven best in Suffolk, west to east.",
    intro:
      "Suffolk's pizza runs stranger and more varied than Nassau's. There is more room out here, which means more wood ovens, more seasonal cooking and more shops willing to do something other than the standard round pie. These seven span from a Huntington coal oven to a Riverhead kitchen buying from farms down the road.",
    methodology:
      "A county-level cut of our island-wide pizza research, re-tasted and re-ranked against Suffolk shops only. Same criteria: crust structure, sauce and cheese, consistency across visits, and travel resilience. Ranking positions differ from the island-wide list because the field is different.",
    publishedAt: "2026-01-09T15:00:00.000Z",
    author: "The LongIsland.io Editorial Team",
    entries: [
      ["vitale-and-sons-coal-oven", "A ninety-second coal bake that produces a rim that is charred, chewy and structurally intact all at once. The best pizza in the county, and arguably the island.", "The definitive Suffolk pie", "Best Overall"],
      ["lantern-and-ash", "The menu changes because the fields did. No other pizza kitchen out here is genuinely seasonal in that way.", "Seasonal cooking", "Hidden Gem"],
      ["blue-awning-pizza-co", "Neapolitan-leaning, wood-fired, and still firing fresh pies at quarter to eleven on a Saturday night.", "Before or after a show", null],
      ["bayview-pie-house", "The seasonal board is worth trusting outright; the August corn-and-chili pie is a genuine event.", "A patio in summer", "Local Favorite"],
      ["old-post-pizzeria", "Grandma and Sicilian out of the same deck oven, both better than the round, which the regulars figured out long ago.", "Square pies", null],
      ["harbor-slice", "A walk-up window built for the ferry line, with a slice engineered to be eaten standing up.", "Eating on your feet", null],
      ["salvis-of-commack", "Feeds a team of twelve in under fifteen minutes without the quality falling off. That is a real and underrated skill.", "Post-game", "Best Value"],
    ],
  },
  {
    slug: "restaurants-huntington",
    title: "The 10 Best Restaurants in Huntington",
    categorySlug: "restaurants",
    placeSlug: "huntington",
    geography: "Huntington",
    description:
      "The densest restaurant village on the North Shore, narrowed to the ten tables that matter.",
    intro:
      "Huntington has more restaurants per walkable block than anywhere else on the North Shore, which is a blessing and a problem — the density makes it genuinely hard to choose. This list is the shortcut. It spans a coal oven, a ten-seat omakase counter, a tandoor kitchen and a 24-hour diner, because a village this good should not be reduced to one kind of dinner.",
    methodology:
      "We ate at more than twenty-five restaurants inside Huntington village over three months, most of them more than once, and always ordering across the menu rather than only the signature dish. We weighted kitchen quality, consistency, value at the price point, and the specific role each restaurant plays in the village. Longevity was considered; it did not by itself earn a spot.",
    publishedAt: "2026-01-14T14:00:00.000Z",
    author: "The LongIsland.io Editorial Team",
    entries: [
      ["ilaria", "Pasta rolled daily in-house and a regional wine list with real depth. The most complete dining room in the village.", "A serious dinner", "Best Overall"],
      ["vitale-and-sons-coal-oven", "The coal oven that anchors the whole village's food reputation, and the best pizza in Suffolk County.", "Pizza worth the wait", "Local Favorite"],
      ["mizu-counter", "Ten seats, one chef, no menu — the closest thing to a Manhattan omakase counter without crossing a bridge.", "An occasion at the counter", null],
      ["saffron-and-stone", "The vegetarian half of the menu is not an afterthought, which makes it the most interesting cooking on Main Street.", "Vegetarians who are tired of being an afterthought", "Hidden Gem"],
      ["osprey-and-oak", "A full kitchen running a real bar menu until midnight, when every other room in the village has closed theirs.", "A late dinner", null],
      ["the-copper-kettle", "Laminated pastry worth the wait, provided you get there before ten. After that you are gambling with an hour of your morning.", "Weekend brunch", null],
      ["quarry-lane-tavern", "Twenty-four taps that genuinely rotate, and a bartender who will tell you when you would rather be drinking something else.", "A pint by the fire", null],
      ["fen-and-fig", "Roasts in-house on Tuesdays and will hand you the cupping notes if you ask. The lunch menu is small and very good.", "Coffee that is the point", null],
      ["kettle-and-board-bagels", "Eleven house spreads, none of them gimmicks, and the best bagel inside village limits.", "A weekend morning", null],
      ["bright-star-diner", "Open at three in the morning and competent at three in the morning. Those are two separate accomplishments.", "After everything else has closed", "Best Value"],
    ],
  },
];

export const SEED_RANKINGS: Ranking[] = SEEDS.map((seed) => ({
  id: `rank_${seed.slug}`,
  title: seed.title,
  slug: seed.slug,
  category_id: `cat_${seed.categorySlug}`,
  place_id: `place_${seed.placeSlug}`,
  geography: seed.geography,
  description: seed.description,
  intro: seed.intro,
  methodology: seed.methodology,
  status: "published",
  hero_media_id: null,
  hero_image_url: null,
  og_image_media_id: null,
  seo_title: null,
  seo_description: null,
  author_name: seed.author,
  published_at: seed.publishedAt,
  created_at: NOW,
  updated_at: seed.publishedAt,
}));

export const SEED_RANKING_ENTRIES: RankingEntry[] = SEEDS.flatMap((seed) =>
  seed.entries.map(([businessSlug, reason, bestFor, badge], index) => ({
    id: `entry_${seed.slug}_${index + 1}`,
    ranking_id: `rank_${seed.slug}`,
    business_id: `biz_${businessSlug}`,
    position: index + 1,
    editorial_reason: reason,
    best_for: bestFor,
    badge,
    editor_notes: null,
    created_at: NOW,
    updated_at: seed.publishedAt,
  })),
);
