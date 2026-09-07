import Link from "next/link";

import { EditorialImage } from "@/components/ui/EditorialImage";
import { resolveImage } from "@/lib/media/resolve";
import type { RankingSummary } from "@/types/database";

export interface RelatedLink {
  title: string;
  href: string;
}

export interface RankingCardProps {
  ranking: RankingSummary;
  /**
   * Feature variant only: the "Related Reviews" line beneath the dek.
   *
   * Supplied by the caller. This component renders what it is handed and never
   * decides what relates to what — that is an editorial choice, not a layout
   * one.
   */
  relatedItems?: RelatedLink[];
  /**
   * feature  — large lead card with image above the headline
   * standard — grid card with image
   * compact  — thumbnail + headline, for sidebars
   * text     — dateline + kicker + headline, no image, for "The Latest" rail
   */
  variant?: "feature" | "standard" | "compact" | "text";
  priority?: boolean;
}

export function RankingCard({
  ranking,
  relatedItems,
  variant = "standard",
  priority = false,
}: RankingCardProps) {
  const href = `/best/${ranking.slug}`;
  // The ranking's own hero, at whatever crop this variant asks for. One upload
  // feeds the feature, the cards and the rails.
  const image = resolveImage(ranking.hero_media, ranking.hero_image_url, ranking.title);
  /*
   * Short month on cards. The shared formatDate spells the month out, which is
   * right in an article dateline and too long in a kicker sat above a headline.
   */
  const dateline = ranking.published_at
    ? new Date(ranking.published_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;

  if (variant === "text") {
    return (
      <article className="border-b border-line pb-4 last:border-0">
        <p className="mb-1 text-xs leading-[25px]">
          {dateline ? <span className="text-ink-400">{dateline}</span> : null}
          {dateline && ranking.category ? (
            <span className="mx-1.5 text-ink-400">|</span>
          ) : null}
          {ranking.category ? (
            <Link
              href={`/category/${ranking.category.slug}`}
              className="relative z-10 font-semibold uppercase text-brand-600 hover:underline"
            >
              {ranking.category.name}
            </Link>
          ) : null}
        </p>
        <h3 className="headline text-[15px] text-navy-900">
          <Link href={href} className="hover:text-brand-600 hover:underline">
            {ranking.title}
          </Link>
        </h3>
        {ranking.author_name ? (
          <p className="mt-1 text-xs text-ink-500">by {ranking.author_name}</p>
        ) : null}
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className="group flex gap-3 border-b border-line py-3 last:border-0">
        <div className="relative size-16 shrink-0 overflow-hidden rounded">
          <EditorialImage
            src={image?.url ?? null}
            alt=""
            seed={ranking.slug}
            objectPosition={image?.objectPosition}
            sizes="64px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="headline text-sm text-navy-900">
            <Link href={href} className="hover:text-brand-600 hover:underline">
              {ranking.title}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-ink-500">
            {ranking.entry_count} places
            {ranking.geography ? ` · ${ranking.geography}` : ""}
          </p>
        </div>
      </article>
    );
  }

  const isFeature = variant === "feature";

  return (
    <article className="group relative">
      <div
        className={`relative overflow-hidden rounded-card border border-line ${
          isFeature ? "aspect-[16/9]" : "aspect-[16/10]"
        }`}
      >
        <EditorialImage
          src={image?.url ?? null}
          alt=""
          seed={ranking.slug}
          objectPosition={image?.objectPosition}
          priority={priority}
          fallbackLabel={ranking.category?.name}
          sizes={
            isFeature
              ? "(max-width: 1024px) 100vw, 50vw"
              : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          }
        />
      </div>

      <div className={isFeature ? "pt-4" : "pt-3"}>
        <p className="mb-1.5 text-xs leading-[25px]">
          {dateline ? <span className="text-ink-400">{dateline}</span> : null}
          {dateline && ranking.category ? (
            <span className="mx-1.5 text-ink-400">|</span>
          ) : null}
          {ranking.category ? (
            <Link
              href={`/category/${ranking.category.slug}`}
              className="relative z-10 font-semibold uppercase text-brand-600 hover:underline"
            >
              {ranking.category.name}
            </Link>
          ) : null}
        </p>

        <h3
          className={`headline text-navy-900 ${
            isFeature ? "text-2xl leading-[1.27] sm:text-[30px]" : "text-base"
          }`}
        >
          <Link href={href} className="after:absolute after:inset-0 hover:text-brand-600">
            {ranking.title}
          </Link>
        </h3>

        {ranking.description ? (
          <p
            className={`mt-2 text-ink-700 ${
              isFeature
                ? "max-w-2xl text-[15px] leading-[25px]"
                : "line-clamp-2 text-sm leading-relaxed"
            }`}
          >
            {ranking.description}
          </p>
        ) : null}

        <p className="mt-2 text-xs text-ink-500">
          <span className="font-semibold text-navy-900">
            {ranking.entry_count} {ranking.entry_count === 1 ? "place" : "places"}
          </span>
          {ranking.geography ? ` · ${ranking.geography}` : ""}
        </p>

        {/*
          * Related reviews rather than a button: the headline already covers the
          * whole card, so a call to action here would only repeat it, where
          * these send the reader somewhere the card cannot.
          */}
        {isFeature && relatedItems && relatedItems.length > 0 ? (
          <p className="mt-3 text-sm leading-[22px]">
            <span className="text-base font-bold text-navy-900">Related Reviews: </span>
            {relatedItems.map((item, index) => (
              <span key={item.href}>
                <Link
                  href={item.href}
                  className="relative z-10 font-bold text-brand-600 hover:underline"
                >
                  {item.title}
                </Link>
                {index < relatedItems.length - 1 ? (
                  <span className="text-ink-400">, </span>
                ) : null}
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </article>
  );
}
