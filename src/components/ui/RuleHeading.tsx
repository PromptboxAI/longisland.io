import Link from "next/link";

export interface RuleHeadingProps {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  id?: string;
  /** Section titles are set in caps; sidebar rails are not. */
  uppercase?: boolean;
  size?: "sm" | "md" | "lg";
}

/**
 * Section heading with a short aqua rule above it.
 *
 * This is the site's repeating structural motif — it opens every band on the
 * homepage, every module on a category or place page, and each rail heading.
 */
export function RuleHeading({
  title,
  description,
  href,
  linkLabel = "View all",
  id,
  uppercase = false,
  size = "md",
}: RuleHeadingProps) {
  const sizes = {
    sm: "text-base",
    md: "text-xl sm:text-2xl",
    lg: "text-2xl sm:text-3xl",
  } as const;

  return (
    <div className="rule-heading flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="max-w-3xl">
        <h2
          id={id}
          className={`font-extrabold leading-tight text-navy-900 ${sizes[size]} ${
            uppercase ? "uppercase tracking-tight" : ""
          }`}
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-700">{description}</p>
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
