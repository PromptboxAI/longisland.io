import { PRODUCT_BADGES } from "@/types/products";
import type { ProductRankingEntryWithProduct } from "@/types/products";

export interface ProductQuickPickProps {
  entries: ProductRankingEntryWithProduct[];
}

/**
 * The quick-picks rail at the top of a guide — "Our Pick", "Best Value",
 * "Best Premium" and so on.
 *
 * Only badged entries appear, in the curated badge order rather than in ranking
 * order, so the rail reads as a set of answers to different questions instead of
 * a second copy of the list below it. Each pick anchors to its full entry.
 *
 * Renders nothing when no entry is badged: a rail of one item is noise, and an
 * empty one implies the editor forgot something rather than chose not to.
 */
export function ProductQuickPick({ entries }: ProductQuickPickProps) {
  const badgeOrder = new Map<string, number>(
    PRODUCT_BADGES.map((badge, index) => [badge, index]),
  );

  const picks = entries
    .filter((entry) => entry.badge)
    .sort((a, b) => {
      // Unknown badges are editor free-text; they sort after the curated set,
      // then by ranking position so the order is still deterministic.
      const rankA = badgeOrder.get(a.badge as string) ?? PRODUCT_BADGES.length;
      const rankB = badgeOrder.get(b.badge as string) ?? PRODUCT_BADGES.length;
      return rankA === rankB ? a.position - b.position : rankA - rankB;
    });

  if (picks.length < 2) return null;

  return (
    <section aria-labelledby="quick-picks">
      <h2
        id="quick-picks"
        className="meta"
      >
        Our picks at a glance
      </h2>

      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {picks.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#product-${entry.position}`}
              className="group flex h-full flex-col rounded-card border border-line bg-white p-4 transition-colors hover:border-brand-500"
            >
              <span className="meta text-brand-600">
                {entry.badge}
              </span>
              <span className="headline mt-1.5 text-navy-900 group-hover:text-brand-600">
                {entry.product.name}
              </span>
              {entry.best_for ? (
                <span className="mt-1 text-xs leading-relaxed text-ink-500">
                  {entry.best_for}
                </span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
