import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { RuleHeading } from "@/components/ui/RuleHeading";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { EDITORIAL_INDEPENDENCE_NOTICE, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "How Our Rankings Work",
  description:
    "How LongIsland.io researches, selects and orders every ranking — the factors we weigh, what we do not do, and how to submit a correction.",
  alternates: { canonical: "/methodology" },
};

const FACTORS = [
  {
    title: "Consumer reputation",
    copy: "What people who have actually been there say, across the public review platforms where they say it. We read the substance, not just the star average.",
  },
  {
    title: "Review volume",
    copy: "A high rating from nine people tells us less than a good rating from nine hundred. Volume is context for a rating, never a substitute for one.",
  },
  {
    title: "Local relevance",
    copy: "Whether a place matters to the people who live near it. A restaurant with a devoted local following in Sayville counts for more here than a chain with national recognition.",
  },
  {
    title: "Longevity",
    copy: "Staying open on Long Island is hard. A business that has held a standard for fifteen years has demonstrated something a new opening has not yet had the chance to.",
  },
  {
    title: "Uniqueness",
    copy: "Whether there is a reason to go there specifically, rather than to the nearest equivalent. We favor places that could not be dropped into another town unchanged.",
  },
  {
    title: "Editorial research",
    copy: "Our own visits, calls and reading. On food lists this means eating the same benchmark dish everywhere so the comparison is fair.",
  },
  {
    title: "Public information",
    copy: "Menus, hours, licensing, service areas and anything else a business publishes about itself.",
  },
  {
    title: "Community feedback",
    copy: "Nominations from readers. These do not earn a spot on their own, but they shape what we go and look at.",
  },
];

export default function MethodologyPage() {
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "How we rank", href: "/methodology" },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(crumbs))} />

      <div className="border-b border-line bg-sand-50">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl">
            How {site.name} rankings work
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-700">
            Every list on this site is produced independently by our editorial
            team. Here is exactly how, and what we will not do.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {/* The single most important statement on the site. */}
        <div className="rounded-card border-2 border-navy-900 bg-navy-900 p-6">
          <p className="text-base font-bold leading-relaxed text-white">
            {EDITORIAL_INDEPENDENCE_NOTICE}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-navy-200">
            No business can buy a position on a list, and no advertiser is told in
            advance what a list will say. Sponsored placements exist on this site,
            and they are always labelled as sponsored. If we ever cannot tell those
            two things apart, the rankings stop being worth reading.
          </p>
        </div>

        <section aria-labelledby="factors" className="mt-12">
          <RuleHeading
            id="factors"
            title="What we weigh"
            description="No single factor decides a list. These are the inputs, weighted differently depending on what is being ranked."
            uppercase
          />
          <dl className="mt-7 space-y-6">
            {FACTORS.map((factor) => (
              <div key={factor.title}>
                <dt className="text-base font-bold text-navy-900">{factor.title}</dt>
                <dd className="mt-1.5 text-[15px] leading-relaxed text-ink-700">
                  {factor.copy}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="honest-limits" className="mt-12">
          <RuleHeading
            id="honest-limits"
            title="What a ranking is, and is not"
            uppercase
          />
          <div className="prose-editorial mt-5 text-[15px]">
            <p>
              <strong>Rankings are editorial judgments, not objective guarantees.</strong>{" "}
              Two reasonable people who ate at the same ten pizzerias would order
              them differently. What we can promise is that the order reflects
              research and a consistent standard, not a payment.
            </p>
            <p>
              <strong>Lists get updated.</strong> Places change hands, chefs leave,
              standards slip and new spots open. When that happens we revise the
              list and the updated date at the top of the page changes with it.
            </p>
            <p>
              <strong>Third-party ratings are not our ratings.</strong> Where we
              reference review scores from other platforms, they belong to those
              platforms. We do not publish our own numeric score, and we do not
              restate someone else&rsquo;s as though we produced it.
            </p>
            <p>
              <strong>We are not comprehensive.</strong> A business missing from a
              list has not been judged and found wanting — more often it simply has
              not been researched yet. That is what nominations are for.
            </p>
          </div>
        </section>

        <section aria-labelledby="corrections" className="mt-12">
          <RuleHeading id="corrections" title="Corrections and nominations" uppercase />
          <div className="prose-editorial mt-5 text-[15px]">
            <p>
              If something on this site is factually wrong — an address, a phone
              number, an ownership change, a closure — tell us and we will fix it.
              Factual corrections are made promptly and without argument.
            </p>
            <p>
              If you think a business belongs on a list, nominate it. If you are
              that business, you are welcome to nominate yourself; it carries the
              same weight as any other nomination, which is to say it gets
              researched.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/nominate"
              className="rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
            >
              Nominate a business
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-navy-300 px-6 py-2.5 text-sm font-semibold text-navy-900 hover:bg-sand-50"
            >
              Submit a correction
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
