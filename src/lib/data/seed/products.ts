import type {
  AffiliateMerchant,
  ContentProductRecommendation,
  Product,
  ProductCategory,
  ProductOffer,
  ProductRanking,
  ProductRankingEntry,
} from "@/types/products";

/**
 * Development seed products, offers and buying guides — ALL FICTIONAL.
 *
 * Every brand and product here is invented, and every URL points at
 * `example.com`, the domain RFC 2606 reserves for documentation. Nothing in this
 * file links to a real retailer or carries a real affiliate tag, for the same
 * reason the seed businesses use 555-01xx phone numbers: fixtures must never be
 * mistaken for claims about a real company, and a fake tag in a repository is a
 * commission attributed to nobody.
 *
 * Real products enter the system through /admin/products, where an editor
 * sources them and pastes affiliate URLs from the network dashboard.
 */

const NOW = "2026-01-15T12:00:00.000Z";

/**
 * Prices are only displayable while fresh (see PRICE_FRESHNESS_DAYS), so seed
 * offers are stamped at module load rather than with a fixed date. A hardcoded
 * timestamp would go stale and the seed site would silently stop demonstrating
 * price display at all.
 */
const CHECKED_NOW = new Date().toISOString();

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

type CategorySeed = [name: string, slug: string, parentSlug: string | null];

const CATEGORY_SEEDS: CategorySeed[] = [
  ["Outdoor & Beach", "outdoor-beach", null],
  ["Food & Cooking", "food-cooking", null],
  ["Seasonal", "seasonal", null],
  ["Beach Blankets", "beach-blankets", "outdoor-beach"],
  ["Beach Wagons", "beach-wagons", "outdoor-beach"],
  ["Coolers", "coolers", "outdoor-beach"],
  ["Beach Umbrellas", "beach-umbrellas", "outdoor-beach"],
  ["Waterproof Speakers", "waterproof-speakers", "outdoor-beach"],
  ["Pizza Ovens", "pizza-ovens", "food-cooking"],
  ["Kitchen Tools", "kitchen-tools", "food-cooking"],
  ["Beach Gear", "beach-gear", "seasonal"],
];

export const SEED_PRODUCT_CATEGORIES: ProductCategory[] = CATEGORY_SEEDS.map(
  ([name, slug, parentSlug]) => ({
    id: `pcat_${slug}`,
    name,
    slug,
    description: null,
    parent_id: parentSlug ? `pcat_${parentSlug}` : null,
    icon: null,
    status: "published",
    created_at: NOW,
    updated_at: NOW,
  }),
);

/* -------------------------------------------------------------------------- */
/* Merchants                                                                   */
/* -------------------------------------------------------------------------- */

export const SEED_MERCHANTS: AffiliateMerchant[] = [
  {
    id: "merch_amazon",
    name: "Amazon",
    slug: "amazon",
    network: "amazon",
    homepage_url: "https://www.amazon.com",
    cta_label: "Check Price",
    disclosure_note:
      "As an Amazon Associate, LongIsland.io earns from qualifying purchases.",
    status: "published",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "merch_walmart",
    name: "Walmart",
    slug: "walmart",
    network: "walmart",
    homepage_url: "https://www.walmart.com",
    cta_label: "Check Price",
    disclosure_note: null,
    status: "published",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "merch_target",
    name: "Target",
    slug: "target",
    network: "target",
    homepage_url: "https://www.target.com",
    cta_label: "Check Price",
    disclosure_note: null,
    status: "published",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "merch_direct",
    name: "Manufacturer Direct",
    slug: "direct",
    network: "direct",
    homepage_url: null,
    cta_label: "View Deal",
    disclosure_note: null,
    status: "published",
    created_at: NOW,
    updated_at: NOW,
  },
];

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

type ProductSeed = [
  name: string,
  slug: string,
  brand: string,
  categorySlug: string,
  shortDescription: string,
  editorialSummary: string,
];

const PRODUCT_SEEDS: ProductSeed[] = [
  [
    "Tidewalk Oversized Sand Blanket",
    "tidewalk-oversized-sand-blanket",
    "Tidewalk",
    "beach-blankets",
    "A 9x10ft ripstop blanket with four sand-fillable corner pockets and a stuff sack.",
    "The corner pockets are the whole argument: filled with sand they hold the sheet flat in the kind of steady onshore wind that makes a normal blanket useless by eleven in the morning.",
  ],
  [
    "Dunecrest Packable Beach Quilt",
    "dunecrest-packable-beach-quilt",
    "Dunecrest",
    "beach-blankets",
    "A quilted 6x7ft blanket that folds to the size of a paperback.",
    "Small, light and genuinely pocketable, which makes it the one that actually gets carried on a long walk in from an overflow lot.",
  ],
  [
    "Saltgrass Heavyweight Canvas Blanket",
    "saltgrass-heavyweight-canvas-blanket",
    "Saltgrass",
    "beach-blankets",
    "A waxed-canvas blanket with a waterproof backing, 7x7ft.",
    "Heavy enough to stay put without stakes and rugged enough to double as a tailgate blanket in October, which is a longer season than most beach gear gets.",
  ],
  [
    "Baywater 52-Quart Rotomolded Cooler",
    "baywater-52qt-rotomolded-cooler",
    "Baywater Supply",
    "coolers",
    "A 52-quart rotomolded cooler rated for multi-day ice retention.",
    "The size that fits a full day for a family of four without becoming a two-person carry, which is where most rotomolded coolers lose the argument.",
  ],
  [
    "Shorepoint Soft-Sided Cooler Tote",
    "shorepoint-soft-sided-cooler-tote",
    "Shorepoint",
    "coolers",
    "A 24-can insulated tote with a welded liner and a shoulder strap.",
    "Light, leakproof and easy to rinse, which matters more than raw ice retention for a four-hour afternoon.",
  ],
  [
    "Ironcrest Wheeled Beach Cooler",
    "ironcrest-wheeled-beach-cooler",
    "Ironcrest",
    "coolers",
    "A 45-quart cooler on oversized balloon wheels built for soft sand.",
    "The balloon wheels are the difference between rolling and dragging once you are past the high-tide line.",
  ],
  [
    "Harborlight Rolling Beach Wagon",
    "harborlight-rolling-beach-wagon",
    "Harborlight",
    "beach-wagons",
    "A folding wagon with balloon tires and a 150lb capacity.",
    "One trip instead of three. On the wide-approach beaches this is the single piece of gear that changes the day.",
  ],
  [
    "Dunecrest Windproof Beach Umbrella",
    "dunecrest-windproof-beach-umbrella",
    "Dunecrest",
    "beach-umbrellas",
    "A 7.5ft vented umbrella with a sand anchor and a tilting pole.",
    "The vent and the screw anchor together are what keep it from becoming someone else's problem three blankets downwind.",
  ],
  [
    "Shorepoint Waterproof Speaker",
    "shorepoint-waterproof-speaker",
    "Shorepoint",
    "waterproof-speakers",
    "An IP67 portable speaker with a 16-hour battery and a floating body.",
    "It floats, it survives being buried in wet sand, and it is quiet enough at full volume to not annoy the family next to you.",
  ],
  [
    "Ironcrest Countertop Pizza Oven",
    "ironcrest-countertop-pizza-oven",
    "Ironcrest",
    "pizza-ovens",
    "A gas-fired outdoor oven reaching 900F with a cordierite stone floor.",
    "Nine hundred degrees is the number that matters: it is the difference between a home pie and something recognisably close to a coal-oven bake.",
  ],
  [
    "Saltgrass Portable Wood-Fired Oven",
    "saltgrass-portable-wood-fired-oven",
    "Saltgrass",
    "pizza-ovens",
    "A 30lb wood-fired oven that packs down for transport.",
    "Genuinely portable, which makes it the one that ends up at a beach cookout rather than only on a patio.",
  ],
  [
    "Baywater Rocking Pizza Cutter",
    "baywater-rocking-pizza-cutter",
    "Baywater Supply",
    "kitchen-tools",
    "A 14in stainless rocking blade with a walnut handle and a blade guard.",
    "A rocker cuts a pie without dragging the toppings across it, which a wheel cutter cannot do on a well-loaded slice.",
  ],
];

export const SEED_PRODUCTS: Product[] = PRODUCT_SEEDS.map(
  ([name, slug, brand, categorySlug, shortDescription, editorialSummary], index) => ({
    id: `prod_${slug}`,
    name,
    slug,
    brand,
    category_id: `pcat_${categorySlug}`,
    short_description: shortDescription,
    editorial_summary: editorialSummary,
    image_url: null,
    status: "published",
    featured: index < 3,
    created_at: NOW,
    updated_at: NOW,
  }),
);

/* -------------------------------------------------------------------------- */
/* Offers                                                                      */
/* -------------------------------------------------------------------------- */

type OfferSeed = [
  productSlug: string,
  merchant: string,
  price: number | null,
  availability: ProductOffer["availability"],
];

const OFFER_SEEDS: OfferSeed[] = [
  ["tidewalk-oversized-sand-blanket", "amazon", 74.0, "in_stock"],
  ["tidewalk-oversized-sand-blanket", "walmart", 79.99, "in_stock"],
  ["dunecrest-packable-beach-quilt", "amazon", 39.0, "in_stock"],
  ["dunecrest-packable-beach-quilt", "target", 42.0, "in_stock"],
  ["saltgrass-heavyweight-canvas-blanket", "direct", 128.0, "in_stock"],
  ["baywater-52qt-rotomolded-cooler", "amazon", 289.0, "in_stock"],
  ["baywater-52qt-rotomolded-cooler", "direct", 275.0, "in_stock"],
  ["shorepoint-soft-sided-cooler-tote", "target", 54.99, "in_stock"],
  ["ironcrest-wheeled-beach-cooler", "walmart", 149.0, "in_stock"],
  ["ironcrest-wheeled-beach-cooler", "amazon", 159.0, "out_of_stock"],
  ["harborlight-rolling-beach-wagon", "amazon", 189.0, "in_stock"],
  ["harborlight-rolling-beach-wagon", "walmart", 179.0, "in_stock"],
  ["dunecrest-windproof-beach-umbrella", "target", 89.99, "in_stock"],
  ["shorepoint-waterproof-speaker", "amazon", 119.0, "in_stock"],
  ["ironcrest-countertop-pizza-oven", "direct", 549.0, "in_stock"],
  ["ironcrest-countertop-pizza-oven", "amazon", 579.0, "in_stock"],
  ["saltgrass-portable-wood-fired-oven", "direct", 399.0, "in_stock"],
  ["baywater-rocking-pizza-cutter", "amazon", 34.0, "in_stock"],
];

export const SEED_PRODUCT_OFFERS: ProductOffer[] = OFFER_SEEDS.map(
  ([productSlug, merchant, price, availability], index) => ({
    id: `offer_${productSlug}_${merchant}`,
    product_id: `prod_${productSlug}`,
    merchant,
    merchant_product_id: `SEED-${String(index + 1).padStart(4, "0")}`,
    // example.com is reserved for documentation, so these link nowhere real and
    // the tag credits nobody.
    affiliate_url: `https://example.com/${merchant}/${productSlug}?tag=longislandio-seed`,
    direct_url: `https://example.com/${merchant}/${productSlug}`,
    price,
    currency: "USD",
    availability,
    last_checked_at: CHECKED_NOW,
    created_at: NOW,
    updated_at: NOW,
  }),
);

/* -------------------------------------------------------------------------- */
/* Buying guides                                                               */
/* -------------------------------------------------------------------------- */

type GuideSeed = {
  slug: string;
  title: string;
  categorySlug: string;
  localCategorySlug: string | null;
  description: string;
  intro: string;
  methodology: string;
  publishedAt: string;
  author: string;
  /** [productSlug, badge, bestFor, reason, pros, cons] in ranked order. */
  entries: [
    productSlug: string,
    badge: string | null,
    bestFor: string,
    reason: string,
    pros: string[],
    cons: string[],
  ][];
};

const GUIDE_SEEDS: GuideSeed[] = [
  {
    slug: "best-beach-blankets",
    title: "The Best Beach Blankets for Long Island Sand and Wind",
    categorySlug: "beach-blankets",
    localCategorySlug: "beaches",
    description:
      "Three blankets that stay flat in an onshore breeze, shake out clean and survive a season of salt.",
    intro:
      "A beach blanket has one hard job on this island and it is not comfort. It is staying put. The south shore gets a steady onshore wind most summer afternoons, and a blanket that works fine in a backyard becomes a kite by eleven. We looked for anchoring that actually works, fabric that sheds sand instead of holding it, and a packed size you can carry along with everything else.",
    methodology:
      "We compared specifications, owner reviews and expert coverage for more than thirty blankets, then weighted the things that matter locally: corner anchoring, behaviour in a 15-20mph onshore wind, how well sand shakes off dry, packed size for a long walk in, and how the fabric holds up to salt. We have not lab-tested these products.",
    publishedAt: "2026-05-20T13:00:00.000Z",
    author: "The LongIsland.io Editorial Team",
    entries: [
      [
        "tidewalk-oversized-sand-blanket",
        "Our Pick",
        "A family that wants one blanket to cover everyone",
        "Sand-fillable corner pockets are the only anchoring method that reliably beats a steady onshore wind without stakes, and at 9x10ft this covers four adults with room for a cooler. Ripstop sheds dry sand with one shake.",
        [
          "Corner pockets hold flat in real wind",
          "Big enough for four adults plus gear",
          "Dry sand shakes off cleanly",
        ],
        ["Bulky in a bag once packed", "Among the heavier options here"],
      ],
      [
        "dunecrest-packable-beach-quilt",
        "Best Value",
        "Long walks in from an overflow lot",
        "Folds down to about the size of a paperback, which is why it is the one that actually gets brought. You trade anchoring and coverage for that, so it is a two-person blanket on a calm day rather than an all-conditions one.",
        ["Packs genuinely small", "Light to carry", "Lowest price of the three"],
        ["No corner anchoring", "Too small for more than two people"],
      ],
      [
        "saltgrass-heavyweight-canvas-blanket",
        "Best Premium",
        "Shoulder season and tailgates",
        "Heavy enough to stay put by weight alone and backed against wet ground, so it works well past Labor Day. That weight is the point and also the drawback.",
        ["Stays put without anchors", "Waterproof backing", "Doubles as a fall tailgate blanket"],
        ["Heavy to carry any distance", "Most expensive here", "Slow to dry"],
      ],
    ],
  },
  {
    slug: "best-coolers",
    title: "The Best Coolers for a Long Island Beach Day",
    categorySlug: "coolers",
    localCategorySlug: "beaches",
    description:
      "From a soft tote for an afternoon to a rotomolded box for a full day, matched to how far you actually have to carry it.",
    intro:
      "Cooler advice usually optimises for ice retention, which is the wrong variable for a day at Robert Moses. What decides whether a cooler was the right call is the walk: across a hot parking lot, over soft sand, with a chair under the other arm. These three are sorted by how far you have to go and how long you are staying.",
    methodology:
      "We compared published ice-retention ratings, capacity, carry weight and wheel design across more than twenty-five coolers, and weighted for soft-sand transport and a four-to-eight hour day rather than multi-day camping. Owner reviews and expert coverage informed durability judgments. We have not lab-tested these products.",
    publishedAt: "2026-06-02T13:00:00.000Z",
    author: "The LongIsland.io Editorial Team",
    entries: [
      [
        "ironcrest-wheeled-beach-cooler",
        "Our Pick",
        "Anyone parking more than a short walk from the sand",
        "Balloon wheels are the difference between rolling and dragging once you are past the high-tide line. Standard cooler wheels dig in and stop; these stay on top of soft sand with a loaded box.",
        ["Rolls on soft sand", "45qt fits a full day", "Handles a loaded return trip"],
        ["Wheels add bulk in a trunk", "Heavier empty than a soft cooler"],
      ],
      [
        "shorepoint-soft-sided-cooler-tote",
        "Best Value",
        "A four-hour afternoon",
        "Light, welded so it does not leak into a bag, and easy to rinse. It will not hold ice overnight, but nothing about an afternoon requires that.",
        ["Very light", "Leakproof welded liner", "Rinses clean easily"],
        ["Limited ice retention", "24-can capacity is tight for a family"],
      ],
      [
        "baywater-52qt-rotomolded-cooler",
        "Best Premium",
        "A full day with a group, carried by two people",
        "The capacity and retention are genuinely there. So is the weight — this is a two-person carry when loaded, which is fine from a short boardwalk and punishing from an overflow lot.",
        ["Multi-day ice retention", "52qt handles a group", "Built to last seasons"],
        ["Two-person carry when full", "Most expensive", "No wheels"],
      ],
    ],
  },
  {
    slug: "best-pizza-ovens",
    title: "The Best Backyard Pizza Ovens",
    categorySlug: "pizza-ovens",
    localCategorySlug: "pizza",
    description:
      "Two ovens that actually reach the temperature a good pie needs, and the cutter to finish the job.",
    intro:
      "We spend a lot of time writing about pizza made by people who do it for a living. The question we get back is what it takes to get close at home, and the honest answer is temperature. A kitchen oven tops out around 550F. The bake that produces a blistered, chewy, structurally sound crust happens north of 800F, and that is the line these ovens cross.",
    methodology:
      "We compared maximum temperature, time to heat, floor material, fuel type and footprint across more than fifteen outdoor ovens, and weighted for backyard use rather than commercial volume. Owner reviews and expert coverage informed judgments about consistency and build. We have not lab-tested these products.",
    publishedAt: "2026-04-11T13:00:00.000Z",
    author: "The LongIsland.io Editorial Team",
    entries: [
      [
        "ironcrest-countertop-pizza-oven",
        "Our Pick",
        "Getting closest to a real coal-oven bake at home",
        "Nine hundred degrees on a cordierite floor is the specification that matters, and gas means you hit it in about twenty minutes without managing a fire. That combination is what makes it a Friday-night oven rather than a project.",
        ["Reaches 900F", "Ready in about 20 minutes", "Gas is repeatable week to week"],
        ["Needs a propane tank", "Countertop footprint is not small"],
      ],
      [
        "saltgrass-portable-wood-fired-oven",
        "Best for Travel",
        "Cookouts away from the house",
        "Thirty pounds and it packs down, so it travels to a campsite or a friend's yard. Wood means more attention and a longer warm-up, which is either the appeal or the drawback depending on the evening.",
        ["Genuinely portable at 30lb", "Wood flavour", "Lower price than the gas oven"],
        ["Longer warm-up", "Fire needs managing mid-bake", "Less repeatable"],
      ],
      [
        "baywater-rocking-pizza-cutter",
        "Best Value",
        "Cutting a loaded pie without wrecking it",
        "A rocker cuts straight down through a well-topped pie. A wheel drags the toppings sideways, which is why the last slice always looks worse than the first.",
        ["Clean cuts on loaded pies", "Blade guard for storage", "Inexpensive"],
        ["Needs a large board or peel", "Hand-wash only"],
      ],
    ],
  },
];

export const SEED_PRODUCT_RANKINGS: ProductRanking[] = GUIDE_SEEDS.map((seed) => ({
  id: `prank_${seed.slug}`,
  title: seed.title,
  slug: seed.slug,
  category_id: `pcat_${seed.categorySlug}`,
  local_category_id: seed.localCategorySlug ? `cat_${seed.localCategorySlug}` : null,
  description: seed.description,
  intro: seed.intro,
  methodology: seed.methodology,
  status: "published",
  author_name: seed.author,
  published_at: seed.publishedAt,
  created_at: NOW,
  updated_at: NOW,
}));

export const SEED_PRODUCT_RANKING_ENTRIES: ProductRankingEntry[] = GUIDE_SEEDS.flatMap(
  (seed) =>
    seed.entries.map(([productSlug, badge, bestFor, reason, pros, cons], index) => ({
      id: `pentry_${seed.slug}_${index + 1}`,
      product_ranking_id: `prank_${seed.slug}`,
      product_id: `prod_${productSlug}`,
      position: index + 1,
      badge,
      best_for: bestFor,
      editorial_reason: reason,
      pros,
      cons,
      created_at: NOW,
      updated_at: NOW,
    })),
);

/* -------------------------------------------------------------------------- */
/* Recommendation modules on local pages                                       */
/* -------------------------------------------------------------------------- */

type RecommendationSeed = [
  rankingSlug: string,
  contextLabel: string,
  entries: [productSlug: string, note: string][],
];

const RECOMMENDATION_SEEDS: RecommendationSeed[] = [
  [
    "things-to-do-with-kids-long-island",
    "Heading out with the kids? Here is what we recommend bringing.",
    [
      [
        "harborlight-rolling-beach-wagon",
        "One trip from the car instead of three, which is the whole difference with small children.",
      ],
      [
        "tidewalk-oversized-sand-blanket",
        "Big enough that everyone fits, anchored well enough that it stays put.",
      ],
      [
        "shorepoint-soft-sided-cooler-tote",
        "Light enough to carry with a child on the other arm.",
      ],
      [
        "dunecrest-windproof-beach-umbrella",
        "The vented canopy and screw anchor keep shade where you put it.",
      ],
    ],
  ],
  [
    "pizza-long-island",
    "Want to try it at home? Here is what that takes.",
    [
      [
        "ironcrest-countertop-pizza-oven",
        "The temperature these places hit is the part a kitchen oven cannot reach.",
      ],
      [
        "baywater-rocking-pizza-cutter",
        "Cuts a loaded pie without dragging the toppings off it.",
      ],
    ],
  ],
];

export const SEED_PRODUCT_RECOMMENDATIONS: ContentProductRecommendation[] =
  RECOMMENDATION_SEEDS.flatMap(([rankingSlug, contextLabel, entries]) =>
    entries.map(([productSlug, note], index) => ({
      id: `prec_${rankingSlug}_${index + 1}`,
      content_type: "ranking" as const,
      content_id: `rank_${rankingSlug}`,
      product_id: `prod_${productSlug}`,
      position: index + 1,
      context_label: contextLabel,
      editorial_note: note,
      created_at: NOW,
    })),
  );
