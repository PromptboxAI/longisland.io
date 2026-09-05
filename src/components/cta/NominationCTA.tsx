import { ArrowRight } from "lucide-react";
import Link from "next/link";

export interface NominationCTAProps {
  /** "band" is the full-width homepage section; "inline" sits inside an article. */
  variant?: "band" | "inline";
  heading?: string;
  copy?: string;
}

export function NominationCTA({
  variant = "band",
  heading = "Long Islanders know Long Island best.",
  copy = "Think we missed one? Nominate your favorite restaurant, business, attraction or hidden gem.",
}: NominationCTAProps) {
  if (variant === "inline") {
    return (
      <aside className="rounded-card border border-navy-100 bg-sand-50 p-6">
        <h2 className="text-lg font-semibold text-navy-900">Think we missed one?</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">{copy}</p>
        <Link
          href="/nominate"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-800"
        >
          Nominate a business
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </aside>
    );
  }

  return (
    <section className="bg-navy-900">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
        <h2 className="text-3xl text-white sm:text-4xl">{heading}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-navy-200">
          {copy}
        </p>
        <Link
          href="/nominate"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold-400 px-7 py-3.5 text-sm font-semibold text-navy-950 transition-colors hover:bg-gold-300"
        >
          Nominate a Business
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </section>
  );
}
