import "server-only";

import { z } from "zod";

import { RANKING_BADGES } from "@/types/database";
import type { BusinessResearch, EvidenceAssessment } from "@/lib/ai/research";

/**
 * The editorial rules the model works under, and the shapes it must return.
 *
 * These are the guardrails, not decoration. A model handed three enthusiastic
 * review excerpts will write "customers overwhelmingly agree this is the best
 * in town" unless something stops it — so the system prompt names that failure
 * and the shapes constrain the output length so there is no room to pad with
 * invented specifics.
 */

/* -------------------------------------------------------------------------- */
/* Shapes                                                                      */
/* -------------------------------------------------------------------------- */

export const entryCopySchema = z.object({
  /** One short phrase, lowercase, no trailing full stop. */
  bestFor: z.string().trim().min(3).max(90),
  /** Two or three sentences. */
  whyWePickedIt: z.string().trim().min(40).max(600),
  /** Only when the evidence genuinely supports one. */
  badge: z.enum(["", ...RANKING_BADGES] as [string, ...string[]]).optional(),
  /**
   * The model's own read of how much it had to go on. Shown to the editor
   * beside the draft, so a confident-sounding paragraph built on nothing is
   * labelled as such by the thing that wrote it.
   */
  confidence: z.enum(["high", "medium", "low"]),
  /** One line naming what the draft rests on. Internal only. */
  basis: z.string().trim().max(200),
});

export type EntryCopy = z.infer<typeof entryCopySchema>;

export const rankingCopySchema = z.object({
  dek: z.string().trim().min(20).max(300),
  intro: z.string().trim().min(80).max(1200),
  methodology: z.string().trim().min(80).max(1200),
});

export type RankingCopy = z.infer<typeof rankingCopySchema>;

/* -------------------------------------------------------------------------- */
/* Standing rules                                                              */
/* -------------------------------------------------------------------------- */

const HOUSE_RULES = `
You draft editorial copy for LongIsland.io, a local review publication.

Everything you produce is a DRAFT for a human editor. Write as the publication,
in plain British-inflected American editorial English. No marketing voice, no
superlatives you cannot support, no exclamation marks.

WHAT YOU MUST NEVER CLAIM
- That we visited, ate, tasted, tested, inspected or used anything.
- That we interviewed anyone, spoke to staff, or contacted a business.
- That we read hundreds of reviews, or that customers "overwhelmingly" or
  "universally" agree anything. You may be shown at most three review excerpts.
  Three is three. It is not a survey.
- Any specific fact not present in the research: no founding dates, no oven
  types, no family histories, no awards, no prices, no named dishes unless the
  research names them.
- That a third party selected, ranked or endorsed our list.

REVIEW EXCERPTS
Excerpts are internal evidence only. Never quote them, never paraphrase one
closely enough to be recognisable, and never attribute a view to "customers" or
"reviewers". Use them only to notice a recurring theme, and then write the theme
in our own words as a possibility rather than a finding.

  Excerpts mention vegan options repeatedly
  GOOD: "Best for: diners looking for vegan-friendly options"
  BAD:  "Customers overwhelmingly agree this is the best vegan pizza in town"

RATINGS AND REVIEW COUNTS
Research context only. Do not put a rating or a review count in the prose, and
do not describe a business as "highly rated" or "well reviewed" on that basis.

WHEN THE EVIDENCE IS THIN
Write less, and write it more carefully. A short, plainly true sentence is a
good draft. A confident paragraph built on a name and a category is a bad one,
however well it reads. Say what the category and location make reasonable and
stop there.

OUTPUT
Return a single JSON object and nothing else. No prose before or after, no code
fence. The opening brace has already been written for you.
`.trim();

/* -------------------------------------------------------------------------- */
/* Per-entry                                                                   */
/* -------------------------------------------------------------------------- */

export function entryCopyPrompt(input: {
  rankingTitle: string;
  categoryName: string | null;
  geography: string | null;
  position: number;
  totalEntries: number;
  research: BusinessResearch;
  evidence: EvidenceAssessment;
}): { system: string; prompt: string } {
  const r = input.research;

  const research = [
    `Business: ${r.name}`,
    r.city ? `Town: ${r.city}${r.inRankingArea === false ? " (NOT the town this ranking is about)" : ""}` : null,
    r.address ? `Address: ${r.address}` : null,
    r.categories.length ? `Yelp categories: ${r.categories.join(", ")}` : null,
    r.yelpRating !== null ? `Yelp rating: ${r.yelpRating} (internal only)` : null,
    r.yelpReviewCount !== null ? `Yelp review count: ${r.yelpReviewCount} (internal only)` : null,
    r.description ? `Business description: ${r.description}` : null,
    r.editorialSummary ? `Our editorial summary: ${r.editorialSummary}` : null,
    r.editorNotes ? `Editor notes: ${r.editorNotes}` : null,
    r.excerpts.length
      ? `Review excerpts (INTERNAL — do not quote or paraphrase closely):\n` +
        r.excerpts.map((e, i) => `  ${i + 1}. ${e.text}`).join("\n")
      : "Review excerpts: none available",
    `Evidence strength: ${input.evidence.strength}`,
    input.evidence.gaps.length ? `Missing: ${input.evidence.gaps.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `
Draft the entry copy for one business in a local ranking.

RANKING
Title: ${input.rankingTitle}
${input.categoryName ? `Category: ${input.categoryName}` : ""}
${input.geography ? `Area: ${input.geography}` : ""}
Position: ${input.position} of ${input.totalEntries}

RESEARCH
${research}

WRITE
- bestFor: one short phrase completing "Best for…". Lowercase, no full stop.
  Concrete and useful: an occasion, a companion, a craving, a constraint.
- whyWePickedIt: two or three sentences on why this belongs at this position.
  Specific where the research supports it, general where it does not.
- badge: one of ${RANKING_BADGES.join(", ")} — or "" if nothing is clearly
  earned. Do not award one to fill the field. Position ${input.position} of
  ${input.totalEntries} does not by itself justify a badge.
- confidence: your honest read of how much you had to work with.
- basis: one line naming what the draft rests on, for the editor.
${input.evidence.strength === "thin" ? "\nThe evidence here is THIN. Keep it short and non-specific." : ""}
`.trim();

  return { system: HOUSE_RULES, prompt };
}

/* -------------------------------------------------------------------------- */
/* Ranking level                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The methodology has to describe what we actually did.
 *
 * This is the paragraph a reader uses to decide whether to trust the list, and
 * the one most likely to drift into claims we cannot support — so the real
 * process is spelled out for the model rather than left to it.
 */
const ACTUAL_PROCESS = `
OUR ACTUAL PROCESS, which the methodology must describe accurately:
1. Candidate research from third-party local sources, used only to assemble a
   pool of businesses worth considering.
2. Reputation and review signals read as evidence, never as a verdict.
3. Relevance to the category and the specific area.
4. Editorial review and comparison by the LongIsland.io team.
5. Final selection and ordering decided by LongIsland.io.

Do not say a third party chose or ranked this list. Do not claim visits,
tastings, tests, interviews or first-hand experience. Do not claim every
business in the area was reviewed.
`.trim();

export function rankingCopyPrompt(input: {
  title: string;
  categoryName: string | null;
  geography: string | null;
  entries: { position: number; name: string; city: string | null; bestFor: string | null }[];
  editorNotes: string[];
}): { system: string; prompt: string } {
  const list = input.entries
    .map(
      (e) =>
        `  ${e.position}. ${e.name}${e.city ? ` — ${e.city}` : ""}${e.bestFor ? ` (best for ${e.bestFor})` : ""}`,
    )
    .join("\n");

  const prompt = `
Draft the top-level copy for a local ranking.

RANKING
Title: ${input.title}
${input.categoryName ? `Category: ${input.categoryName}` : ""}
${input.geography ? `Area: ${input.geography}` : ""}

THE LIST
${list || "  (no entries yet)"}

${input.editorNotes.length ? `EDITOR NOTES\n${input.editorNotes.map((n) => `  - ${n}`).join("\n")}\n` : ""}
${ACTUAL_PROCESS}

WRITE
- dek: one sentence for cards and search results. Says what the list is and
  who it is for.
- intro: the opening paragraph above the list. Sets up the area and the
  category. Do not summarise every entry.
- methodology: how this list was made, following OUR ACTUAL PROCESS above.
  Written for a reader deciding whether to trust it.
`.trim();

  return { system: HOUSE_RULES, prompt };
}
