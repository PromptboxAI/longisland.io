import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import {
  AFFILIATE_DISCLOSURE_LONG,
  PRODUCT_RESEARCH_NOTICE,
} from "@/lib/affiliate";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { EDITORIAL_INDEPENDENCE_NOTICE, site } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description:
    "How LongIsland.io makes money from product recommendations, and why commissions never decide what we recommend.",
  alternates: { canonical: "/affiliate-disclosure" },
};

const SECTIONS: { heading: string; paragraphs: string[] }[] = [
  {
    heading: "What an affiliate link is",
    paragraphs: [
      AFFILIATE_DISCLOSURE_LONG,
      "An affiliate link is an ordinary link to a retailer with an identifier attached that tells the retailer we sent you. The price you pay is the same as it would be if you typed the address in yourself.",
      "Not every link on this site is an affiliate link. Where we have no affiliate relationship with a retailer, we link to them anyway, untagged, because the point of the recommendation is that you can act on it.",
    ],
  },
  {
    heading: "How we label them",
    paragraphs: [
      "Any page carrying at least one affiliate link shows a disclosure at the top, above the first link, before you have had the chance to click anything. That disclosure is generated from the links actually on the page rather than added by hand, so it cannot fall out of step with them.",
      "Every affiliate link is also marked in the page's markup as a sponsored link, which is what search engines ask publishers to do and the honest description of what it is.",
    ],
  },
  {
    heading: "What commissions do not buy",
    paragraphs: [
      "A commission cannot buy a place on a list, a position in a ranking, a badge, or a sentence of copy. Products are selected and ordered before anyone looks at whether an affiliate programme exists, and a product with no affiliate relationship at all can win a category — several already have.",
      EDITORIAL_INDEPENDENCE_NOTICE,
      "This is the same rule that governs our local rankings, where advertising relationships never affect an organic position either.",
    ],
  },
  {
    heading: "How we research products",
    paragraphs: [
      PRODUCT_RESEARCH_NOTICE,
      "We say this plainly because the alternative is the thing we most dislike about product review sites: the implied laboratory. We do not run one. Where a claim comes from a manufacturer's specification, owner reviews or another publication's testing, that is what it is, and we do not restate someone else's testing as our own.",
    ],
  },
  {
    heading: "Prices and availability",
    paragraphs: [
      "Prices change constantly, and a price printed on a page is only as good as the last time someone checked it. We show a price only when it has been checked recently, and we hide it rather than show a stale number. Some retailers' terms do not permit us to republish their prices at all, and in those cases the button takes you to the current price instead.",
      "Always confirm the price and availability on the retailer's own page before buying. That page, not this one, is the authority.",
    ],
  },
  {
    heading: "Corrections",
    paragraphs: [
      "If a recommendation here is wrong, out of date, or a product has been discontinued, tell us and we will fix it. Corrections to commerce content are treated as urgently as corrections to a local ranking.",
    ],
  },
];

export default function AffiliateDisclosurePage() {
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Affiliate Disclosure", href: "/affiliate-disclosure" },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(crumbs))} />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs items={crumbs} />

        <h1 className="mt-4 text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl">
          Affiliate Disclosure
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-700">
          How {site.name} makes money from product recommendations, and what that
          money does not buy.
        </p>

        <div className="mt-10 space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-semibold text-navy-900">
                {section.heading}
              </h2>
              <div className="prose-editorial mt-2 text-[15px]">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-6 text-sm">
          <Link
            href="/methodology"
            className="font-semibold text-brand-600 hover:text-brand-800"
          >
            How we rank
          </Link>
          <Link
            href="/products"
            className="font-semibold text-brand-600 hover:text-brand-800"
          >
            Product reviews
          </Link>
          <Link
            href="/contact"
            className="font-semibold text-brand-600 hover:text-brand-800"
          >
            Submit a correction
          </Link>
        </div>
      </div>
    </>
  );
}
