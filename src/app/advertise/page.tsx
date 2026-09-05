import {
  BadgeCheck,
  BookOpen,
  Building2,
  Mail,
  Megaphone,
  Sparkles,
  Video,
} from "lucide-react";
import type { Metadata } from "next";

import { LeadForm } from "@/components/forms/LeadForm";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { RuleHeading } from "@/components/ui/RuleHeading";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { EDITORIAL_INDEPENDENCE_NOTICE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Advertise With Us",
  description:
    "Reach Long Islanders through sponsored content, featured business profiles, social video, category sponsorships and newsletter placements.",
  alternates: { canonical: "/advertise" },
};

const OFFERS = [
  {
    icon: Megaphone,
    title: "Sponsored content",
    copy: "A dedicated article written to our editorial standard and clearly labelled as sponsored.",
  },
  {
    icon: BadgeCheck,
    title: "Featured business profiles",
    copy: "An expanded profile with photography, extended copy and priority placement in category pages.",
  },
  {
    icon: Video,
    title: "Social video",
    copy: "Short-form video produced for our channels and licensed back to you for your own.",
  },
  {
    icon: Building2,
    title: "Category sponsorships",
    copy: "Own the placement around a category — pizza, roofing, med spas — for a defined term.",
  },
  {
    icon: BookOpen,
    title: "Local guide sponsorships",
    copy: "Present a seasonal guide: fall on the North Fork, summer on the South Shore, holiday lights.",
  },
  {
    icon: Mail,
    title: "Newsletter sponsorship",
    copy: "A placement in the Thursday email that goes to Long Islanders planning their week.",
  },
  {
    icon: Sparkles,
    title: "Custom campaigns",
    copy: "Multi-channel programs built around a launch, an opening or an anniversary.",
  },
];

type PageProps = { searchParams: Promise<{ business?: string }> };

export default async function AdvertisePage({ searchParams }: PageProps) {
  const { business } = await searchParams;

  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Advertise", href: "/advertise" },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(crumbs))} />

      <div className="border-b border-line bg-sand-50">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl">
            Reach Long Island.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-700">
            Connect your business with Long Islanders through premium local
            content and discovery — at the moment they are deciding where to eat,
            where to go and who to hire.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <section aria-labelledby="offers">
          <RuleHeading
            id="offers"
            title="Ways to work with us"
            uppercase
          />
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {OFFERS.map((offer) => {
              const Icon = offer.icon;
              return (
                <div
                  key={offer.title}
                  className="rounded-card border border-line p-5 transition-shadow hover:shadow-card"
                >
                  <Icon aria-hidden="true" className="size-6 text-brand-600" />
                  <h3 className="mt-3 text-base font-bold text-navy-900">
                    {offer.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-700">
                    {offer.copy}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* The line that protects the product. */}
        <div className="mt-10 rounded-card border border-navy-200 bg-navy-900 p-6">
          <h2 className="text-base font-bold text-white">
            What advertising does not buy
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-navy-200">
            {EDITORIAL_INDEPENDENCE_NOTICE} Organic rankings are produced by our
            editorial team and cannot be purchased at any price. Sponsored
            placements are always labelled as sponsored. We think that is the only
            arrangement that makes either side of this business worth anything.
          </p>
        </div>

        <section aria-labelledby="lead-form" className="mt-12">
          <RuleHeading
            id="lead-form"
            title="Start a conversation"
            description="Tell us about your business and we will come back within two business days."
            uppercase
          />
          <div className="mt-7">
            <LeadForm defaultBusinessName={business ?? ""} />
          </div>
        </section>
      </div>
    </>
  );
}
