/**
 * What the model actually has to work with, in an editor's language.
 *
 * The previous version of this collapsed everything into one word — "thin" —
 * which told a VA that something was wrong without telling them what, and
 * implied we knew less about a business than we did. We usually know exactly
 * who and where a place is; what we lack is anything to say about it.
 *
 * So the two are separated. IDENTITY is who and where the business is: facts,
 * and enough to publish an accurate listing. EDITORIAL EVIDENCE is the material
 * a judgement can be built from. Only the second decides whether a draft is
 * worth trusting, because a model handed a name and an address will still
 * produce a confident paragraph about the food.
 */

export type ResearchLevel = "good" | "limited" | "insufficient";

export interface ContextItem {
  /** What an editor calls it. */
  label: string;
  present: boolean;
  /** How to get it, shown only when it is missing and there is an answer. */
  fix?: string;
}

export interface ResearchContext {
  level: ResearchLevel;
  /** Reads as "AI research context: Limited". */
  levelLabel: string;
  identity: ContextItem[];
  editorial: ContextItem[];
  /** True when a draft would be written from identity alone. */
  needsConfirmation: boolean;
}

export interface ContextInput {
  hasLocation: boolean;
  hasAddress: boolean;
  hasPhone: boolean;
  hasCategories: boolean;
  hasWebsite: boolean;
  hasDescription: boolean;
  hasEditorialSummary: boolean;
  hasEditorNotes: boolean;
  hasReviewExcerpts: boolean;
}

const LEVEL_LABELS: Record<ResearchLevel, string> = {
  good: "Good",
  limited: "Limited",
  insufficient: "Insufficient",
};

export function assessResearchContext(input: ContextInput): ResearchContext {
  const identity: ContextItem[] = [
    { label: "Name and location", present: input.hasLocation },
    { label: "Street address", present: input.hasAddress },
    { label: "Phone number", present: input.hasPhone },
    { label: "Categories", present: input.hasCategories },
    {
      label: "Official website",
      present: input.hasWebsite,
      fix: "Use Find website",
    },
  ];

  const editorial: ContextItem[] = [
    {
      label: "Business description",
      present: input.hasDescription,
      fix: "Write one on the business record",
    },
    {
      label: "Our editorial summary",
      present: input.hasEditorialSummary,
      fix: "Write one on the business record",
    },
    {
      label: "Editor notes",
      present: input.hasEditorNotes,
      fix: "Add a line below — anything you know about the place",
    },
    {
      label: "Review excerpts",
      present: input.hasReviewExcerpts,
      fix: "Needs a Yelp match on this business",
    },
  ];

  const editorialCount = editorial.filter((item) => item.present).length;

  /*
   * Two is the threshold rather than one because a single source cannot be
   * checked against anything. Three review excerpts on their own are three
   * opinions, not a finding — the same reason the house rules forbid the word
   * "overwhelmingly".
   */
  const level: ResearchLevel =
    editorialCount >= 2 ? "good" : editorialCount === 1 ? "limited" : "insufficient";

  return {
    level,
    levelLabel: LEVEL_LABELS[level],
    identity,
    editorial,
    needsConfirmation: level === "insufficient",
  };
}
