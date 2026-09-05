import Link from "next/link";

import { SearchBar } from "@/components/site/SearchBar";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-wider text-brand-600">
        404
      </p>
      <h1 className="mt-3 text-3xl font-extrabold text-navy-900 sm:text-4xl">
        We could not find that page
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-700">
        The link may be out of date, or the page may have moved. Try a search, or
        start from one of these.
      </p>

      <div className="mt-8 w-full max-w-md">
        <SearchBar variant="hero" />
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/best"
          className="rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
        >
          All rankings
        </Link>
        <Link
          href="/categories"
          className="rounded-full border border-navy-300 px-6 py-2.5 text-sm font-semibold text-navy-900 hover:bg-sand-50"
        >
          Categories
        </Link>
        <Link
          href="/places"
          className="rounded-full border border-navy-300 px-6 py-2.5 text-sm font-semibold text-navy-900 hover:bg-sand-50"
        >
          Places
        </Link>
      </div>
    </div>
  );
}
