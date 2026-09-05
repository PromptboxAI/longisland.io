import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import type { LegalSection } from "@/components/site/LegalDocument";
import { LegalSections, LegalTableOfContents } from "@/components/site/LegalDocument";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.name} collects, uses and protects information.`,
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "September 5, 2026";
const PRIVACY_EMAIL = "kevin@promptbox.com";

const SECTIONS: LegalSection[] = [
  {
    heading: "Information We Collect",
    blocks: [
      {
        type: "p",
        text: "Depending on how you use LongIsland.io, we may collect information that you provide directly to us and information collected automatically when you use the Site.",
      },
      { type: "h3", text: "Information You Provide to Us" },
      { type: "p", text: "You may provide information to us when you:" },
      {
        type: "ul",
        items: [
          "contact LongIsland.io;",
          "subscribe to a newsletter or mailing list;",
          "submit a business listing or request changes to an existing listing;",
          "submit a review, comment, recommendation, tip, event, photograph, or other content;",
          "participate in surveys, contests, promotions, or giveaways;",
          "communicate with us by email or through an online form;",
          "inquire about advertising, sponsorships, partnerships, or other services; or",
          "otherwise voluntarily provide information through the Site.",
        ],
      },
      { type: "p", text: "Information you provide may include:" },
      {
        type: "ul",
        items: [
          "name;",
          "email address;",
          "telephone number;",
          "mailing address;",
          "business name;",
          "business address;",
          "website;",
          "social media information;",
          "photographs or videos;",
          "comments or messages;",
          "information contained in user submissions; and",
          "any other information you choose to provide.",
        ],
      },
      {
        type: "p",
        text: "You are not required to provide personal information simply to browse publicly available portions of LongIsland.io.",
      },
    ],
  },
  {
    heading: "Information Collected Automatically",
    blocks: [
      {
        type: "p",
        text: "When you visit LongIsland.io, certain information may be collected automatically by us or by service providers that help us operate, analyze, secure, advertise, or improve the Site.",
      },
      { type: "p", text: "This information may include:" },
      {
        type: "ul",
        items: [
          "Internet Protocol (“IP”) address;",
          "browser type;",
          "operating system;",
          "device type;",
          "device identifiers;",
          "approximate geographic location derived from your IP address;",
          "referring website or source;",
          "pages viewed;",
          "links clicked;",
          "search activity on the Site;",
          "date and time of visits;",
          "time spent on pages;",
          "interactions with advertisements or other content;",
          "general traffic and usage information; and",
          "other technical information relating to your interaction with the Site.",
        ],
      },
      {
        type: "p",
        text: "We may use cookies, pixels, web beacons, local storage, and similar technologies to collect this information.",
      },
    ],
  },
  {
    heading: "Cookies and Similar Technologies",
    blocks: [
      {
        type: "p",
        text: "Cookies are small files or pieces of information stored on or associated with your browser or device.",
      },
      {
        type: "p",
        text: "LongIsland.io and our service providers may use cookies and similar technologies for purposes such as:",
      },
      {
        type: "ul",
        items: [
          "operating and securing the Site;",
          "remembering preferences;",
          "understanding how visitors use LongIsland.io;",
          "measuring traffic and engagement;",
          "improving content and Site functionality;",
          "measuring advertising performance;",
          "preventing fraud or abuse;",
          "determining which pages or features are most useful; and",
          "where permitted, delivering advertising that may be more relevant to visitors.",
        ],
      },
      {
        type: "p",
        text: "Some cookies may be necessary for the Site to function, while others may be used for analytics or advertising.",
      },
      {
        type: "p",
        text: "Your browser may allow you to block, restrict, or delete cookies. Doing so may affect certain features of the Site.",
      },
    ],
  },
  {
    heading: "Analytics",
    blocks: [
      {
        type: "p",
        text: "We may use analytics providers to understand how visitors use LongIsland.io.",
      },
      { type: "p", text: "These services may collect information such as:" },
      {
        type: "ul",
        items: [
          "pages visited;",
          "time spent on pages;",
          "device and browser information;",
          "approximate location;",
          "referring websites;",
          "interactions with Site features; and",
          "other usage information.",
        ],
      },
      {
        type: "p",
        text: "Analytics information helps us understand Site performance, identify popular content, detect technical problems, and improve the visitor experience.",
      },
      {
        type: "p",
        text: "For example, LongIsland.io may use services such as Google Analytics or similar analytics platforms.",
      },
      {
        type: "p",
        text: "Where required by applicable law, users may be provided with options to restrict certain analytics technologies.",
      },
    ],
  },
  {
    heading: "How We Use Information",
    blocks: [
      {
        type: "p",
        text: "We may use information we collect for purposes including:",
      },
      {
        type: "ul",
        items: [
          "operating and maintaining LongIsland.io;",
          "providing requested information or services;",
          "responding to questions, inquiries, or communications;",
          "maintaining and improving business listings and directories;",
          "processing business-owner correction requests;",
          "publishing submitted content where appropriate;",
          "administering newsletters and other communications;",
          "personalizing or improving Site content;",
          "understanding how visitors use the Site;",
          "measuring Site traffic and performance;",
          "developing new features, guides, directories, and services;",
          "displaying and measuring advertising;",
          "managing sponsorships and affiliate programs;",
          "communicating with advertisers, businesses, and partners;",
          "detecting, preventing, and investigating fraud, abuse, security incidents, or prohibited activity;",
          "enforcing our Terms of Use;",
          "complying with applicable laws, regulations, court orders, subpoenas, or other legal requirements;",
          "protecting the rights, safety, and property of LongIsland.io, our users, and others; and",
          "carrying out other purposes disclosed when information is collected.",
        ],
      },
    ],
  },
  {
    heading: "Email Communications and Newsletters",
    blocks: [
      {
        type: "p",
        text: "If you voluntarily subscribe to a LongIsland.io newsletter or other email communication, we may use your email address to send you:",
      },
      {
        type: "ul",
        items: [
          "local news or information;",
          "guides and recommendations;",
          "events;",
          "promotions;",
          "sponsored content;",
          "Site updates; or",
          "other communications relating to LongIsland.io.",
        ],
      },
      {
        type: "p",
        text: "You may unsubscribe from marketing emails at any time by using the unsubscribe link contained in the email or by contacting us.",
      },
      {
        type: "p",
        text: "We may still send non-promotional communications when necessary to respond to an inquiry, address a request, administer a service, or comply with legal obligations.",
      },
    ],
  },
  {
    heading: "Advertising",
    blocks: [
      {
        type: "p",
        text: "LongIsland.io may display advertisements supplied by us or by third-party advertising providers.",
      },
      {
        type: "p",
        text: "Advertising providers may use cookies, pixels, device identifiers, or similar technologies to collect information regarding your interaction with the Site and advertisements.",
      },
      {
        type: "p",
        text: "Depending on the advertising services used, this information may be used to:",
      },
      {
        type: "ul",
        items: [
          "measure advertising performance;",
          "limit how often an advertisement is shown;",
          "understand whether an advertisement was viewed or clicked;",
          "detect fraudulent advertising activity;",
          "provide contextual advertising; or",
          "where permitted by applicable law, provide interest-based or targeted advertising.",
        ],
      },
      {
        type: "p",
        text: "Information collected directly by third-party advertising providers is subject to their own privacy policies.",
      },
      {
        type: "p",
        text: "LongIsland.io does not control the privacy practices of third-party advertising providers.",
      },
    ],
  },
  {
    heading: "Sponsored Content and Affiliate Links",
    blocks: [
      {
        type: "p",
        text: "LongIsland.io may publish sponsored content, promoted listings, affiliate links, or other commercially supported content.",
      },
      {
        type: "p",
        text: "If you click an affiliate link or interact with a commercial partner, the applicable third party may collect information regarding that interaction.",
      },
      {
        type: "p",
        text: "In some cases, LongIsland.io may receive a commission, referral fee, advertising payment, or other compensation based on interactions or transactions involving those links.",
      },
      {
        type: "p",
        text: "Any information collected directly by the third party is governed by that party’s privacy policy.",
      },
    ],
  },
  {
    heading: "Business Listings",
    blocks: [
      {
        type: "p",
        text: "LongIsland.io may collect and publish information concerning businesses, organizations, attractions, restaurants, professionals, service providers, and other entities located on or serving Long Island.",
      },
      { type: "p", text: "This information may come from:" },
      {
        type: "ul",
        items: [
          "the applicable business or its representatives;",
          "publicly available sources;",
          "public records;",
          "third-party information providers;",
          "publicly accessible websites;",
          "users;",
          "social media;",
          "our own research; or",
          "other lawful sources.",
        ],
      },
      {
        type: "p",
        text: "Business information may include business names, addresses, telephone numbers, websites, operating hours, photographs, categories, descriptions, services, and other information generally associated with a business.",
      },
      {
        type: "p",
        text: "Business information that identifies an individual may constitute personal information under some privacy laws.",
      },
      {
        type: "p",
        text: "Business owners or authorized representatives may contact us regarding corrections or updates to their listings.",
      },
    ],
  },
  {
    heading: "User-Submitted Content",
    blocks: [
      {
        type: "p",
        text: "If you submit reviews, comments, photographs, recommendations, tips, events, business information, or other material for publication, some or all of the information you provide may become publicly available.",
      },
      {
        type: "p",
        text: "For example, if you submit a review using your name, the review and your name may be displayed publicly.",
      },
      {
        type: "p",
        text: "Do not submit information that you do not want made public when using features that are intended for public publication.",
      },
      {
        type: "p",
        text: "Once information has been made public, it may be copied, indexed, stored, shared, or redistributed by third parties outside of our control.",
      },
    ],
  },
  {
    heading: "How We Share Information",
    blocks: [
      {
        type: "p",
        text: "We may share information in the circumstances described below.",
      },
      { type: "h3", text: "Service Providers" },
      {
        type: "p",
        text: "We may provide information to companies and individuals that perform services on our behalf, including providers of:",
      },
      {
        type: "ul",
        items: [
          "website hosting;",
          "cloud infrastructure;",
          "analytics;",
          "email delivery;",
          "security;",
          "database management;",
          "advertising technology;",
          "content delivery;",
          "customer support;",
          "website development;",
          "data storage; and",
          "other business services.",
        ],
      },
      {
        type: "p",
        text: "These providers may access information only as reasonably necessary to provide their services to us, subject to applicable contractual and legal obligations.",
      },
      { type: "h3", text: "Advertising and Analytics Partners" },
      {
        type: "p",
        text: "We may permit advertising and analytics providers to collect information through cookies, pixels, and similar technologies as described in this Policy.",
      },
      {
        type: "p",
        text: "Depending on the technologies used, some transfers of information may constitute “sharing,” “targeted advertising,” or a “sale” under certain state privacy laws even when money is not exchanged for the information.",
      },
      {
        type: "p",
        text: "Where applicable law gives you a right to opt out of such activity, we will honor applicable legal requirements.",
      },
      { type: "h3", text: "Legal Requirements" },
      {
        type: "p",
        text: "We may disclose information when we reasonably believe disclosure is necessary to:",
      },
      {
        type: "ul",
        items: [
          "comply with applicable law;",
          "comply with a subpoena, court order, or governmental request;",
          "investigate fraud or unlawful activity;",
          "enforce our agreements or policies;",
          "protect the security or integrity of LongIsland.io; or",
          "protect the rights, property, or safety of LongIsland.io, our users, or others.",
        ],
      },
      { type: "h3", text: "Business Transactions" },
      {
        type: "p",
        text: "If LongIsland.io or the business operating it is involved in a merger, acquisition, financing, reorganization, sale of assets, bankruptcy, or similar business transaction, information may be transferred as part of that transaction.",
      },
      { type: "h3", text: "With Your Consent" },
      {
        type: "p",
        text: "We may share information for another purpose when you authorize or direct us to do so.",
      },
    ],
  },
  {
    heading: "Aggregated and De-Identified Information",
    blocks: [
      {
        type: "p",
        text: "We may create aggregated, statistical, or de-identified information that does not reasonably identify an individual.",
      },
      { type: "p", text: "For example, we may analyze:" },
      {
        type: "ul",
        items: [
          "the number of visitors to a particular guide;",
          "popular Long Island towns or categories;",
          "commonly viewed restaurants or attractions;",
          "traffic sources; or",
          "general audience engagement.",
        ],
      },
      {
        type: "p",
        text: "We may use and disclose aggregated or de-identified information for analytics, business operations, advertising measurement, research, and other lawful purposes.",
      },
    ],
  },
  {
    heading: "Third-Party Websites and Services",
    blocks: [
      {
        type: "p",
        text: "LongIsland.io contains links to third-party websites and services.",
      },
      { type: "p", text: "These may include:" },
      {
        type: "ul",
        items: [
          "restaurants;",
          "hotels;",
          "attractions;",
          "local businesses;",
          "retailers;",
          "professional service providers;",
          "booking or reservation platforms;",
          "mapping services;",
          "ticketing websites;",
          "social networks;",
          "advertisers; and",
          "affiliate partners.",
        ],
      },
      {
        type: "p",
        text: "When you leave LongIsland.io or interact directly with a third-party service, that third party’s privacy policy applies.",
      },
      {
        type: "p",
        text: "We are not responsible for the privacy, security, or data-handling practices of third-party websites or services.",
      },
      {
        type: "p",
        text: "We encourage you to review their privacy policies before providing personal information.",
      },
    ],
  },
  {
    heading: "Social Media and Embedded Content",
    blocks: [
      {
        type: "p",
        text: "LongIsland.io may include content or functionality provided by third parties, including embedded:",
      },
      {
        type: "ul",
        items: [
          "videos;",
          "maps;",
          "social media posts;",
          "sharing buttons;",
          "reservation tools; or",
          "other interactive features.",
        ],
      },
      {
        type: "p",
        text: "Third-party providers may collect information when you interact with these features and, in some cases, simply when a page containing an embedded feature loads.",
      },
      {
        type: "p",
        text: "Their collection and use of information is governed by their own privacy policies.",
      },
    ],
  },
  {
    heading: "Your Privacy Choices",
    blocks: [
      {
        type: "p",
        text: "Depending on how you interact with LongIsland.io, you may have several choices regarding your information.",
      },
      { type: "h3", text: "Email" },
      {
        type: "p",
        text: "You may opt out of promotional email by following the unsubscribe instructions included in our communications.",
      },
      { type: "h3", text: "Cookies" },
      {
        type: "p",
        text: "You may adjust your browser settings to block or delete cookies.",
      },
      {
        type: "p",
        text: "Certain browsers and devices also provide privacy controls that may limit tracking or targeted advertising.",
      },
      { type: "h3", text: "Advertising Preferences" },
      {
        type: "p",
        text: "Advertising providers may offer their own tools for limiting personalized or interest-based advertising.",
      },
      {
        type: "p",
        text: "Opting out of targeted advertising generally does not mean you will stop seeing advertisements. Instead, advertisements may be less personalized.",
      },
      { type: "h3", text: "Global Privacy Control" },
      {
        type: "p",
        text: (
          <>
            Where required by applicable law and technically supported by our Site,
            LongIsland.io will recognize applicable browser-based opt-out signals
            such as <strong>Global Privacy Control (&ldquo;GPC&rdquo;)</strong>.
          </>
        ),
      },
    ],
  },
  {
    heading: "U.S. State Privacy Rights",
    blocks: [
      {
        type: "p",
        text: "Residents of certain U.S. states may have additional rights regarding their personal information under applicable privacy laws.",
      },
      {
        type: "p",
        text: "Depending on your state of residence and whether the applicable law applies to LongIsland.io, those rights may include the right to:",
      },
      {
        type: "ul",
        items: [
          "confirm whether we process your personal information;",
          "access personal information we maintain about you;",
          "request correction of inaccurate personal information;",
          "request deletion of certain personal information;",
          "obtain a copy of certain personal information;",
          "opt out of targeted advertising;",
          "opt out of certain sales or sharing of personal information;",
          "opt out of certain profiling activities; and",
          "appeal certain decisions concerning a privacy request.",
        ],
      },
      {
        type: "p",
        text: "These rights are subject to exceptions and limitations under applicable law.",
      },
      {
        type: "p",
        text: (
          <>
            To exercise an applicable privacy right, contact us using the information
            in the <a href="#contact-us">Contact Us</a> section below.
          </>
        ),
      },
      {
        type: "p",
        text: "We may need to verify your identity before processing certain requests.",
      },
      {
        type: "p",
        text: "You may also be permitted to designate an authorized agent to submit a request on your behalf. We may require documentation establishing that person’s authority to act for you.",
      },
      {
        type: "p",
        text: "We will not discriminate against you for exercising privacy rights provided by applicable law.",
      },
    ],
  },
  {
    heading: "California Privacy Rights",
    blocks: [
      {
        type: "p",
        text: "If applicable to LongIsland.io, California residents may have rights under the California Consumer Privacy Act, as amended by the California Privacy Rights Act (“CCPA/CPRA”).",
      },
      { type: "p", text: "These may include rights relating to:" },
      {
        type: "ul",
        items: [
          "access;",
          "disclosure;",
          "correction;",
          "deletion;",
          "data portability;",
          "sale or sharing of personal information;",
          "targeted or cross-context behavioral advertising;",
          "sensitive personal information; and",
          "non-discrimination.",
        ],
      },
      {
        type: "p",
        text: "For purposes of California law, certain disclosures involving advertising technologies may constitute a “sale” or “sharing” even where LongIsland.io does not receive monetary payment specifically in exchange for your information.",
      },
      {
        type: "p",
        text: "California residents may submit applicable privacy requests using the contact information below.",
      },
      { type: "h3", text: "California “Shine the Light”" },
      {
        type: "p",
        text: "California residents may also have rights under California Civil Code § 1798.83 concerning certain disclosures of personal information to third parties for their own direct-marketing purposes.",
      },
      {
        type: "p",
        text: "Requests concerning applicable California privacy rights may be submitted through the contact information below.",
      },
    ],
  },
  {
    heading: "Data Retention",
    blocks: [
      {
        type: "p",
        text: "We retain personal information for as long as reasonably necessary for the purposes for which it was collected, including to:",
      },
      {
        type: "ul",
        items: [
          "provide Site functionality;",
          "respond to inquiries;",
          "maintain business and legal records;",
          "administer advertising or commercial relationships;",
          "resolve disputes;",
          "prevent fraud;",
          "enforce agreements; and",
          "comply with applicable legal obligations.",
        ],
      },
      {
        type: "p",
        text: "Retention periods may vary based on the type of information and the purpose for which it was collected.",
      },
      {
        type: "p",
        text: "We may retain aggregated or de-identified information indefinitely where permitted by law.",
      },
    ],
  },
  {
    heading: "Data Security",
    blocks: [
      {
        type: "p",
        text: "We use reasonable administrative, technical, and organizational safeguards designed to protect personal information against unauthorized access, loss, misuse, alteration, or disclosure.",
      },
      {
        type: "p",
        text: "However, no website, network, database, or method of Internet transmission can be guaranteed to be completely secure.",
      },
      {
        type: "p",
        text: "Accordingly, we cannot guarantee the absolute security of information transmitted to or stored by LongIsland.io.",
      },
    ],
  },
  {
    heading: "Children’s Privacy",
    blocks: [
      {
        type: "p",
        text: "LongIsland.io is intended for a general audience and is not directed to children under the age of 13.",
      },
      {
        type: "p",
        text: "We do not knowingly collect personal information online from children under 13.",
      },
      {
        type: "p",
        text: "If we learn that personal information has been collected from a child under 13 in a manner requiring parental consent under applicable law, we will take reasonable steps to delete that information.",
      },
      {
        type: "p",
        text: "A parent or legal guardian who believes a child has submitted personal information to LongIsland.io may contact us using the information below.",
      },
    ],
  },
  {
    heading: "Location Information",
    blocks: [
      {
        type: "p",
        text: "LongIsland.io may use approximate geographic information derived from an IP address to provide locally relevant content, analyze Site traffic, detect fraud, or support advertising.",
      },
      {
        type: "p",
        text: "Unless expressly disclosed and consented to through a particular Site feature, we do not intentionally collect precise GPS-level location information through the website.",
      },
      {
        type: "p",
        text: "Third-party services embedded on the Site, such as mapping services, may separately request or process location information according to their own privacy policies and settings.",
      },
    ],
  },
  {
    heading: "Do Not Track",
    blocks: [
      {
        type: "p",
        text: "Some web browsers transmit “Do Not Track” signals.",
      },
      {
        type: "p",
        text: "Because there is not a single universally accepted standard governing how websites must respond to every Do Not Track signal, LongIsland.io may not respond to all such signals.",
      },
      {
        type: "p",
        text: "However, as described above, we will honor legally recognized opt-out preference signals such as Global Privacy Control where required by applicable law.",
      },
    ],
  },
  {
    heading: "International Visitors",
    blocks: [
      {
        type: "p",
        text: "LongIsland.io is operated in the United States and is primarily intended for users interested in Long Island, New York.",
      },
      {
        type: "p",
        text: "If you access the Site from outside the United States, information you provide may be transferred to and processed in the United States or other jurisdictions where our service providers operate.",
      },
      {
        type: "p",
        text: "Privacy laws in those jurisdictions may differ from those in your country of residence.",
      },
    ],
  },
  {
    heading: "Changes to This Privacy Policy",
    blocks: [
      {
        type: "p",
        text: "We may modify this Privacy Policy from time to time to reflect changes in:",
      },
      {
        type: "ul",
        items: [
          "our Site;",
          "technology;",
          "information practices;",
          "advertising or analytics services;",
          "legal requirements; or",
          "our business operations.",
        ],
      },
      {
        type: "p",
        text: "When we update this Privacy Policy, we will revise the “Last Updated” date at the top of this page.",
      },
      {
        type: "p",
        text: "Where required by applicable law, we may provide additional notice regarding material changes.",
      },
      {
        type: "p",
        text: "Your continued use of LongIsland.io after an updated Privacy Policy becomes effective constitutes acknowledgment of the revised Policy.",
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
            If you have questions about this Privacy Policy or want to submit a
            privacy-related request, contact us through{" "}
            <Link href="/contact">our contact page</Link> or at:
          </>
        ),
      },
      {
        type: "p",
        text: (
          <>
            <strong>LongIsland.io</strong>
            <br />
            Long Island, New York
            <br />
            Privacy email:{" "}
            <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
          </>
        ),
      },
      {
        type: "p",
        text: "For privacy requests, please include sufficient information for us to understand and respond to your request.",
      },
      {
        type: "p",
        text: "We may ask for additional information where reasonably necessary to verify your identity or determine whether a particular privacy right applies.",
      },
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
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-ink-500">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="prose-editorial text-[15px]">
          <p>
            {site.name} (&ldquo;LongIsland.io,&rdquo; &ldquo;we,&rdquo;
            &ldquo;us,&rdquo; or &ldquo;our&rdquo;) respects your privacy. This
            Privacy Policy explains how we collect, use, disclose, and protect
            information when you visit <strong>LongIsland.io</strong>, interact with
            our content, submit information, subscribe to communications, or
            otherwise use our website and related services (collectively, the
            &ldquo;Site&rdquo;).
          </p>
          <p>
            By using LongIsland.io, you acknowledge the practices described in this
            Privacy Policy.
          </p>
          <p>
            This Privacy Policy applies only to information collected through
            LongIsland.io and services that directly link to this Policy. It does not
            govern websites, applications, businesses, advertisers, or other third
            parties that may be linked to or featured on the Site. Your use of the
            Site is also subject to our <Link href="/terms">Terms of Use</Link>.
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
