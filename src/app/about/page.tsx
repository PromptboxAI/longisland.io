import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { RuleHeading } from "@/components/ui/RuleHeading";
import { breadcrumbJsonLd, jsonLdScriptProps, organizationJsonLd } from "@/lib/seo/json-ld";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "LongIsland.io is an independent local discovery and rankings publication covering Nassau, Suffolk and the East End.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(organizationJsonLd())} />
      <script {...jsonLdScriptProps(breadcrumbJsonLd(crumbs))} />

      <div className="border-b border-line bg-sand-50">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl">
            About {site.name}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-700">
            An independent local discovery publication for Nassau, Suffolk and
            everything east of the Riverhead split.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="prose-editorial text-[15px]">
          <p>
            Long Island has more good food, more real coastline and more genuinely
            distinct villages than almost anywhere within an hour of a major city.
            It also has a discovery problem. Ask where to eat and you get a
            national review site optimised for volume, a neighborhood group with
            forty conflicting answers, or a listicle written by somebody who has
            never taken the LIE east of Exit 49.
          </p>
          <p>
            We started {site.name} to answer that question properly: with research,
            with a consistent standard, and with the assumption that the reader
            lives here and can tell the difference.
          </p>
        </div>

        <section aria-labelledby="what-we-do" className="mt-12">
          <RuleHeading id="what-we-do" title="What we do" uppercase />
          <div className="prose-editorial mt-5 text-[15px]">
            <p>
              We publish rankings, guides and business profiles across food and
              drink, things to do, home services, family, health and beauty, and
              shopping — organised by category and by the part of the island you
              are actually in.
            </p>
            <p>
              Every list is researched and ordered by our editorial team. We explain
              our reasoning on each entry rather than asking you to trust a number,
              and we publish{" "}
              <Link href="/methodology">our full methodology</Link> so you can
              judge the judgment.
            </p>
          </div>
        </section>

        <section aria-labelledby="how-we-make-money" className="mt-12">
          <RuleHeading id="how-we-make-money" title="How we make money" uppercase />
          <div className="prose-editorial mt-5 text-[15px]">
            <p>
              Advertising: sponsored content, featured business profiles, local
              guide and category sponsorships, social video, and newsletter
              placements. Sponsored work is always labelled as sponsored.
            </p>
            <p>
              <strong>
                Advertising relationships do not guarantee or determine organic
                ranking positions.
              </strong>{" "}
              A business cannot buy a spot on a list, move up one, or have a
              competitor removed. We keep those two sides of the business apart
              because a ranking nobody trusts is not worth selling against.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/advertise"
              className="rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
            >
              Advertise with us
            </Link>
            <Link
              href="/methodology"
              className="rounded-full border border-navy-300 px-6 py-2.5 text-sm font-semibold text-navy-900 hover:bg-sand-50"
            >
              How we rank
            </Link>
          </div>
        </section>

        <section aria-labelledby="get-in-touch" className="mt-12">
          <RuleHeading id="get-in-touch" title="Get in touch" uppercase />
          <div className="prose-editorial mt-5 text-[15px]">
            <p>
              Corrections, tips, nominations and partnership questions all reach a
              person. Start at <Link href="/contact">our contact page</Link>, or
              nominate a business directly if that is what you are here for.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
