import Link from "next/link";

import type { RelatedLink } from "@/components/cards/RankingCard";
import { EditorialImage } from "@/components/ui/EditorialImage";

/**
 * The homepage lead, for any kind of content.
 *
 * The feature well used to be a `RankingCard`, which meant the most prominent
 * slot on the site could only hold a ranking. That card prints "N places" and
 * links its kicker to a local category — true of a ranking, meaningless for a
 * seasonal guide, and actively wrong for a buying guide.
 *
 * So this renders from what a curated item resolves to — a kicker, a headline,
 * a standfirst, a picture and a link — and nothing else. It cannot ask how many
 * places something has because it does not know what it is holding, which is
 * precisely the property the slot needs.
 *
 * Visually it is the previous feature variant, unchanged: same 16:9 frame, same
 * dateline row, same headline scale, same Related Reviews line. What changed is
 * what it is allowed to assume.
 */

export interface FeatureCardProps {
  href: string;
  headline: string;
  /** Small uppercase line above the headline — a category, a place, a kind. */
  kicker?: string | null;
  /** Optional link for the kicker. Plain text when absent. */
  kickerHref?: string | null;
  dek?: string | null;
  imageUrl?: string | null;
  imageAlt?: string;
  imageSeed?: string;
  objectPosition?: string;
  /** Publication date, already formatted by the caller. */
  dateline?: string | null;
  /**
   * A single factual line under the dek — "12 places · Suffolk County" for a
   * ranking, "8 picks" for a buying guide, nothing at all for an article.
   *
   * Supplied by the caller because only the caller knows what the thing is.
   */
  meta?: string | null;
  relatedItems?: RelatedLink[];
  priority?: boolean;
}

export function FeatureCard({
  href,
  headline,
  kicker,
  kickerHref,
  dek,
  imageUrl,
  imageAlt = "",
  imageSeed,
  objectPosition,
  dateline,
  meta,
  relatedItems,
  priority = false,
}: FeatureCardProps) {
  return (
    <article className="group relative">
      <div className="relative aspect-[16/9] overflow-hidden rounded-card border border-line">
        <EditorialImage
          src={imageUrl ?? null}
          alt={imageAlt}
          seed={imageSeed ?? headline}
          priority={priority}
          objectPosition={objectPosition}
          fallbackLabel={kicker ?? undefined}
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>

      <div className="pt-4">
        {dateline || kicker ? (
          <p className="mb-1.5 text-xs leading-[25px]">
            {dateline ? <span className="text-ink-400">{dateline}</span> : null}
            {dateline && kicker ? <span className="mx-1.5 text-ink-400">|</span> : null}
            {kicker ? (
              kickerHref ? (
                <Link
                  href={kickerHref}
                  className="relative z-10 font-semibold uppercase text-brand-600 hover:underline"
                >
                  {kicker}
                </Link>
              ) : (
                <span className="font-semibold uppercase text-brand-600">{kicker}</span>
              )
            ) : null}
          </p>
        ) : null}

        <h3 className="headline text-2xl leading-[1.27] text-navy-900 sm:text-[30px]">
          <Link href={href} className="after:absolute after:inset-0 hover:text-brand-600">
            {headline}
          </Link>
        </h3>

        {/*
          15px on phones, 17px from the small breakpoint up.
          
          The reference's 13px was copied here and read far too small — their
          figure comes with their body face and their column width, and lifting
          one number out of that arrangement does not carry the rest of it. 15px
          was right on a phone and slightly light on a wide screen, which is a
          breakpoint problem rather than a size problem, so the desktop step is
          where the correction goes.
        */}
        {dek ? (
          <p className="mt-2 max-w-2xl text-[15px] leading-[25px] text-ink-700 sm:text-[17px] sm:leading-[28px]">
            {dek}
          </p>
        ) : null}

        {meta ? <p className="mt-2 text-xs text-ink-500">{meta}</p> : null}

        {/*
          Related reviews rather than a button: the headline already covers the
          whole card, so a call to action here would only repeat it, where these
          send the reader somewhere the card cannot.
        */}
        {relatedItems && relatedItems.length > 0 ? (
          /*
            A box rather than a run-on sentence.
            
            As a bare line of comma-separated links it read as the last clause
            of the standfirst, and the feature ran straight into the rail below
            it with nothing marking where one ended and the next began. Given an
            edge and a ground of its own it does the job it was always meant to
            do — close the lead story and hold the two sections apart.
          */
          <div className="mt-5 rounded-card border border-line bg-sand-50 px-4 py-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
              Related Reviews
            </p>
            <ul className="mt-2 space-y-1.5">
              {relatedItems.map((item) => (
                <li key={item.href} className="text-sm leading-snug">
                  <Link
                    href={item.href}
                    className="relative z-10 font-semibold text-brand-600 hover:underline"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  );
}
