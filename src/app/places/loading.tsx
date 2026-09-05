import {
  SkeletonChipRow,
  SkeletonPageHeader,
  SkeletonPlaceGrid,
  SkeletonRuleHeading,
} from "@/components/ui/Skeleton";

/**
 * Skeleton for /places.
 *
 * Safe to place here: this segment has no dynamic children. The town pages live
 * under /place/[slug], a separate segment, so this boundary never wraps a route
 * that can call `notFound()`.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading places</span>

      <SkeletonPageHeader />

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        {/* Counties, then regions. */}
        <section>
          <SkeletonRuleHeading />
          <div className="mt-6">
            <SkeletonPlaceGrid count={4} />
          </div>
        </section>

        <section>
          <SkeletonRuleHeading />
          <div className="mt-6">
            <SkeletonPlaceGrid count={8} />
          </div>
        </section>

        {/* Nassau and Suffolk town chips. */}
        {Array.from({ length: 2 }, (_, index) => (
          <section key={index}>
            <SkeletonRuleHeading />
            <div className="mt-5">
              <SkeletonChipRow count={14} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
