import { slugify } from "@/lib/slug";

/**
 * Default title and slug for a new ranking.
 *
 * Both are suggestions. The workbench shows them in editable fields and the
 * ranking editor can change them afterwards — nothing here is enforced.
 *
 * The reason this is not one template string: category names do not share a
 * grammar. "Pizza" is a mass noun, "Dentist" is a countable one, "Italian" is
 * an adjective that needs a noun after it. "The 10 Best Pizza in Stony Brook"
 * and "10 Best Italian in Huntington" both read as though nobody looked.
 */

/**
 * How a category is named in a headline.
 *
 * Keyed by slug. A category with no entry falls back to its own name, which is
 * right for anything already plural and countable ("Breweries", "Bakeries") —
 * so this list only needs the ones that read badly.
 */
const HEADLINE_LABELS: Record<string, string> = {
  // Mass nouns that need a place-noun after them.
  pizza: "Pizza Places",
  sushi: "Sushi Restaurants",
  bbq: "BBQ Joints",
  coffee: "Coffee Shops",
  "ice-cream": "Ice Cream Shops",
  bagels: "Bagel Shops",
  seafood: "Seafood Restaurants",
  brunch: "Brunch Spots",
  breakfast: "Breakfast Spots",
  burgers: "Burger Joints",
  "fine-dining": "Fine Dining Restaurants",
  "date-night": "Date-Night Restaurants",
  "waterfront-dining": "Waterfront Restaurants",
  cocktails: "Cocktail Bars",

  // Adjectives that need a noun.
  italian: "Italian Restaurants",
  chinese: "Chinese Restaurants",
  mexican: "Mexican Restaurants",

  // Singular professions.
  dentist: "Dentists",
  dentists: "Dentists",
  orthodontist: "Orthodontists",
  plumber: "Plumbers",
  plumbers: "Plumbers",
  roofer: "Roofers",
  roofers: "Roofers",
  electrician: "Electricians",
  landscaper: "Landscapers",
  contractor: "General Contractors",
  mover: "Movers",
  hvac: "HVAC Companies",
};

/** Title Case for a free-text topic, when there is no category to lean on. */
export function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * The noun to use in a headline for a category.
 *
 * `categorySlug` is checked first because it is stable; the name is the
 * fallback, and the free-text topic is the last resort for a ranking filed
 * against no category at all.
 */
export function headlineLabel(
  categorySlug: string | null,
  categoryName: string | null,
  topic: string,
): string {
  if (categorySlug && HEADLINE_LABELS[categorySlug]) {
    return HEADLINE_LABELS[categorySlug];
  }
  if (categoryName) {
    return HEADLINE_LABELS[slugify(categoryName)] ?? categoryName;
  }
  return HEADLINE_LABELS[slugify(topic)] ?? titleCase(topic);
}

/** "10 Best Pizza Places in Stony Brook" */
export function suggestRankingTitle(options: {
  count: number;
  categorySlug: string | null;
  categoryName: string | null;
  topic: string;
  areaLabel: string;
}): string {
  const noun = headlineLabel(options.categorySlug, options.categoryName, options.topic);
  return `${options.count} Best ${noun} in ${options.areaLabel}`;
}

/**
 * "pizza-stony-brook"
 *
 * Deliberately not derived from the title. A title carries a count and the word
 * "best"; a URL that carries the count breaks the day a top ten becomes a top
 * twelve, and "best" is already said by the /best/ route. The category's own
 * slug is used rather than its headline label, so the URL stays short.
 */
export function suggestRankingSlug(options: {
  categorySlug: string | null;
  topic: string;
  areaSlug: string;
}): string {
  const subject = options.categorySlug ?? slugify(options.topic);
  if (!subject) return slugify(options.areaSlug);
  if (!options.areaSlug) return subject;
  return `${subject}-${slugify(options.areaSlug)}`;
}
