/**
 * Route-level skeleton.
 *
 * Mirrors the shape most pages share — a tinted page header followed by a card
 * grid — so the layout does not jump when real content arrives.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      <div className="border-b border-line bg-sand-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="h-3 w-48 animate-pulse rounded bg-navy-100" />
          <div className="mt-4 h-9 w-2/3 max-w-xl animate-pulse rounded bg-navy-100" />
          <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded bg-navy-100" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index}>
              <div className="aspect-[16/10] animate-pulse rounded-card bg-navy-100" />
              <div className="mt-3 h-3 w-24 animate-pulse rounded bg-navy-100" />
              <div className="mt-2.5 h-4 w-full animate-pulse rounded bg-navy-100" />
              <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-navy-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
