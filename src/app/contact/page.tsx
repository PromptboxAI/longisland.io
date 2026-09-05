import { Mail, MessageSquare, Megaphone, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { RuleHeading } from "@/components/ui/RuleHeading";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach the LongIsland.io team — corrections, editorial tips, nominations and advertising enquiries.",
  alternates: { canonical: "/contact" },
};

const ROUTES = [
  {
    icon: PenLine,
    title: "Corrections",
    copy: "An address, phone number, ownership change or closure we have wrong. We fix factual errors promptly.",
    action: { label: `Email ${site.contactEmail}`, href: `mailto:${site.contactEmail}` },
  },
  {
    icon: MessageSquare,
    title: "Nominations",
    copy: "A business you think belongs on a list. Goes straight onto the research queue for that category.",
    action: { label: "Nominate a business", href: "/nominate" },
  },
  {
    icon: Megaphone,
    title: "Advertising and partnerships",
    copy: "Sponsored content, featured profiles, guide sponsorships and social video.",
    action: { label: "Start a conversation", href: "/advertise" },
  },
  {
    icon: Mail,
    title: "Everything else",
    copy: "Press, editorial tips, or anything that does not fit the boxes above.",
    action: { label: `Email ${site.contactEmail}`, href: `mailto:${site.contactEmail}` },
  },
];

export default function ContactPage() {
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(crumbs))} />

      <div className="border-b border-line bg-sand-50">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl">
            Contact us
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-700">
            Everything here reaches a person. Pick the route that fits and you will
            get a faster answer.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <RuleHeading title="How to reach us" uppercase />

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          {ROUTES.map((route) => {
            const Icon = route.icon;
            const isExternal = route.action.href.startsWith("mailto:");

            return (
              <div key={route.title} className="rounded-card border border-line p-5">
                <Icon aria-hidden="true" className="size-6 text-brand-600" />
                <h2 className="mt-3 text-base font-bold text-navy-900">
                  {route.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-700">
                  {route.copy}
                </p>
                {isExternal ? (
                  <a
                    href={route.action.href}
                    className="mt-3 inline-block break-all text-sm font-semibold text-brand-600 hover:underline"
                  >
                    {route.action.label}
                  </a>
                ) : (
                  <Link
                    href={route.action.href}
                    className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline"
                  >
                    {route.action.label} &rsaquo;
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-card border border-line bg-sand-50 p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
            A note on ranking requests
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            We are happy to hear why you think a business deserves a spot, and we
            will research it. We cannot sell one.{" "}
            <Link
              href="/methodology"
              className="text-brand-600 underline underline-offset-2"
            >
              Read how rankings work
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}
