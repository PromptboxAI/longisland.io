import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.name} collects, uses and protects information.`,
  alternates: { canonical: "/privacy" },
};

const SECTIONS = [
  {
    heading: "What we collect",
    body: [
      "When you submit a nomination, an advertising enquiry or a newsletter signup, we collect what you type into that form: typically your name, email address, and details about the business you are writing about.",
      "We collect standard server and analytics information such as pages visited, referring URL, approximate location derived from IP address, and browser type. This is used in aggregate to understand what people read.",
      "We do not ask for, and have no reason to collect, payment card details, government identifiers or health information through this site.",
    ],
  },
  {
    heading: "How we use it",
    body: [
      "To respond to you. A nomination or advertising enquiry is read by a person who may reply to the address you provided.",
      "To send the newsletter, if you asked for it. Every edition includes an unsubscribe link, and unsubscribing is immediate.",
      "To improve what we publish, by understanding which guides and rankings people actually use.",
    ],
  },
  {
    heading: "What we do not do",
    body: [
      "We do not sell your personal information.",
      "We do not share your email address with the businesses you nominate or read about.",
      "We do not use your submissions to determine ranking positions.",
    ],
  },
  {
    heading: "Service providers",
    body: [
      "We use third-party providers to host the site, store data, send email and measure traffic. These providers process information on our behalf and under contract. They are not permitted to use it for their own purposes.",
    ],
  },
  {
    heading: "Cookies",
    body: [
      "We use cookies and similar technologies for essential site function and for analytics. You can block or delete cookies in your browser; essential functionality will continue to work.",
    ],
  },
  {
    heading: "Your choices",
    body: [
      "You can unsubscribe from the newsletter at any time using the link in any edition.",
      "You can ask us what personal information we hold about you, ask us to correct it, or ask us to delete it. Depending on where you live you may have additional rights under laws such as the New York SHIELD Act or comparable state privacy laws.",
    ],
  },
  {
    heading: "Children",
    body: [
      "This site is intended for a general audience and is not directed at children under 13. We do not knowingly collect personal information from children under 13.",
    ],
  },
  {
    heading: "Changes",
    body: [
      "If this policy changes materially, we will update the date at the top of this page and, where appropriate, notify newsletter subscribers.",
    ],
  },
];

export default function PrivacyPage() {
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Privacy", href: "/privacy" },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(crumbs))} />

      <div className="border-b border-line bg-sand-50">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl">
            Privacy policy
          </h1>
          <p className="mt-2 text-sm text-ink-500">Last updated: January 2026</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Honest status marker — remove once counsel has signed this off. */}
        <div className="rounded-card border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
          <strong className="font-bold">Draft — needs legal review.</strong> This
          policy describes how the site is actually built, but it has not been
          reviewed by counsel. Have a lawyer review it before launch.
        </div>

        <div className="prose-editorial mt-8 text-[15px]">
          <p>
            {site.name} is an independent local publication. This policy explains
            what we collect through this website, why, and what you can do about
            it.
          </p>
        </div>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-bold text-navy-900">{section.heading}</h2>
              <div className="prose-editorial mt-2 text-[15px]">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}

          <section>
            <h2 className="text-lg font-bold text-navy-900">Contact</h2>
            <div className="prose-editorial mt-2 text-[15px]">
              <p>
                Questions about this policy, or a request about your information,
                can go to{" "}
                <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> or
                through <Link href="/contact">our contact page</Link>.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
