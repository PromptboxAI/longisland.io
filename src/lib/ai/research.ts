import "server-only";

import { getYelpApiKey, isYelpConfigured } from "@/lib/env";

/**
 * What the model is allowed to know, and how strong it is.
 *
 * Two jobs. It gathers the evidence for one business from sources we are
 * actually entitled to use, and it grades that evidence so an editor — or a VA
 * with no local knowledge — can tell a draft built on something from a draft
 * built on a name and a category.
 *
 * The grading matters more than it looks. A model handed almost nothing will
 * still write fluent, confident prose; the only defence is to know beforehand
 * that the evidence was thin, and to say so on screen.
 */

/** Yelp returns at most three excerpts, each truncated to about 160 characters. */
const MAX_EXCERPTS = 3;
const REVIEW_TIMEOUT_MS = 8000;

export interface ReviewExcerpt {
  text: string;
  rating: number | null;
}

export interface BusinessResearch {
  name: string;
  city: string | null;
  address: string | null;
  county: string | null;
  categories: string[];
  /** Internal research signal only. Never published as our own assessment. */
  yelpRating: number | null;
  yelpReviewCount: number | null;
  excerpts: ReviewExcerpt[];
  description: string | null;
  editorialSummary: string | null;
  editorNotes: string | null;
  /** Whether the business is in the town the ranking is about. */
  inRankingArea: boolean | null;
}

export type EvidenceStrength = "strong" | "moderate" | "thin";

export interface EvidenceAssessment {
  strength: EvidenceStrength;
  /** What the model actually had, phrased for an editor. */
  signals: string[];
  /** What was missing, so a VA knows why a draft is cautious. */
  gaps: string[];
}

/**
 * Grades the evidence behind one business.
 *
 * Deliberately conservative. Three review excerpts are three, not a survey —
 * they can never on their own make the evidence "strong", because a model given
 * three enthusiastic sentences will happily write "customers overwhelmingly
 * agree" if nothing stops it.
 */
export function assessEvidence(research: BusinessResearch): EvidenceAssessment {
  const signals: string[] = [];
  const gaps: string[] = [];

  if (research.categories.length > 0) {
    signals.push(`${research.categories.length} Yelp categor${research.categories.length === 1 ? "y" : "ies"}`);
  } else {
    gaps.push("no Yelp categories");
  }

  if (research.yelpReviewCount !== null) {
    signals.push(
      `${research.yelpReviewCount.toLocaleString()} Yelp reviews` +
        (research.yelpRating !== null ? ` at ${research.yelpRating}` : ""),
    );
  }

  if (research.excerpts.length > 0) {
    signals.push(
      `${research.excerpts.length} review excerpt${research.excerpts.length === 1 ? "" : "s"}`,
    );
  } else {
    gaps.push("no review excerpts available");
  }

  if (research.editorialSummary) signals.push("editorial summary written");
  else gaps.push("no editorial summary");

  if (research.description) signals.push("business description present");
  else gaps.push("no business description");

  if (research.editorNotes) signals.push("editor notes present");

  if (research.inRankingArea === false) {
    gaps.push("outside the ranking's town");
  }

  /*
   * Something an editor wrote is what makes evidence strong — our own summary
   * or notes. Third-party signals alone are moderate at best, however many
   * reviews sit behind them.
   */
  const hasOwnEditorial = Boolean(research.editorialSummary || research.editorNotes);
  const hasThirdParty = research.excerpts.length > 0 || research.description !== null;

  const strength: EvidenceStrength = hasOwnEditorial
    ? "strong"
    : hasThirdParty
      ? "moderate"
      : "thin";

  return { strength, signals, gaps };
}

/**
 * Yelp review excerpts for one business, through the authorised endpoint.
 *
 * These are INTERNAL evidence. They may inform what a draft says a place is
 * good for; they may never be quoted, paraphrased closely, or stored as our
 * editorial copy. Nothing here is written to the database.
 *
 * Returns an empty array on any failure — a missing excerpt is a thinner draft,
 * not a broken one.
 */
export async function fetchReviewExcerpts(
  yelpBusinessId: string,
): Promise<ReviewExcerpt[]> {
  if (!isYelpConfigured) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REVIEW_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://api.yelp.com/v3/businesses/${encodeURIComponent(yelpBusinessId)}/reviews?limit=${MAX_EXCERPTS}`,
      {
        headers: { Authorization: `Bearer ${getYelpApiKey()}` },
        signal: controller.signal,
      },
    );

    if (!response.ok) return [];

    const body = (await response.json()) as {
      reviews?: { text?: string; rating?: number }[];
    };

    return (body.reviews ?? [])
      .slice(0, MAX_EXCERPTS)
      .map((review) => ({
        text: (review.text ?? "").trim(),
        rating: typeof review.rating === "number" ? review.rating : null,
      }))
      .filter((excerpt) => excerpt.text.length > 0);
  } catch {
    // Yelp is a third party on this path; never let it fail a draft outright.
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * The Yelp business-detail record, for the fields the search does not return.
 *
 * The one that matters is `attributes.business_url` — the business's OWN
 * website, which the search endpoint omits and which is the doorway to real
 * facts about a place rather than inferences about it. Yelp's own `url` field
 * is a link to Yelp and is deliberately not treated as a website.
 *
 * Nothing here is licensed content: a phone number, opening hours and a
 * business's own address are facts about the business, not Yelp's writing.
 */
export interface YelpDetail {
  websiteUrl: string | null;
  priceBand: string | null;
  isClaimed: boolean | null;
  categories: string[];
  hasHours: boolean;
}

export async function fetchBusinessDetail(
  yelpBusinessId: string,
): Promise<YelpDetail | null> {
  if (!isYelpConfigured) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REVIEW_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://api.yelp.com/v3/businesses/${encodeURIComponent(yelpBusinessId)}`,
      {
        headers: { Authorization: `Bearer ${getYelpApiKey()}` },
        signal: controller.signal,
      },
    );
    if (!response.ok) return null;

    const body = (await response.json()) as {
      attributes?: { business_url?: string | null };
      price?: string | null;
      is_claimed?: boolean;
      categories?: { title?: string }[];
      hours?: unknown[];
    };

    const website = body.attributes?.business_url?.trim() || null;

    return {
      // Only an http(s) address, and never Yelp's own page dressed as one.
      websiteUrl:
        website && /^https?:\/\//i.test(website) && !/yelp\.com/i.test(website)
          ? website
          : null,
      priceBand: body.price ?? null,
      isClaimed: typeof body.is_claimed === "boolean" ? body.is_claimed : null,
      categories: (body.categories ?? [])
        .map((c) => c.title ?? "")
        .filter((title) => title.length > 0),
      hasHours: Array.isArray(body.hours) && body.hours.length > 0,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
