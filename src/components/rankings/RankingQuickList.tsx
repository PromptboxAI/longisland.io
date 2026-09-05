import type { RankingEntryWithBusiness } from "@/types/database";

export interface RankingQuickListProps {
  entries: RankingEntryWithBusiness[];
  title?: string;
}

/**
 * Jump list of every ranked business, anchored to the entries below.
 *
 * Anchors rather than links: readers scanning a top-ten want to get to #7
 * without leaving the page.
 */
export function RankingQuickList({
  entries,
  title = "The quick list",
}: RankingQuickListProps) {
  if (entries.length === 0) return null;

  return (
    <nav
      aria-labelledby="quick-list"
      className="rounded-card border border-line bg-sand-50 p-5"
    >
      <h2
        id="quick-list"
        className="text-sm font-bold uppercase tracking-wider text-navy-900"
      >
        {title}
      </h2>
      <ol className="mt-3 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
        {entries.map((entry) => (
          <li key={entry.id} className="flex gap-2.5 text-sm">
            <span className="w-5 shrink-0 text-right font-bold text-ink-400">
              {entry.position}.
            </span>
            <a
              href={`#entry-${entry.position}`}
              className="font-medium text-brand-600 hover:underline"
            >
              {entry.business.name}
            </a>
            {entry.badge ? (
              <span className="hidden text-xs text-ink-400 sm:inline">
                — {entry.badge}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
