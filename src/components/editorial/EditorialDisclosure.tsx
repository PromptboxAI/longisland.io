import { CalendarDays, PenLine } from "lucide-react";
import Link from "next/link";

export interface EditorialDisclosureProps {
  authorName?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
}

/**
 * Byline and dateline for an editorial page.
 *
 * "Last updated" is shown only when it is genuinely later than publication, so
 * the date carries real information rather than implying freshness we cannot
 * back up.
 */
export function EditorialDisclosure({
  authorName,
  publishedAt,
  updatedAt,
}: EditorialDisclosureProps) {
  const published = publishedAt ? new Date(publishedAt) : null;
  const updated = updatedAt ? new Date(updatedAt) : null;
  const showUpdated =
    published && updated && updated.getTime() - published.getTime() > 86_400_000;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-500">
      {authorName ? (
        <span className="flex items-center gap-1.5">
          <PenLine aria-hidden="true" className="size-4 text-ink-400" />
          By <span className="font-medium text-navy-900">{authorName}</span>
        </span>
      ) : null}

      {published ? (
        <span className="flex items-center gap-1.5">
          <CalendarDays aria-hidden="true" className="size-4 text-ink-400" />
          {showUpdated ? "Updated" : "Published"}{" "}
          <time dateTime={(showUpdated ? updated : published).toISOString()}>
            {formatDate(showUpdated ? updated : published)}
          </time>
        </span>
      ) : null}

      <Link
        href="/methodology"
        className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-800"
      >
        How we rank
      </Link>
    </div>
  );
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
