/**
 * The site's editorial slots, named for editors rather than for the database.
 *
 * These are fixed application slots: the homepage asks for `homepage_primary`
 * by name in its own code, so an editor inventing a section key achieves
 * nothing and mistyping one achieves less. Treating them as things to CREATE
 * was the original mistake — they exist whether or not a row does, so admin
 * provisions the row on demand and the editor only ever chooses content.
 *
 * `sectionTitle` and `sectionDescription` are the ambiguity this table settles.
 * A section title is an admin label unless `showsHeading` is true, in which case
 * it renders as the visible heading above the block. For the feature slot it is
 * never shown — the selected item supplies the headline, and a section title
 * there produces two competing headlines on the same page.
 */

import type { TargetKind } from "@/lib/data/target-search";

export type PlacementScope = "global" | "category" | "place";

export interface Placement {
  /** The database key. Editors never type this. */
  key: string;
  /** What an editor calls it. */
  name: string;
  /** Where it appears, in words. */
  location: string;
  /** One line on what the slot does. */
  purpose: string;
  scope: PlacementScope;
  layout: "feature" | "rail" | "grid" | "link_row";
  /**
   * Whether the section's title and description render publicly.
   *
   * False means they are admin labels only — which is the honest answer for
   * most slots, because the surrounding page already has a heading.
   */
  showsHeading: boolean;
  /** What the public block is headed with when it has one. */
  publicHeading: string | null;
  /** Sensible ceiling, applied when the section is created. */
  maxItems: number | null;
  /** Which target types belong here. Empty means anything editorial. */
  restrictedTo?: string[];
  /**
   * What the picker is allowed to search for this placement.
   *
   * Narrower than "everything editorial" on purpose. A commerce row cannot
   * hold a restaurant ranking, so Top Picks does not query the rankings table
   * at all — which is both faster and the only way the picker can be honest
   * about what it is offering. `external_url` is always available and is not
   * listed, because it is typed rather than searched.
   */
  accepts: TargetKind[];
  /** Where to look at the result. */
  previewPath: string | null;
  /**
   * What actually happens on the page when this placement has nothing live.
   *
   * The empty-state message used to say "the homepage hides it" for every
   * placement, which was true of three of the eight. The rest fall back to
   * something automatic, and each falls back to something different — telling
   * an editor their empty Featured Module is hiding the category's rankings,
   * when the page is in fact listing all of them, sends them to fix a problem
   * that is not there.
   *
   * `{surface}` is replaced with the page this placement sits on.
   */
  whenEmpty: string;
}

export const PLACEMENTS: Placement[] = [
  {
    key: "homepage_primary",
    accepts: ["ranking", "article", "product_ranking"],
    name: "Primary Feature",
    location: "Homepage",
    purpose:
      "The lead story. Takes a ranking, an article or a buying guide, and uses its own image, headline and dek.",
    scope: "global",
    layout: "feature",
    // The item IS the headline here. A section title would compete with it.
    showsHeading: false,
    publicHeading: null,
    maxItems: 1,
    previewPath: "/",
    whenEmpty: "{surface} hides it.",
  },
  {
    key: "homepage_latest",
    accepts: ["ranking", "article", "product_ranking"],
    name: "Latest",
    location: "Homepage",
    purpose: "The left rail beside the feature. Recent lists and articles.",
    scope: "global",
    layout: "rail",
    showsHeading: true,
    publicHeading: "The Latest",
    maxItems: 5,
    previewPath: "/",
    whenEmpty: "{surface} falls back to the newest published rankings, in date order.",
  },
  {
    key: "homepage_top_rail",
    accepts: ["ranking", "article", "product_ranking"],
    name: "Top Rail",
    location: "Homepage",
    purpose: "The right rail beside the feature. Anything worth a numbered slot.",
    scope: "global",
    layout: "rail",
    showsHeading: true,
    publicHeading: "Top Rankings",
    maxItems: 5,
    previewPath: "/",
    whenEmpty: "{surface} hides it.",
  },
  {
    key: "homepage_top_picks",
    accepts: ["product", "product_ranking"],
    name: "Top Picks",
    location: "Homepage",
    purpose:
      "The commerce row. Products and buying guides only — anything else is skipped rather than shown as a mismatched card.",
    scope: "global",
    layout: "grid",
    showsHeading: true,
    publicHeading: "Our Top Picks",
    maxItems: 5,
    restrictedTo: ["product", "product_ranking"],
    previewPath: "/",
    whenEmpty: "{surface} hides it.",
  },
  {
    key: "homepage_trending",
    accepts: ["ranking", "article", "product_ranking"],
    name: "Trending",
    location: "Homepage",
    purpose: "Three cards below the newsletter band.",
    scope: "global",
    layout: "grid",
    showsHeading: true,
    publicHeading: "What's Trending Now",
    maxItems: 3,
    previewPath: "/",
    whenEmpty: "{surface} hides it.",
  },
  {
    key: "related_content",
    accepts: ["ranking", "article", "product_ranking", "business"],
    name: "Related Content",
    location: "Homepage",
    purpose: "The Related Reviews line under the feature.",
    scope: "global",
    layout: "link_row",
    showsHeading: false,
    publicHeading: null,
    maxItems: 4,
    previewPath: "/",
    whenEmpty: "{surface} works out related links automatically instead.",
  },
  {
    key: "category_module",
    accepts: ["ranking", "article", "product_ranking", "business"],
    name: "Featured Module",
    location: "Category page",
    purpose: "The featured rankings grid, for one category.",
    scope: "category",
    layout: "grid",
    showsHeading: true,
    publicHeading: "Featured",
    maxItems: 8,
    previewPath: null,
    whenEmpty: "{surface} lists every published ranking in the category instead.",
  },
  {
    key: "category_links",
    accepts: ["ranking", "article", "product_ranking", "category"],
    name: "Heading Links",
    location: "Category page",
    purpose: "Text links beside the section heading.",
    scope: "category",
    layout: "link_row",
    showsHeading: false,
    publicHeading: null,
    maxItems: 4,
    previewPath: null,
    whenEmpty: "{surface} leaves the row of links out. Nothing else changes.",
  },
];

export function findPlacement(key: string): Placement | null {
  return PLACEMENTS.find((placement) => placement.key === key) ?? null;
}

/** Grouped for the dashboard, in the order they appear on the page. */
export function placementsByLocation(): { location: string; placements: Placement[] }[] {
  const groups = new Map<string, Placement[]>();
  for (const placement of PLACEMENTS) {
    const list = groups.get(placement.location) ?? [];
    list.push(placement);
    groups.set(placement.location, list);
  }
  return [...groups].map(([location, placements]) => ({ location, placements }));
}

/**
 * Whether a key belongs to the site's fixed structure.
 *
 * A system placement is part of the page, not a piece of content. The homepage
 * asks for `homepage_primary` by name in its own code, so deleting that row
 * does not remove a section from the site — it removes the site's ability to
 * fill one, and leaves a permanently empty hole nobody can see the cause of.
 * The row is recreated on demand, so the delete is not even destructive in a
 * useful way; it is just a trap.
 */
export function isSystemPlacement(key: string): boolean {
  return PLACEMENTS.some((placement) => placement.key === key);
}

/** Placements that hold exactly one thing, where "add" means "replace". */
export function isSingleSlot(key: string): boolean {
  const placement = findPlacement(key);
  return placement?.maxItems === 1;
}

/**
 * The heading a placement draws when the editor has not written one.
 *
 * This existed twice and disagreed with itself. The category page fell back to
 * "Pizza Rankings"; the admin form told the editor that leaving the field empty
 * would give them "Featured". Whichever an editor trusted, the other one was
 * what readers got.
 *
 * A scoped placement names its scope, because "Featured" on a page that is
 * already headed Pizza says nothing a reader did not know.
 */
export function defaultPublicHeading(
  placement: Placement | null,
  scopeName?: string | null,
): string {
  if (placement?.scope === "category" && scopeName) {
    return `${scopeName} Rankings`;
  }
  return placement?.publicHeading ?? placement?.name ?? "";
}

/**
 * The empty-state clause for a placement, with its surface named.
 *
 * Returned as a clause rather than a whole sentence so the caller keeps the
 * placement's name in its own voice: "Featured Module is empty, so " + this.
 *
 * A custom section — one no placement claims — gets the cautious answer. The
 * code that reads it is not in the registry, so nothing here can honestly say
 * what the page does without it.
 */
export function emptyStateClause(
  placement: Placement | null,
  surfaceName: string,
): string {
  const surface = surfaceName.trim() || "the page";
  if (!placement) return `nothing appears in its place on the ${surface}.`;
  return placement.whenEmpty.replace("{surface}", `the ${surface}`);
}
