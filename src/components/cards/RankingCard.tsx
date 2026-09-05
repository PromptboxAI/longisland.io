import Link from "next/link";

import { formatDate } from "@/components/editorial/EditorialDisclosure";
import { EditorialImage } from "@/components/ui/EditorialImage";
import type { RankingSummary } from "@/types/database";

export interface RankingCardProps {
  ranking: RankingSummary;
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
  variant = "standard",
  priority = false,
}: RankingCardProps) {
  const href = `/best/${ranking.slug}`;
  const dateline = ranking.published_at
    ? formatDate(new Date(ranking.published_at))
    : null;

  if (variant === "text") {
    return (
      <article className="border-b border-line pb-4 last:border-0">
        <p className="meta mb-1">
          {dateline ? <span>{dateline}</span> : null}
          {dateline && ranking.category ? <span className="mx-1.5">|</span> : null}
          {ranking.category ? (
            <span className="text-brand-600">{ranking.category.name}</span>
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
            src={ranking.hero_image_url}
            alt=""
            seed={ranking.slug}
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
          src={ranking.hero_image_url}
          alt=""
          seed={ranking.slug}
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
        <p className="meta mb-1.5">
          {dateline ? <span>{dateline}</span> : null}
          {dateline && ranking.category ? <span className="mx-1.5">|</span> : null}
          {ranking.category ? (
            <span className="text-brand-600">{ranking.category.name}</span>
          ) : null}
        </p>

        <h3
          className={`headline text-navy-900 ${
            isFeature ? "text-[26px] sm:text-[40px]" : "text-base"
          }`}
        >
          <Link href={href} className="after:absolute after:inset-0 hover:text-brand-600">
            {ranking.title}
          </Link>
        </h3>

        {ranking.description ? (
          <p
            className={`mt-2 leading-relaxed text-ink-700 ${
              isFeature ? "max-w-2xl text-base sm:text-[17px]" : "line-clamp-2 text-sm"
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
          * The headline already covers the whole card via its inset overlay, so
          * this sits above it only to give the lead well an explicit action.
          */}
        {isFeature ? (
          <Link
            href={href}
            tabIndex={-1}
            aria-hidden="true"
            className="relative z-10 mt-4 inline-flex items-center rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
          >
            Read the ranking
          </Link>
        ) : null}
      </div>
    </article>
  );
}
