"use client";

import { RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with your error reporting service when one is wired up.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold text-navy-900 sm:text-4xl">
        Something went wrong
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-700">
        This one is on us. Try again — if it keeps happening, let us know and
        include the reference below.
      </p>

      {error.digest ? (
        <p className="mt-4 rounded-md border border-line bg-sand-50 px-3 py-2 font-mono text-xs text-ink-500">
          Reference: {error.digest}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
        >
          <RotateCw aria-hidden="true" className="size-4" />
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-navy-300 px-6 py-2.5 text-sm font-semibold text-navy-900 hover:bg-sand-50"
        >
          Go home
        </Link>
        <Link
          href="/contact"
          className="rounded-full border border-navy-300 px-6 py-2.5 text-sm font-semibold text-navy-900 hover:bg-sand-50"
        >
          Report it
        </Link>
      </div>
    </div>
  );
}
