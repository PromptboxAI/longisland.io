import Link from "next/link";

import { EditorialImage } from "@/components/ui/EditorialImage";
import { EditorialEmpty } from "@/components/ui/EditorialEmpty";
import { RuleHeading } from "@/components/ui/RuleHeading";
import { resolveImageUrl } from "@/lib/media/resolve";
import type { RankingSummary } from "@/types/database";

/**
 * Which feed the rail is showing.
 *
 * "deals" is declared but not yet wired: the product and affiliate work lives
 * on another branch, and this branch must not carry offer logic or invent
 * offers. Declaring the mode now is the point — when that branch lands it
 * supplies items and flips the mode, and the homepage composition is unchanged.
 */
export type TopRailMode = "rankings" | "deals";

export interface TopRailItem {
  id: string;
  title: string;
  href: string;
  imageUrl?: string | null;
  imageSeed?: string;
  /** Free-form supporting line: place counts today, price or merchant later. */
  detail?: string | null;
}

export interface TopRailProps {
  mode?: TopRailMode;
  items?: TopRailItem[];
  /** Overrides the mode's default title. */
  title?: string;
  id?: string;
  href?: string;
  linkLabel?: string;
}

const MODE_DEFAULTS: Record<
  TopRailMode,
  { title: string; emptyTitle: string; href: string; linkLabel: string }
> = {
  rankings: {
    title: "Top Rankings",
    emptyTitle: "Our first ranked lists are being reported now.",
    href: "/best",
    linkLabel: "All rankings",
  },
  deals: {
    title: "Top Deals",
    emptyTitle: "Local offers worth your money will appear here.",
    href: "/best",
    linkLabel: "Browse guides",
  },
};

/** Adapts a ranking into the rail's shape. Deals will get their own adapter. */
export function rankingsToRailItems(
  rankings: RankingSummary[],
): TopRailItem[] {
  return rankings.map((ranking) => ({
    id: ranking.id,
    title: ranking.title,
    href: `/best/${ranking.slug}`,
    imageUrl: resolveImageUrl(ranking.hero_media, ranking.hero_image_url),
    imageSeed: ranking.slug,
    detail: [
      `${ranking.entry_count} ${ranking.entry_count === 1 ? "place" : "places"}`,
      ranking.geography,
    ]
      .filter(Boolean)
      .join(" · "),
  }));
}

/**
 * The homepage's right-hand rail: a short numbered leaderboard.
 *
 * Numbered rather than plain, because "top" is the whole promise of the rail —
 * the rank is the information, so it is set as the loudest element in the row.
 */
export function TopRail({
  mode = "rankings",
  items = [],
  title,
  id = "top-rail",
  href,
  linkLabel,
}: TopRailProps) {
  const defaults = MODE_DEFAULTS[mode];

  return (
    <aside aria-labelledby={id}>
      <RuleHeading
        id={id}
        title={title ?? defaults.title}
        size="sm"
        href={items.length > 0 ? (href ?? defaults.href) : undefined}
        linkLabel={linkLabel ?? defaults.linkLabel}
      />

      {items.length === 0 ? (
        <div className="mt-4">
          <EditorialEmpty
            variant="rail"
            title={defaults.emptyTitle}
            href={defaults.href}
            linkLabel={defaults.linkLabel}
          />
        </div>
      ) : (
        <ol className="mt-4">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="group flex gap-3 border-b border-line py-3 last:border-0"
            >
              <span
                aria-hidden="true"
                className="headline w-5 shrink-0 pt-0.5 text-lg text-gold-400"
              >
                {index + 1}
              </span>
              <div className="relative size-14 shrink-0 overflow-hidden rounded">
                <EditorialImage
                  src={item.imageUrl}
                  alt=""
                  seed={item.imageSeed ?? item.title}
                  sizes="56px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="headline text-sm text-navy-900">
                  <Link
                    href={item.href}
                    className="hover:text-brand-600 hover:underline"
                  >
                    {item.title}
                  </Link>
                </h3>
                {item.detail ? (
                  <p className="mt-1 text-xs text-ink-500">{item.detail}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
