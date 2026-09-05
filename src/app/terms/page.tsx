import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import type { LegalSection } from "@/components/site/LegalDocument";
import { LegalSections, LegalTableOfContents } from "@/components/site/LegalDocument";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `The terms that govern use of ${site.name}.`,
  alternates: { canonical: "/terms" },
};

const LAST_UPDATED = "September 5, 2026";
const LEGAL_EMAIL = "kevin@promptbox.com";

const SECTIONS: LegalSection[] = [
  {
    heading: "About LongIsland.io",
    blocks: [
      {
        type: "p",
        text: "LongIsland.io is a digital platform focused on Long Island, New York. The Site may provide local news and information, guides, recommendations, reviews, rankings, business information, directories, events, attractions, restaurants, services, real estate information, community resources, sponsored content, advertisements, and other editorial or informational content.",
      },
      {
        type: "p",
        text: "Content appearing on LongIsland.io is provided for general informational purposes only. Unless expressly stated otherwise, LongIsland.io does not own, operate, manage, control, or represent the businesses, organizations, venues, attractions, restaurants, service providers, or other third parties referenced on the Site.",
      },
    ],
  },
  {
    heading: "Acceptance of These Terms",
    blocks: [
      {
        type: "p",
        text: "By visiting, accessing, browsing, or otherwise using the Site, you acknowledge that you have read, understood, and agree to these Terms.",
      },
      {
        type: "p",
        text: "You must be at least 13 years old to use the Site. Certain services, promotions, transactions, or features may require you to be at least 18 years old.",
      },
      {
        type: "p",
        text: "We may update these Terms from time to time. Changes will be posted on this page with an updated “Last Updated” date. Your continued use of the Site after changes become effective constitutes your acceptance of the revised Terms.",
      },
    ],
  },
  {
    heading: "Personal and Permitted Use",
    blocks: [
      {
        type: "p",
        text: "LongIsland.io is provided primarily for personal, informational, and noncommercial use unless we expressly authorize otherwise.",
      },
      {
        type: "p",
        text: "You may view, access, and share links to publicly available content on the Site for lawful purposes.",
      },
      {
        type: "p",
        text: "You may not use the Site in any manner that violates these Terms, interferes with the operation of the Site, infringes the rights of another person or entity, or violates applicable law.",
      },
    ],
  },
  {
    heading: "Prohibited Conduct",
    blocks: [
      { type: "p", text: "When using LongIsland.io, you may not:" },
      {
        type: "ul",
        items: [
          "Attempt to gain unauthorized access to the Site, servers, systems, accounts, databases, or networks connected to the Site.",
          "Interfere with or disrupt the operation, security, or performance of the Site.",
          "Introduce viruses, malware, malicious code, or other harmful technology.",
          "Use the Site to engage in fraudulent, deceptive, unlawful, threatening, abusive, defamatory, harassing, discriminatory, or otherwise harmful conduct.",
          "Impersonate another person, company, or organization.",
          "Collect personal information about other users without authorization.",
          "Copy, reproduce, republish, distribute, sell, license, or commercially exploit Site content except as expressly permitted by us or applicable law.",
          "Circumvent technological measures intended to protect the Site or its content.",
          "Use automated systems, bots, scrapers, crawlers, or similar technologies to access, collect, reproduce, or extract substantial portions of the Site without our prior written permission, except for legitimate search-engine indexing that complies with our published technical instructions.",
          "Use LongIsland.io content to create or populate a competing directory, content service, recommendation platform, database, or commercial product without our written authorization.",
          "Use Site content for training, developing, improving, or supplying datasets to artificial intelligence or machine-learning systems without our prior written permission, except where such restriction is prohibited by applicable law.",
        ],
      },
      {
        type: "p",
        text: "We reserve the right to restrict or terminate access to the Site for conduct that violates these Terms or otherwise threatens the integrity of LongIsland.io or its users.",
      },
    ],
  },
  {
    heading: "Editorial Content, Recommendations and Reviews",
    blocks: [
      {
        type: "p",
        text: "LongIsland.io may publish editorial reviews, rankings, recommendations, “best of” lists, guides, comparisons, opinions, and similar content.",
      },
      {
        type: "p",
        text: "Such content reflects the information, methodology, research, editorial judgment, or opinions available to us at the time of publication. Businesses, products, services, prices, hours, availability, ownership, personnel, offerings, ratings, conditions, and other information may change after publication.",
      },
      {
        type: "p",
        text: "A business’s inclusion on LongIsland.io does not necessarily constitute an endorsement, and exclusion from a list or guide does not imply that a business is inferior or unsuitable.",
      },
      {
        type: "p",
        text: "Rankings and recommendations are inherently subjective. Different users may have different experiences, preferences, and results.",
      },
      {
        type: "p",
        text: "We do not guarantee that any business, product, service, destination, professional, restaurant, contractor, venue, attraction, or other entity referenced on LongIsland.io will meet your expectations or be suitable for your particular needs.",
      },
      {
        type: "p",
        text: "Users should independently verify information that is important to their decisions.",
      },
    ],
  },
  {
    heading: "Business Listings and Information",
    blocks: [
      {
        type: "p",
        text: "LongIsland.io may display information about businesses and organizations obtained from business owners, public records, publicly available sources, third-party data providers, users, or our own research.",
      },
      {
        type: "p",
        text: "We attempt to provide useful and accurate information, but we cannot guarantee that every listing is complete, current, or error-free.",
      },
      { type: "p", text: "Information such as:" },
      {
        type: "ul",
        items: [
          "addresses;",
          "phone numbers;",
          "website addresses;",
          "business hours;",
          "pricing;",
          "menus;",
          "services;",
          "licenses;",
          "availability;",
          "amenities;",
          "ownership;",
          "photographs; and",
          "other business details",
        ],
      },
      {
        type: "p",
        text: "should be independently confirmed with the applicable business before you rely upon it.",
      },
      {
        type: "p",
        text: "Business owners or authorized representatives may contact LongIsland.io to request corrections or updates to factual information concerning their business.",
      },
    ],
  },
  {
    heading: "Sponsored Content, Advertising and Affiliate Relationships",
    blocks: [
      {
        type: "p",
        text: "LongIsland.io may display advertising, sponsored listings, promoted businesses, sponsored content, affiliate links, or other commercial material.",
      },
      {
        type: "p",
        text: "Where appropriate, we may identify content as “Sponsored,” “Promoted,” “Advertisement,” or using similar language.",
      },
      {
        type: "p",
        text: "LongIsland.io may receive compensation when users view advertisements, click certain links, contact businesses, make purchases, book services, or otherwise interact with commercial partners.",
      },
      {
        type: "p",
        text: "The existence of an advertising, sponsorship, affiliate, or commercial relationship does not guarantee a positive review, ranking, recommendation, or editorial outcome unless content is expressly identified as paid or sponsored placement.",
      },
      {
        type: "p",
        text: "Advertising relationships do not constitute a guarantee or warranty regarding the advertiser’s products or services.",
      },
      {
        type: "p",
        text: "Any transaction between you and a third-party advertiser or business is solely between you and that third party.",
      },
    ],
  },
  {
    heading: "Third-Party Websites and Services",
    blocks: [
      {
        type: "p",
        text: "LongIsland.io may contain links to websites, applications, reservation systems, maps, social networks, merchants, advertisers, ticketing services, and other third-party services.",
      },
      {
        type: "p",
        text: "Those third parties operate independently from LongIsland.io.",
      },
      { type: "p", text: "We do not control and are not responsible for their:" },
      {
        type: "ul",
        items: [
          "content;",
          "availability;",
          "security;",
          "products or services;",
          "prices;",
          "policies;",
          "privacy practices;",
          "representations; or",
          "business practices.",
        ],
      },
      {
        type: "p",
        text: "A link from LongIsland.io to a third-party website does not necessarily mean that we endorse or guarantee that third party.",
      },
      {
        type: "p",
        text: "You access and use third-party services at your own risk and subject to the terms and policies of those services.",
      },
    ],
  },
  {
    heading: "No Professional Advice",
    blocks: [
      {
        type: "p",
        text: "Content published on LongIsland.io is intended for general informational and editorial purposes.",
      },
      {
        type: "p",
        text: "Nothing on the Site should be considered legal, medical, financial, tax, insurance, engineering, real estate, safety, or other professional advice unless specifically identified as being provided by an appropriately qualified professional.",
      },
      {
        type: "p",
        text: "You should consult an appropriate professional regarding decisions requiring professional advice.",
      },
    ],
  },
  {
    heading: "User Submissions",
    blocks: [
      {
        type: "p",
        text: "LongIsland.io may allow users to submit reviews, comments, photographs, recommendations, event information, corrections, tips, messages, or other materials (“User Content”).",
      },
      { type: "p", text: "You remain responsible for User Content you submit." },
      { type: "p", text: "By submitting User Content, you represent that:" },
      {
        type: "ol",
        items: [
          "you have the right to submit it;",
          "it does not violate another person’s copyright, trademark, privacy, publicity, or other rights;",
          "it is not knowingly false or misleading;",
          "it does not contain unlawful, defamatory, threatening, abusive, obscene, or malicious material; and",
          "your submission complies with applicable law.",
        ],
      },
      {
        type: "p",
        text: "You grant LongIsland.io a non-exclusive, worldwide, royalty-free license to host, store, reproduce, display, publish, adapt, format, and distribute your User Content as reasonably necessary to operate, promote, and improve the Site.",
      },
      {
        type: "p",
        text: "You retain ownership of any intellectual property rights you otherwise hold in your User Content.",
      },
      {
        type: "p",
        text: "We may moderate, edit, refuse, or remove User Content at our discretion.",
      },
    ],
  },
  {
    heading: "Intellectual Property",
    blocks: [
      {
        type: "p",
        text: "Except for User Content and materials owned by third parties, the Site and its original content, including its design, organization, text, graphics, logos, branding, photographs, videos, databases, software, compilations, and other materials, are owned by or licensed to LongIsland.io and are protected by applicable copyright, trademark, and other intellectual-property laws.",
      },
      {
        type: "p",
        text: "You may not reproduce, republish, distribute, modify, sell, license, create derivative works from, or commercially exploit protected LongIsland.io content without prior written authorization except where permitted by law.",
      },
      {
        type: "p",
        text: "The LongIsland.io name, branding, logos, and associated marks may not be used in a manner that falsely suggests sponsorship, affiliation, or endorsement.",
      },
    ],
  },
  {
    heading: "Copyright Complaints",
    blocks: [
      { type: "p", text: "We respect the intellectual-property rights of others." },
      {
        type: "p",
        text: "If you believe material appearing on LongIsland.io infringes your copyright, please provide a written notice containing sufficient information for us to evaluate the claim, including:",
      },
      {
        type: "ul",
        items: [
          "identification of the copyrighted work;",
          "identification and location of the allegedly infringing material;",
          "your name and contact information;",
          "a statement that you have a good-faith belief that the disputed use is not authorized by the copyright owner, its agent, or applicable law;",
          "a statement that the information in your notice is accurate and, under penalty of perjury, that you are the copyright owner or authorized to act for the copyright owner; and",
          "your physical or electronic signature.",
        ],
      },
      {
        type: "p",
        text: "Copyright notices may be submitted using the contact information provided in the “Contact Us” section below.",
      },
    ],
  },
  {
    heading: "Accuracy and Availability",
    blocks: [
      {
        type: "p",
        text: "We work to provide useful, timely, and accurate information, but we do not guarantee the completeness, reliability, accuracy, timeliness, or availability of information appearing on LongIsland.io.",
      },
      {
        type: "p",
        text: "Information may contain errors, omissions, outdated information, or inaccuracies.",
      },
      {
        type: "p",
        text: "We reserve the right to correct, update, modify, remove, or revise content at any time without notice.",
      },
      {
        type: "p",
        text: "The Site may occasionally be unavailable because of maintenance, technical problems, third-party service interruptions, security incidents, or circumstances outside our control.",
      },
    ],
  },
  {
    heading: "No Warranties",
    blocks: [
      {
        type: "p",
        text: "TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, LONGISLAND.IO AND ALL CONTENT, INFORMATION, FEATURES, AND SERVICES AVAILABLE THROUGH THE SITE ARE PROVIDED ON AN “AS IS” AND “AS AVAILABLE” BASIS.",
      },
      {
        type: "p",
        text: "WE MAKE NO EXPRESS OR IMPLIED WARRANTY REGARDING THE SITE, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, ACCURACY, RELIABILITY, AVAILABILITY, OR SECURITY.",
      },
      {
        type: "p",
        text: "WE DO NOT WARRANT THAT THE SITE WILL BE UNINTERRUPTED OR ERROR-FREE, THAT DEFECTS WILL ALWAYS BE CORRECTED, OR THAT THE SITE OR SERVERS USED TO PROVIDE IT WILL BE FREE OF HARMFUL COMPONENTS.",
      },
    ],
  },
  {
    heading: "Businesses, Products and Services Featured on the Site",
    blocks: [
      {
        type: "p",
        text: "LongIsland.io is not responsible for the acts, omissions, products, services, representations, warranties, pricing, availability, safety, quality, licensing, or conduct of third-party businesses featured or referenced on the Site.",
      },
      {
        type: "p",
        text: "You are responsible for evaluating a business before hiring, visiting, purchasing from, contracting with, or otherwise relying upon it.",
      },
      {
        type: "p",
        text: "Where licenses, certifications, permits, insurance, professional credentials, safety requirements, or regulatory compliance are important, you should independently confirm them with the appropriate business or governmental authority.",
      },
      {
        type: "p",
        text: "LONGISLAND.IO SHALL NOT BE A PARTY TO OR RESPONSIBLE FOR DISPUTES BETWEEN USERS AND BUSINESSES OR OTHER THIRD PARTIES FEATURED ON THE SITE.",
      },
    ],
  },
  {
    heading: "Limitation of Liability",
    blocks: [
      {
        type: "p",
        text: "TO THE FULLEST EXTENT PERMITTED BY LAW, LONGISLAND.IO AND ITS OWNERS, AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, CONTRIBUTORS, CONTRACTORS, AGENTS, LICENSORS, AND SERVICE PROVIDERS SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES ARISING FROM OR RELATING TO:",
      },
      {
        type: "ul",
        items: [
          "your access to or use of the Site;",
          "your inability to access or use the Site;",
          "information contained on the Site;",
          "reliance upon Site content;",
          "interactions or transactions with businesses or third parties;",
          "third-party websites or services;",
          "errors or omissions in Site content; or",
          "unauthorized access to or alteration of information.",
        ],
      },
      {
        type: "p",
        text: "Some jurisdictions do not permit certain limitations of liability. In those jurisdictions, our liability will be limited to the greatest extent permitted by applicable law.",
      },
    ],
  },
  {
    heading: "Indemnification",
    blocks: [
      {
        type: "p",
        text: "To the extent permitted by law, you agree to defend, indemnify, and hold harmless LongIsland.io and its owners, affiliates, officers, directors, employees, contractors, agents, licensors, and service providers from claims, liabilities, damages, losses, and reasonable costs and expenses arising from:",
      },
      {
        type: "ul",
        items: [
          "your violation of these Terms;",
          "your unlawful use of the Site;",
          "User Content submitted by you;",
          "your infringement of another person’s rights; or",
          "your misuse of information or services available through the Site.",
        ],
      },
    ],
  },
  {
    heading: "Privacy",
    blocks: [
      {
        type: "p",
        text: (
          <>
            Your use of LongIsland.io is also subject to our{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </>
        ),
      },
      {
        type: "p",
        text: "The Privacy Policy describes how information may be collected, used, stored, shared, and otherwise processed when you interact with the Site.",
      },
    ],
  },
  {
    heading: "Termination and Restriction of Access",
    blocks: [
      {
        type: "p",
        text: "We reserve the right to suspend, restrict, block, or terminate access to all or part of LongIsland.io when we reasonably believe a user:",
      },
      {
        type: "ul",
        items: [
          "violated these Terms;",
          "violated applicable law;",
          "interfered with the Site;",
          "infringed another person’s rights;",
          "attempted unauthorized access; or",
          "engaged in conduct harmful to LongIsland.io, its users, or third parties.",
        ],
      },
      {
        type: "p",
        text: "Provisions of these Terms that by their nature should survive termination will remain in effect.",
      },
    ],
  },
  {
    heading: "Governing Law",
    blocks: [
      {
        type: "p",
        text: "These Terms and any dispute relating to LongIsland.io shall be governed by the laws of the State of New York, without regard to conflict-of-law principles, together with applicable federal law.",
      },
    ],
  },
  {
    heading: "Jurisdiction and Venue",
    blocks: [
      {
        type: "p",
        text: "To the fullest extent permitted by applicable law, any legal action arising from or relating to these Terms or the use of LongIsland.io shall be brought in a state or federal court having jurisdiction in Suffolk County, New York, and the parties consent to the jurisdiction of those courts.",
      },
      {
        type: "p",
        text: "Nothing in these Terms prevents an eligible claim from being brought in an appropriate small claims court.",
      },
    ],
  },
  {
    heading: "Jury Trial and Class Action Waiver",
    blocks: [
      {
        type: "p",
        text: "TO THE EXTENT PERMITTED BY APPLICABLE LAW, YOU AND LONGISLAND.IO EACH WAIVE THE RIGHT TO A TRIAL BY JURY IN CONNECTION WITH CLAIMS ARISING FROM OR RELATING TO THESE TERMS OR THE SITE.",
      },
      {
        type: "p",
        text: "TO THE EXTENT PERMITTED BY APPLICABLE LAW, CLAIMS MUST BE BROUGHT ON AN INDIVIDUAL BASIS AND NOT AS A PLAINTIFF OR CLASS MEMBER IN A PURPORTED CLASS, REPRESENTATIVE, CONSOLIDATED, OR COLLECTIVE ACTION.",
      },
      {
        type: "p",
        text: "If any portion of this section is determined to be unenforceable, that determination will not affect otherwise enforceable portions of these Terms.",
      },
    ],
  },
  {
    heading: "Severability",
    blocks: [
      {
        type: "p",
        text: "If any provision of these Terms is determined to be invalid, illegal, or unenforceable, the remaining provisions will remain in full force and effect to the maximum extent permitted by law.",
      },
    ],
  },
  {
    heading: "No Waiver",
    blocks: [
      {
        type: "p",
        text: "Our failure to enforce any provision of these Terms does not constitute a waiver of that provision or of our right to enforce it later.",
      },
    ],
  },
  {
    heading: "Entire Agreement",
    blocks: [
      {
        type: "p",
        text: (
          <>
            These Terms, together with our <Link href="/privacy">Privacy Policy</Link>{" "}
            and any additional terms expressly applicable to particular Site
            features, constitute the agreement between you and LongIsland.io
            concerning your use of the Site.
          </>
        ),
      },
    ],
  },
  {
    heading: "Contact Us",
    blocks: [
      {
        type: "p",
        text: (
          <>
            Questions regarding these Terms of Use may be submitted through{" "}
            <Link href="/contact">our contact page</Link>.
          </>
        ),
      },
      {
        type: "p",
        text: (
          <>
            For legal or copyright-related notices, please contact:
            <br />
            LongIsland.io
            <br />
            Long Island, New York
            <br />
            Email: <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>
          </>
        ),
      },
    ],
  },
  {
    heading: "Changes to These Terms",
    blocks: [
      {
        type: "p",
        text: "We may modify these Terms when our services, business practices, technology, or applicable laws change.",
      },
      {
        type: "p",
        text: "When we make changes, we will update the “Last Updated” date at the top of this page. Where legally required, we may provide additional notice.",
      },
      {
        type: "p",
        text: "Your continued use of LongIsland.io following the effective date of revised Terms constitutes acceptance of those revised Terms.",
      },
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
            Terms of Use
          </h1>
          <p className="mt-2 text-sm text-ink-500">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="prose-editorial text-[15px]">
          <p>
            Welcome to {site.name} (&ldquo;LongIsland.io,&rdquo; &ldquo;we,&rdquo;
            &ldquo;us,&rdquo; or &ldquo;our&rdquo;). These Terms of Use
            (&ldquo;Terms&rdquo;) govern your access to and use of LongIsland.io,
            including its website, content, features, directories, listings,
            recommendations, reviews, guides, articles, tools, and other services we
            make available (collectively, the &ldquo;Site&rdquo;).
          </p>
          <p>
            Please read these Terms carefully. By accessing or using LongIsland.io,
            you agree to be bound by these Terms and our{" "}
            <Link href="/privacy">Privacy Policy</Link>. If you do not agree to these
            Terms, you should not use the Site.
          </p>
        </div>

        <LegalTableOfContents sections={SECTIONS} />

        <LegalSections sections={SECTIONS} />

        <p className="mt-12 border-t border-line pt-6 text-sm text-ink-500">
          &copy; 2026 {site.name}. All rights reserved.
        </p>
      </div>
    </>
  );
}
