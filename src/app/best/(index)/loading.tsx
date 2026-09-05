import {
  SkeletonCardGrid,
  SkeletonChipRow,
  SkeletonPageHeader,
  SkeletonRuleHeading,
} from "@/components/ui/Skeleton";

/**
 * Skeleton for /best.
 *
 * WHY THE ROUTE GROUP: a `loading.tsx` wraps its own segment *and every child
 * below it* in a Suspense boundary. Placed at `src/app/best/`, it would also
 * wrap `/best/[slug]`, flushing a 200 shell before that page runs — and
 * `notFound()` can then only swap the UI, not the status, so a missing ranking
 * would answer 200 instead of 404. That soft-404 is what removing the root
 * loading.tsx fixed.
 *
 * The `(index)` group carries no URL segment, so this file still serves /best,
 * but `[slug]` sits outside the group and keeps its real 404.
 *
 * Any future skeleton must follow the same rule: never add one to a segment
 * that has a dynamic child which can call `notFound()`.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading rankings</span>

      <SkeletonPageHeader />

      {/* Category, location and sort filter rows. */}
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6 lg:px-8">
          <SkeletonChipRow count={7} />
          <SkeletonChipRow count={8} />
          <SkeletonChipRow count={3} />
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        {Array.from({ length: 3 }, (_, index) => (
          <section key={index}>
            <SkeletonRuleHeading />
            <div className="mt-7">
              <SkeletonCardGrid count={4} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
