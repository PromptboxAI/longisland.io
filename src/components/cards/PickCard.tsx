import Link from "next/link";

import { EditorialImage } from "@/components/ui/EditorialImage";

export interface PickCardProps {
  title: string;
  subtitle?: string | null;
  href: string;
  imageUrl?: string | null;
  imageSeed?: string;
  /**
   * Reads "Check Price" on commerce picks. Editorial picks pass their own
   * label — a price CTA over a ranking of local restaurants promises
   * something the page does not do.
   */
  ctaLabel?: string;
}

/**
 * Boxed pick card: framed white tile, contained image, brand line, descriptor,
 * pill action.
 *
 * Deliberately unlike RankingCard, which bleeds a photo edge to edge and leads
 * with a serif headline. This one is a merchandising unit — the subject sits
 * inside a white field the way a catalogue shot does, and the row reads as a
 * shelf of discrete things rather than as a page of stories.
 */
export function PickCard({
  title,
  subtitle,
  href,
  imageUrl,
  imageSeed,
  ctaLabel = "Check Price",
}: PickCardProps) {
  return (
    <article className="group relative flex flex-col rounded-card border border-line bg-white p-4 text-center transition-shadow hover:shadow-lift">
      <div className="relative mx-auto aspect-square w-full max-w-[170px] overflow-hidden">
        <EditorialImage
          src={imageUrl}
          alt=""
          seed={imageSeed ?? title}
          fit="contain"
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 170px"
        />
      </div>

      <h3 className="mt-4 text-[17px] font-semibold leading-snug text-navy-900">
        {/* Overlay makes the whole tile the target; the pill is the visual cue. */}
        <Link href={href} className="after:absolute after:inset-0">
          {title}
        </Link>
      </h3>

      {subtitle ? (
        <p className="mt-1 text-sm font-light leading-snug text-ink-700">{subtitle}</p>
      ) : null}

      {/* mt-auto pins the pill to the bottom so a row of cards aligns on it. */}
      <div className="mt-auto pt-4">
        <span
          aria-hidden="true"
          className="inline-flex h-10 items-center rounded-full bg-brand-600 px-6 text-base font-medium text-white transition-colors group-hover:bg-brand-700"
        >
          {ctaLabel}
        </span>
      </div>
    </article>
  );
}
