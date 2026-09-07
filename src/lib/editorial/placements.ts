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
  /** Where to look at the result. */
  previewPath: string | null;
}

export const PLACEMENTS: Placement[] = [
  {
    key: "homepage_primary",
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
  },
  {
    key: "homepage_latest",
    name: "Latest",
    location: "Homepage",
    purpose: "The left rail beside the feature. Recent lists and articles.",
    scope: "global",
    layout: "rail",
    showsHeading: true,
    publicHeading: "The Latest",
    maxItems: 5,
    previewPath: "/",
  },
  {
    key: "homepage_top_rail",
    name: "Top Rail",
    location: "Homepage",
    purpose: "The right rail beside the feature. Anything worth a numbered slot.",
    scope: "global",
    layout: "rail",
    showsHeading: true,
    publicHeading: "Top Rankings",
    maxItems: 5,
    previewPath: "/",
  },
  {
    key: "homepage_top_picks",
    name: "Top Picks",
    location: "Homepage",
    purpose:
      "The commerce row. Products only — anything else is skipped rather than shown as a mismatched card.",
    scope: "global",
    layout: "grid",
    showsHeading: true,
    publicHeading: "Our Top Picks",
    maxItems: 5,
    restrictedTo: ["product"],
    previewPath: "/",
  },
  {
    key: "homepage_trending",
    name: "Trending",
    location: "Homepage",
    purpose: "Three cards below the newsletter band.",
    scope: "global",
    layout: "grid",
    showsHeading: true,
    publicHeading: "What's Trending Now",
    maxItems: 3,
    previewPath: "/",
  },
  {
    key: "related_content",
    name: "Related Content",
    location: "Homepage",
    purpose: "The Related Reviews line under the feature.",
    scope: "global",
    layout: "link_row",
    showsHeading: false,
    publicHeading: null,
    maxItems: 4,
    previewPath: "/",
  },
  {
    key: "category_module",
    name: "Featured Module",
    location: "Category page",
    purpose: "The featured rankings grid, for one category.",
    scope: "category",
    layout: "grid",
    showsHeading: true,
    publicHeading: "Featured",
    maxItems: 8,
    previewPath: null,
  },
  {
    key: "category_links",
    name: "Heading Links",
    location: "Category page",
    purpose: "Text links beside the section heading.",
    scope: "category",
    layout: "link_row",
    showsHeading: false,
    publicHeading: null,
    maxItems: 4,
    previewPath: null,
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
