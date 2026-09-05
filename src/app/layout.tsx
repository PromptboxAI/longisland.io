import type { Metadata } from "next";
import { Fraunces, Libre_Franklin } from "next/font/google";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { site } from "@/lib/site";

import "./globals.css";

// Fraunces carries editorial headlines only — feature and card titles. It is a
// variable face, so the whole weight range costs one file and headings can use
// real weight utilities rather than inheriting a single cut.
const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

// Libre Franklin carries everything structural: navigation, section headings,
// metadata, body copy and controls. A Franklin Gothic revival reads as news
// furniture next to the serif rather than as app chrome.
const sans = Libre_Franklin({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    url: site.url,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  // No blanket `index, follow`: crawlers index by default, and asserting it
  // here put a contradictory directive on every not-found render alongside the
  // `noindex` Next injects. Pages that must not be indexed (/search, the
  // not-found metadata) opt out explicitly instead.
  robots: {
    googleBot: { "max-image-preview": "large" },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
