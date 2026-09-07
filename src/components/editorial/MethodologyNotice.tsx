import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { EDITORIAL_INDEPENDENCE_NOTICE } from "@/lib/site";

/**
 * What we say when a ranking has not written its own methodology.
 *
 * The previous default claimed "our own on-the-ground research", which for a
 * list assembled from public sources and editorial review is simply untrue —
 * and it was the DEFAULT, so it appeared on every ranking nobody had written a
 * methodology for. A claim about first-hand experience is the one thing a
 * default must never make on our behalf.
 *
 * Visits, tasting, testing and interviews get claimed by an editor writing them
 * into a specific ranking's methodology, for a ranking where they happened.
 */
export const DEFAULT_METHODOLOGY =
  "We research local businesses using publicly available information, " +
  "consumer reputation, review volume, local relevance and other available " +
  "business information. Our editorial team then reviews the candidates and " +
  "independently selects and orders the businesses included in each list.";

export interface MethodologyNoticeProps {
  /** The ranking's own methodology text, when it has one. */
  methodology?: string | null;
  /** "banner" sits under a headline; "section" is the full "How We Chose" block. */
  variant?: "banner" | "section";
}

/**
 * Visible disclosure of how a list was produced.
 *
 * This is a trust surface, not decoration — it appears near the top of every
 * ranking page and again in full at the bottom.
 */
export function MethodologyNotice({
  methodology,
  variant = "banner",
}: MethodologyNoticeProps) {
  if (variant === "banner") {
    return (
      <div className="flex gap-3 rounded-card border border-brand-200 bg-brand-50 p-4">
        <ShieldCheck
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-brand-600"
        />
        <div className="text-sm leading-relaxed text-ink-700">
          <p>
            <span className="font-semibold text-navy-900">How we chose:</span>{" "}
            {methodology
              ? truncate(methodology, 220)
              : "Independently researched and editorially ranked by the LongIsland.io team."}
          </p>
          <p className="mt-1.5 text-xs text-ink-500">
            {EDITORIAL_INDEPENDENCE_NOTICE}{" "}
            <Link
              href="/methodology"
              className="text-brand-600 underline underline-offset-2"
            >
              Full methodology
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="how-we-chose"
      className="rounded-card border border-navy-100 bg-sand-50 p-6 sm:p-8"
    >
      <h2 id="how-we-chose" className="text-xl font-semibold text-navy-900">
        How we chose
      </h2>
      <div className="prose-editorial mt-3 text-sm">
        <p>
          {methodology ?? DEFAULT_METHODOLOGY}
        </p>
        <p>
          Rankings are editorial judgments, not objective guarantees. Lists are
          updated as places change, close or improve. If something here is wrong,
          tell us — we publish corrections.
        </p>
      </div>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link
          href="/methodology"
          className="font-semibold text-brand-600 hover:text-brand-800"
        >
          Read our full methodology
        </Link>
        <Link href="/nominate" className="font-semibold text-brand-600 hover:text-brand-800">
          Nominate a business
        </Link>
        <Link href="/contact" className="font-semibold text-brand-600 hover:text-brand-800">
          Submit a correction
        </Link>
      </div>
      <p className="mt-5 border-t border-navy-100 pt-4 text-xs leading-relaxed text-ink-500">
        {EDITORIAL_INDEPENDENCE_NOTICE}
      </p>
    </section>
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}
