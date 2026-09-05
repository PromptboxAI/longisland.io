import {
  SkeletonPageHeader,
  SkeletonRuleHeading,
  SkeletonTileGrid,
} from "@/components/ui/Skeleton";

/**
 * Skeleton for /categories.
 *
 * Safe to place here: this segment has no dynamic children, so the Suspense
 * boundary cannot swallow a `notFound()` and turn a 404 into a 200. See
 * src/app/best/(index)/loading.tsx for the case where that matters.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading categories</span>

      <SkeletonPageHeader />

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        {Array.from({ length: 3 }, (_, index) => (
          <section key={index}>
            <SkeletonRuleHeading />
            <div className="mt-6">
              <SkeletonTileGrid count={12} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
