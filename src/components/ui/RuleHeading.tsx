import Link from "next/link";

export interface RuleHeadingProps {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  id?: string;
  /**
   * @deprecated No longer read. Every section heading is set in caps by
   * .section-heading; the prop stays so existing callsites keep compiling.
   */
  uppercase?: boolean;
  size?: "sm" | "md" | "lg";
}

/**
 * Section heading with a short aqua rule above it.
 *
 * This is the site's repeating structural motif — it opens every band on the
 * homepage, every module on a category or place page, and each rail heading.
 *
 * Set in the sans, in caps: it labels a section rather than speaking as one,
 * so it must stay quieter than the serif headlines it sits above.
 */
export function RuleHeading({
  title,
  description,
  href,
  linkLabel = "View all",
  id,
  size = "md",
}: RuleHeadingProps) {
  /* Sizes measured against the reference: 22px on rails, 30px on bands. */
  const sizes = {
    sm: "text-lg sm:text-[22px]",
    md: "text-2xl sm:text-3xl",
    lg: "text-2xl sm:text-3xl",
  } as const;

  return (
    <div className="rule-heading flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      {/*
        The measure is set on the heading block, and the standfirst under it was
        inheriting a 3xl box at 14px — so a sentence that fits the page easily
        broke onto a second line well before reaching the edge. Wider, and one
        step up in size: it is the line that explains the section, and it was
        set smaller than the body copy it introduces.
      */}
      <div className="max-w-4xl">
        <h2
          id={id}
          className={`section-heading ${sizes[size]}`}
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-base leading-relaxed text-ink-700 sm:text-[17px]">
            {description}
          </p>
        ) : null}
      </div>

      {href ? (
        <Link
          href={href}
          className="shrink-0 text-sm font-semibold text-brand-600 hover:underline"
        >
          {linkLabel} &rsaquo;
        </Link>
      ) : null}
    </div>
  );
}
