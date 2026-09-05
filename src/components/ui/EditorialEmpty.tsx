import Link from "next/link";

export interface EditorialEmptyProps {
  /**
   * feature — the large lead well, kept at full size so the page keeps its
   *           three-column composition before the first ranking is published
   * rail    — a sidebar column, one quiet line
   * band    — a full-width section body
   */
  variant?: "feature" | "rail" | "band";
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}

/**
 * Placeholder for editorial slots that have no published content yet.
 *
 * These deliberately hold their slot's full size rather than collapsing: the
 * homepage should read as a publication between issues, not as a broken page.
 * They never explain the system state — a reader does not care that a table is
 * empty — and never invent a headline that could be mistaken for real content.
 */
export function EditorialEmpty({
  variant = "band",
  eyebrow,
  title,
  description,
  href,
  linkLabel,
}: EditorialEmptyProps) {
  if (variant === "rail") {
    return (
      <div className="border-t border-line pt-4">
        <p className="text-sm leading-relaxed text-ink-500">{title}</p>
        {href && linkLabel ? (
          <Link
            href={href}
            className="mt-2 inline-block text-sm font-semibold text-brand-600 hover:underline"
          >
            {linkLabel} &rsaquo;
          </Link>
        ) : null}
      </div>
    );
  }

  if (variant === "feature") {
    /*
     * Min-height rather than an aspect box on small screens: the copy is taller
     * than 16/10 at 375px, and a fixed ratio clipped the kicker and the top of
     * the headline. The ratio returns once there is room for it.
     */
    return (
      <div className="relative flex min-h-[23rem] flex-col justify-end overflow-hidden rounded-card bg-gradient-to-br from-navy-900 via-navy-800 to-brand-800 p-7 sm:aspect-[16/9] sm:min-h-0 sm:p-10">
        {/* Same dotted wash the image fallback uses, so empty slots match. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:14px_14px]"
        />
        <div className="relative max-w-xl">
          {eyebrow ? <p className="eyebrow text-gold-400">{eyebrow}</p> : null}
          <p className="headline mt-2 text-2xl text-white sm:text-4xl">{title}</p>
          {description ? (
            <p className="mt-3 text-sm leading-relaxed text-navy-100 sm:text-base">
              {description}
            </p>
          ) : null}
          {href && linkLabel ? (
            <Link
              href={href}
              className="mt-5 inline-flex items-center rounded-full bg-gold-400 px-6 py-2.5 text-sm font-semibold text-navy-950 transition-colors hover:bg-gold-300"
            >
              {linkLabel}
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-card bg-sand-50 px-6 py-14 text-center">
      <p className="headline text-lg text-navy-900">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
          {description}
        </p>
      ) : null}
      {href && linkLabel ? (
        <Link
          href={href}
          className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline"
        >
          {linkLabel} &rsaquo;
        </Link>
      ) : null}
    </div>
  );
}
