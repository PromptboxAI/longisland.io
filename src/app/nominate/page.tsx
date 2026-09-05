import type { Metadata } from "next";
import Link from "next/link";

import { NominationForm } from "@/components/forms/NominationForm";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";

export const metadata: Metadata = {
  title: "Nominate a Business",
  description:
    "Think we missed one? Nominate a Long Island restaurant, business, attraction or hidden gem for a LongIsland.io ranking.",
  alternates: { canonical: "/nominate" },
};

export default function NominatePage() {
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Nominate a Business", href: "/nominate" },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(crumbs))} />

      <div className="border-b border-line bg-sand-50">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl">
            Nominate a business
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-700">
            Long Islanders know Long Island best. If we missed a place that
            deserves a spot, tell us about it — every nomination is read by an
            editor.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <NominationForm />

        <div className="mt-10 rounded-card border border-line bg-sand-50 p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
            What happens next
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-700">
            <li>
              An editor reviews your nomination and adds it to the research list
              for the relevant category.
            </li>
            <li>
              If it holds up to research, it becomes a candidate the next time we
              build or update that list.
            </li>
            <li>
              A nomination is not a guarantee of inclusion, and it never costs
              anything.{" "}
              <Link
                href="/methodology"
                className="text-brand-600 underline underline-offset-2"
              >
                Read how we rank
              </Link>
              .
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
