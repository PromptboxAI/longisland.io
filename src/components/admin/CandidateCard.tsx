"use client";

import { ExternalLink, MapPin, Phone, Star } from "lucide-react";

import type { YelpBusiness } from "@/lib/yelp/types";

export interface CandidateCardProps {
  candidate: YelpBusiness;
  selected: boolean;
  excluded: boolean;
  position?: number;
  onToggle: () => void;
  onExclude: () => void;
}

export function CandidateCard({
  candidate,
  selected,
  excluded,
  position,
  onToggle,
  onExclude,
}: CandidateCardProps) {
  const inputId = `candidate-${candidate.id}`;

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

          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
            {candidate.city ? (
              <span className="flex items-center gap-1">
                <MapPin aria-hidden="true" className="size-3.5" />
                {candidate.city}
                {candidate.county ? `, ${candidate.county}` : ""}
              </span>
            ) : null}
            {candidate.displayPhone ?? candidate.phone ? (
              <span className="flex items-center gap-1">
                <Phone aria-hidden="true" className="size-3.5" />
                {candidate.displayPhone ?? candidate.phone}
              </span>
            ) : null}
          </p>

          {candidate.categories.length > 0 ? (
            <p className="mt-1.5 text-xs text-ink-500">
              {candidate.categories.join(" · ")}
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
