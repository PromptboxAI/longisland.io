import { EditorialImage } from "@/components/ui/EditorialImage";
import { resolveImage } from "@/lib/media/resolve";
import type { RankingEntryWithBusiness } from "@/types/database";

export interface RankingQuickListProps {
  entries: RankingEntryWithBusiness[];
  title?: string;
}

/**
 * Jump list of every ranked business, anchored to the entries below.
 *
 * Anchors rather than links: a reader scanning a top ten wants to reach #7
 * without leaving the page.
 *
 * It now carries each business's own photo — the same one the full entry uses,
 * from the business record, never a per-list copy. A list of ten names is a
 * table of contents; a list of ten faces is the reason to keep reading, and it
 * is the first thing under the byline now that the methodology banner has gone.
 *
 * Deliberately NOT a comparison table. Best for and the editorial reasoning
 * belong in the full entry, and repeating them here would mean reading the list
 * twice — so a row carries only what identifies a place: its position, its
 * photo, its name, and a badge if it has earned one.
 */
export function RankingQuickList({
  entries,
  title = "The quick list",
}: RankingQuickListProps) {
  if (entries.length === 0) return null;

  return (
    <nav aria-labelledby="quick-list">
      <h2
        id="quick-list"
        className="text-sm font-bold uppercase tracking-wider text-navy-900"
      >
        {title}
      </h2>

      <ol className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {entries.map((entry) => {
          const image = resolveImage(
            entry.business.primary_media ?? null,
            entry.business.primary_image_url,
            entry.business.name,
          );

          return (
            <li key={entry.id}>
              {/*
                The whole row is the target. A 48px thumbnail beside a name is a
                small tap area; the row is a comfortable one.
              */}
              <a
                href={`#entry-${entry.position}`}
                className="group flex items-center gap-3 rounded-md border border-transparent px-2 py-2 transition-colors hover:border-line hover:bg-sand-50"
              >
                <span className="w-5 shrink-0 text-right font-mono text-sm font-bold tabular-nums text-ink-400">
                  {entry.position}
                </span>

                <span className="relative size-12 shrink-0 overflow-hidden rounded border border-line">
                  <EditorialImage
                    src={image?.url ?? null}
                    alt=""
                    seed={entry.business.slug}
                    objectPosition={image?.objectPosition}
                    sizes="48px"
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-navy-900 group-hover:text-brand-600">
                    {entry.business.name}
                  </span>
                  {entry.business.city ? (
                    <span className="block truncate text-xs text-ink-500">
                      {entry.business.city}
                    </span>
                  ) : null}
                </span>

                {entry.badge ? (
                  <span className="hidden shrink-0 rounded-full bg-navy-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-400 sm:inline-block">
                    {entry.badge}
                  </span>
                ) : null}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
