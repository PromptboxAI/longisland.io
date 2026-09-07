import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { HomeComposition } from "@/components/home/HomeComposition";
import { requireAdmin } from "@/lib/auth";

/**
 * The homepage as it will look, drafts included.
 *
 * Editorial placements are the one part of the site an editor cannot check
 * before publishing: a ranking has its own preview URL, but "what does the
 * front page look like with this in the feature slot" had no answer short of
 * publishing and looking. That is a bad way to find out that the feature and
 * Top Rankings are showing the same story.
 *
 * This renders `HomeComposition` — the real one, not a mock — with `draft` set,
 * so unpublished sections, unpublished items and unpublished targets all
 * resolve. RLS still decides: `requireAdmin` sends anyone else to the sign-in
 * screen, and the queries underneath run as that editor.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Homepage preview",
  robots: { index: false, follow: false, nocache: true },
};

export default async function HomepagePreviewPage() {
  await requireAdmin();

  return (
    <>
      <div className="border-b border-amber-300 bg-amber-50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
          <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-900">
            Preview
          </span>
          <p className="text-sm font-semibold text-navy-900">
            The homepage including unpublished editorial.
          </p>
          <p className="text-xs text-ink-700">
            Anything not yet published is shown here and is not on the live
            site. Sections with nothing in them are hidden, exactly as they will
            be.
          </p>
          <div className="ml-auto flex items-center gap-4">
            <Link
              href="/admin/editorial"
              className="text-xs font-semibold text-brand-600 hover:underline"
            >
              Back to Editorial
            </Link>
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
            >
              The live homepage
              <ExternalLink aria-hidden="true" className="size-3" />
            </Link>
          </div>
        </div>
      </div>

      <HomeComposition draft />
    </>
  );
}
