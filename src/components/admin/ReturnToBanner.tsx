import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * The way back to whatever sent you here.
 *
 * An editor filling a Top Picks row who finds the product does not exist yet
 * has to leave, create it, and come back — and "come back" is the step that
 * gets lost. They end up on the products list with no memory of why they
 * opened it.
 *
 * So the picker's create link carries where it came from, and this puts it on
 * screen the whole time the new thing is being written. Nothing is stored: it
 * is a query parameter, so a stale one costs a wrong link and never a wrong
 * write.
 */
export function ReturnToBanner({
  returnTo,
  label = "Back to where you were",
}: {
  returnTo?: string;
  label?: string;
}) {
  // Only ever an internal path. An absolute URL here would turn a shared admin
  // link into an open redirect.
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return null;
  }

  return (
    <Link
      href={returnTo}
      className="inline-flex items-center gap-1.5 rounded-full border border-navy-300 px-4 py-1.5 text-xs font-semibold text-navy-900 transition-colors hover:border-navy-500 hover:bg-navy-50"
    >
      <ArrowLeft aria-hidden="true" className="size-3.5" />
      {label}
    </Link>
  );
}
