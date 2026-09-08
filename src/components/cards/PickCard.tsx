import Link from "next/link";

import { EditorialImage } from "@/components/ui/EditorialImage";

export interface PickCardProps {
  title: string;
  subtitle?: string | null;
  href: string;
  imageUrl?: string | null;
  imageSeed?: string;
}

/**
 * Boxed pick card: framed white tile, contained image, headline, descriptor.
 *
 * Deliberately unlike RankingCard, which bleeds a photo edge to edge and leads
 * with a serif headline. This one is a merchandising unit — the subject sits
 * inside a white field the way a catalogue shot does, and the row reads as a
 * shelf of discrete things rather than as a page of stories.
 *
 * EDITORIAL ONLY, AND THEREFORE NO CTA BUTTON. Every destination that can reach
 * this card is a page we publish — a ranking, a buying guide, a business, a
 * category, a place. The image and the headline are the links to it, which is
 * all an editorial card owes the reader.
 *
 * A commerce CTA ("Check Price", "Shop Now") states that the next click reaches
 * a merchant with a price on it. That is true of an actual product offer and
 * false of an article about products, so those buttons belong to
 * `products/ProductOfferButton` — which renders one per real offer, with the
 * merchant named and the affiliate disclosure and rel attributes attached.
 * Do not reintroduce a CTA prop here.
 */
export function PickCard({ title, subtitle, href, imageUrl, imageSeed }: PickCardProps) {
  return (
    <article className="group relative flex flex-col rounded-card border border-line bg-white p-5 pb-6 text-center shadow-card transition-shadow hover:shadow-lift">
      <div className="relative mx-auto aspect-square w-full max-w-[170px] overflow-hidden">
        <EditorialImage
          src={imageUrl}
          alt=""
          seed={imageSeed ?? title}
          fit="contain"
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 170px"
        />
      </div>

      <h3 className="mt-5 text-[17px] font-semibold leading-snug text-navy-900">
        {/* The stretched link makes the image and the whole tile the target. */}
        <Link
          href={href}
          className="after:absolute after:inset-0 group-hover:text-brand-600"
        >
          {title}
        </Link>
      </h3>

      {subtitle ? (
        <p className="mt-1 pb-1 text-sm font-light leading-snug text-ink-700">
          {subtitle}
        </p>
      ) : null}
    </article>
  );
}
