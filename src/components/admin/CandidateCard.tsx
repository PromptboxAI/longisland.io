"use client";

import { ExternalLink, MapPin, Phone, Star } from "lucide-react";

import type { YelpBusiness } from "@/lib/yelp/types";

export interface CandidateCardProps {
  candidate: YelpBusiness;
  selected: boolean;
  excluded: boolean;
  position?: number;
  /**
   * The town the ranking is about, for comparison against where the business
   * actually is.
   *
   * Yelp's location search is generous: asking for Stony Brook returns
   * businesses in East Setauket and Lake Grove too. Those are often the right
   * call editorially, so nothing is filtered out — but a hyperlocal list should
   * never gain an out-of-town entry because nobody noticed.
   */
  searchAreaLabel?: string | null;
  /**
   * What the ranking is about — the category slug, or the typed topic.
   *
   * Used only to flag a candidate whose Yelp categories do not mention it. A
   * pizza search returns bakeries and cafes, and on a card showing one
   * simplified label they are indistinguishable from the real thing.
   */
  topicHint?: string | null;
  onToggle: () => void;
  onExclude: () => void;
}

/**
 * Whether a candidate's Yelp categories relate to what was searched for.
 *
 * "primary" — the topic is the candidate's FIRST Yelp category, which is the
 *   one Yelp treats as its main business.
 * "secondary" — present, but not first. Often still right: a trattoria whose
 *   first category is "Italian" genuinely does sell pizza.
 * "absent" — the topic does not appear at all. Usually a false positive, and
 *   occasionally the best place in town. Flagged, never removed.
 */
function relevance(
  aliases: string[],
  titles: string[],
  topicHint: string | null | undefined,
): "primary" | "secondary" | "absent" | null {
  const needle = topicHint?.trim().toLowerCase();
  if (!needle) return null;

  const haystack = [...aliases, ...titles].map((v) => v.toLowerCase());
  if (haystack.length === 0) return null;

  const matches = (value: string) =>
    value.includes(needle) || needle.includes(value);

  const firstAlias = aliases[0]?.toLowerCase();
  const firstTitle = titles[0]?.toLowerCase();
  if ((firstAlias && matches(firstAlias)) || (firstTitle && matches(firstTitle))) {
    return "primary";
  }
  return haystack.some(matches) ? "secondary" : "absent";
}

/** Metres to miles, one decimal — Yelp returns distance in metres. */
function formatDistance(metres: number | null): string | null {
  if (metres === null) return null;
  return `${(metres / 1609.344).toFixed(1)} mi`;
}

export function CandidateCard({
  candidate,
  selected,
  excluded,
  position,
  searchAreaLabel,
  topicHint,
  onToggle,
  onExclude,
}: CandidateCardProps) {
  const inputId = `candidate-${candidate.id}`;

  const distance = formatDistance(candidate.distance);
  const match = relevance(
    candidate.categoryAliases ?? [],
    candidate.categories,
    topicHint,
  );
  const inSearchArea =
    searchAreaLabel && candidate.city
      ? candidate.city.trim().toLowerCase() === searchAreaLabel.trim().toLowerCase()
      : null;

  return (
    <div
      className={`rounded-card border p-4 transition-colors ${
        excluded
          ? "border-line bg-sand-100 opacity-60"
          : selected
            ? "border-brand-500 bg-brand-50"
            : "border-line bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          id={inputId}
          type="checkbox"
          checked={selected}
          disabled={excluded}
          onChange={onToggle}
          className="mt-1 size-4 shrink-0 rounded border-line text-brand-600 focus:ring-2 focus:ring-brand-500"
        />

        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className="block cursor-pointer">
            <span className="flex items-center gap-2">
              {position ? (
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-navy-900 text-[11px] font-bold text-white">
                  {position}
                </span>
              ) : null}
              <span className="truncate text-sm font-bold text-navy-900">
                {candidate.name}
              </span>
            </span>
          </label>

          {/*
            Geography first, and prominent. This is the field most likely to
            make a candidate the wrong answer for a hyperlocal list.
          */}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {candidate.city ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                  inSearchArea === true
                    ? "bg-emerald-50 text-emerald-800"
                    : inSearchArea === false
                      ? "bg-amber-50 text-amber-800"
                      : "bg-sand-100 text-ink-700"
                }`}
              >
                <MapPin aria-hidden="true" className="size-3" />
                {candidate.city}
                {inSearchArea === true ? " — exact area" : null}
                {inSearchArea === false ? " — nearby" : null}
                {distance ? `, ${distance}` : null}
              </span>
            ) : null}
            {candidate.address ? (
              <span className="text-ink-500">
                {candidate.address}
                {candidate.zip ? ` · ${candidate.zip}` : ""}
              </span>
            ) : null}
          </p>

          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
            {candidate.county ? <span>{candidate.county}</span> : null}
            {candidate.displayPhone ?? candidate.phone ? (
              <span className="flex items-center gap-1">
                <Phone aria-hidden="true" className="size-3.5" />
                {candidate.displayPhone ?? candidate.phone}
              </span>
            ) : null}
          </p>

          {candidate.categories.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {candidate.categories.map((label, index) => (
                <span
                  key={`${label}-${index}`}
                  className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${
                    index === 0
                      ? "border-navy-200 bg-navy-50 text-navy-900"
                      : "border-line bg-white text-ink-700"
                  }`}
                  title={index === 0 ? "Yelp's primary category" : "Also listed under"}
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}

          {/*
            A qualification prompt, not a filter. Yelp returns bakeries and
            cafes for a pizza search, and the decision about whether one belongs
            on the list is editorial — but it should be a decision, not an
            oversight.
          */}
          {match === "absent" ? (
            <p className="mt-2 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900">
              Yelp does not list this under &ldquo;{topicHint}&rdquo; — check it
              belongs before including it.
            </p>
          ) : null}
          {match === "secondary" ? (
            <p className="mt-2 text-[11px] text-ink-500">
              &ldquo;{topicHint}&rdquo; is a secondary category here, not its
              main one.
            </p>
          ) : null}

          {/*
            Third-party signal, shown for research only. This is Yelp's rating,
            labelled as such — it is never stored on our business rows or
            presented on the public site as a LongIsland.io score.
          */}
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="flex items-center gap-1 text-ink-700">
              <Star aria-hidden="true" className="size-3.5 text-amber-500" />
              <span className="font-semibold">
                {candidate.rating !== null ? candidate.rating.toFixed(1) : "—"}
              </span>
              <span className="text-ink-400">
                ({candidate.reviewCount.toLocaleString()} reviews on Yelp)
              </span>
            </span>

            {candidate.yelpUrl ? (
              <a
                href={candidate.yelpUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline"
              >
                Research
                <ExternalLink aria-hidden="true" className="size-3" />
              </a>
            ) : null}

            <button
              type="button"
              onClick={onExclude}
              className="font-semibold text-ink-500 hover:text-red-600 hover:underline"
            >
              {excluded ? "Restore" : "Exclude"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
