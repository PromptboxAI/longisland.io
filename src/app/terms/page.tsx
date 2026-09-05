import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `The terms that govern use of ${site.name}.`,
  alternates: { canonical: "/terms" },
};

const SECTIONS = [
  {
    heading: "Using this site",
    body: [
      "You may read, link to and share our content. You may not republish substantial portions of it, scrape it at scale, or present it as your own work.",
      "You may not use this site to harass a business or an individual, to submit false information, or to attempt to interfere with its operation.",
    ],
  },
  {
    heading: "Rankings are editorial opinion",
    body: [
      "Our rankings, reviews and guides are editorial judgments based on research and publicly available information. They are opinions, not statements of objective fact, and not a guarantee of the quality, safety, licensing or suitability of any business.",
      "Advertising relationships do not guarantee or determine organic ranking positions. Sponsored content is labelled as sponsored.",
      "You are responsible for your own decisions. Verify licensing, insurance, pricing and current details directly with any business before hiring or purchasing — particularly for home services and anything involving a contract.",
    ],
  },
  {
    heading: "Accuracy and changes",
    body: [
      "We work to keep information accurate, but businesses change hours, ownership, menus and services without telling us. We make no warranty that content is current, complete or error-free.",
      "We update and reorder lists over time, and we may remove content entirely. Nothing here is promised to remain available.",
    ],
  },
  {
    heading: "Third-party content and links",
    body: [
      "This site links to third-party websites and may reference ratings published by other platforms. Those ratings belong to those platforms and are not ours. We are not responsible for third-party sites or their content.",
    ],
  },
  {
    heading: "Submissions",
    body: [
      "When you send us a nomination, correction or other submission, you confirm the information is truthful to the best of your knowledge and that you have the right to send it.",
      "You grant us permission to use, edit and publish the substance of your submission in our editorial work. We will not publish your email address.",
    ],
  },
  {
    heading: "Intellectual property",
    body: [
      "The written content, design and branding of this site belong to us or our licensors. Business names, logos and trademarks referenced in our coverage belong to their respective owners and are used for identification and commentary.",
      "If you believe content on this site infringes your rights, contact us and we will review it promptly.",
    ],
  },
  {
    heading: "Disclaimer and liability",
    body: [
      "This site is provided on an as-is basis without warranties of any kind, to the fullest extent permitted by law.",
      "To the fullest extent permitted by law, we are not liable for indirect, incidental or consequential damages arising from your use of this site or your dealings with any business featured on it.",
    ],
  },
  {
    heading: "Governing law",
    body: [
      "These terms are governed by the laws of the State of New York, without regard to conflict-of-law principles.",
    ],
  },
];

export default function TermsPage() {
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Terms", href: "/terms" },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(crumbs))} />

      <div className="border-b border-line bg-sand-50">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl">
            Terms of use
          </h1>
          <p className="mt-2 text-sm text-ink-500">Last updated: January 2026</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-card border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
          <strong className="font-bold">Draft — needs legal review.</strong> These
          terms reflect how the site actually operates, but they have not been
          reviewed by counsel. Have a lawyer review them before launch.
        </div>

        <div className="prose-editorial mt-8 text-[15px]">
          <p>
            These terms govern your use of {site.name}. By using the site, you
            agree to them.
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
                Questions about these terms can go to{" "}
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
