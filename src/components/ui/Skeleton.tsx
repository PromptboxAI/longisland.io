/**
 * Loading skeleton primitives.
 *
 * These mirror the real page shapes closely enough that content does not jump
 * when it arrives. They are decorative: the surrounding `loading.tsx` carries
 * the single `aria-busy` region and the screen-reader announcement, so nothing
 * here is exposed to assistive tech.
 */

const PULSE = "animate-pulse rounded bg-navy-100";

/** The tinted band at the top of an index page: eyebrow, H1, standfirst. */
export function SkeletonPageHeader() {
  return (
    <div className="border-b border-line bg-sand-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className={`h-3 w-40 ${PULSE}`} />
        <div className={`mt-4 h-9 w-2/3 max-w-md ${PULSE}`} />
        <div className={`mt-3 h-4 w-full max-w-2xl ${PULSE}`} />
        <div className={`mt-2 h-4 w-3/4 max-w-xl ${PULSE}`} />
      </div>
    </div>
  );
}

/** A rule-topped section heading. */
export function SkeletonRuleHeading() {
  return (
    <div className="rule-heading">
      <div className={`h-6 w-56 ${PULSE}`} />
      <div className={`mt-2 h-4 w-full max-w-lg ${PULSE}`} />
    </div>
  );
}

/** A row of pill-shaped filters or town links. */
export function SkeletonChipRow({ count = 8 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`h-8 w-28 rounded-full ${PULSE}`} />
      ))}
    </div>
  );
}

/** Editorial cards: image, kicker, headline, standfirst. */
export function SkeletonCardGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <div className={`aspect-[16/10] rounded-card ${PULSE}`} />
          <div className={`mt-3 h-3 w-24 ${PULSE}`} />
          <div className={`mt-2.5 h-4 w-full ${PULSE}`} />
          <div className={`mt-2 h-4 w-3/4 ${PULSE}`} />
        </div>
      ))}
    </div>
  );
}

/** The dense category tile grid. */
export function SkeletonTileGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`h-24 rounded-card sm:h-28 ${PULSE}`} />
      ))}
    </div>
  );
}

/** Large geography cards. */
export function SkeletonPlaceGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`aspect-[4/3] rounded-card ${PULSE}`} />
      ))}
    </div>
  );
}
