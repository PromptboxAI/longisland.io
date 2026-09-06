import { Info } from "lucide-react";
import Link from "next/link";

import { AFFILIATE_DISCLOSURE, AFFILIATE_DISCLOSURE_LONG } from "@/lib/affiliate";

export interface AffiliateDisclosureProps {
  /**
   * "banner" sits above the content, "inline" tucks under a module heading,
   * "section" is the full block for the foot of a guide.
   */
  variant?: "banner" | "inline" | "section";
  /** Network-required wording for the merchants actually linked on this page. */
  merchantNotes?: string[];
}

/**
 * Visible disclosure that links on this page may earn a commission.
 *
 * Rendered from the presence of a tagged link rather than from the page type
 * (see `hasAffiliateLinks`), so it cannot drift out of sync with the links it is
 * disclosing: a guide that gains its first affiliate offer starts disclosing
 * without anyone editing a template, and one whose offers are all untagged does
 * not claim a commercial relationship it does not have.
 */
export function AffiliateDisclosure({
  variant = "banner",
  merchantNotes = [],
}: AffiliateDisclosureProps) {
  if (variant === "inline") {
    return (
      <div className="text-xs leading-relaxed text-ink-500">
        <p>
          {AFFILIATE_DISCLOSURE}{" "}
          <Link
            href="/affiliate-disclosure"
            className="text-brand-600 underline underline-offset-2"
          >
            How this works
          </Link>
        </p>
        {/*
          Network-required wording renders in every variant that is given it.
          This one used to accept merchantNotes and drop them, which meant the
          Amazon Associates sentence went missing wherever the inline form was
          used — the one place the network requires it is beside the links.
        */}
        {merchantNotes.length > 0 ? (
          <p className="mt-1">{merchantNotes.join(" ")}</p>
        ) : null}
      </div>
    );
  }

  if (variant === "section") {
    return (
      <section
        aria-labelledby="affiliate-disclosure"
        className="rounded-card border border-navy-100 bg-sand-50 p-6 sm:p-8"
      >
        <h2 id="affiliate-disclosure" className="text-xl font-semibold text-navy-900">
          How we make money
        </h2>
        <div className="prose-editorial mt-3 text-sm">
          <p>{AFFILIATE_DISCLOSURE_LONG}</p>
          {merchantNotes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
        <Link
          href="/affiliate-disclosure"
          className="mt-5 inline-block text-sm font-semibold text-brand-600 hover:text-brand-800"
        >
          Read our full affiliate disclosure
        </Link>
      </section>
    );
  }

  return (
    <div className="flex gap-3 rounded-card border border-gold-200 bg-gold-50 p-4">
      <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-gold-600" />
      <div className="text-sm leading-relaxed text-ink-700">
        <p>
          <span className="font-semibold text-navy-900">Disclosure:</span>{" "}
          {AFFILIATE_DISCLOSURE}{" "}
          <Link
            href="/affiliate-disclosure"
            className="text-brand-600 underline underline-offset-2"
          >
            How this works
          </Link>
        </p>
        {merchantNotes.length > 0 ? (
          <p className="mt-1.5 text-xs text-ink-500">{merchantNotes.join(" ")}</p>
        ) : null}
      </div>
    </div>
  );
}
