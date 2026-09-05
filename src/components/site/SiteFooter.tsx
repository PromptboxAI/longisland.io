import Link from "next/link";

import { NewsletterSignup } from "@/components/cta/NewsletterSignup";
import { SocialIcon } from "@/components/site/SocialIcon";
import {
  EDITORIAL_INDEPENDENCE_NOTICE,
  footerNav,
  site,
  socialLinks,
} from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();
  const socials = socialLinks.filter((link) => link.href);

  return (
    <footer className="mt-auto border-t border-navy-100 bg-navy-950 text-navy-100">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Link
              href="/"
              className="text-2xl font-bold tracking-tight text-white"
            >
              LongIsland<span className="text-gold-400">.io</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-navy-200">
              {site.description}
            </p>
            <div className="mt-6 max-w-sm">
              <NewsletterSignup variant="footer" />
            </div>

            {socials.length > 0 ? (
              <ul className="mt-6 flex items-center gap-3">
                {socials.map((link) => (
                  <li key={link.platform}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer me"
                      aria-label={`${site.name} on ${link.label}`}
                      className="flex size-9 items-center justify-center rounded-full bg-navy-900 text-navy-200 transition-colors hover:bg-gold-400 hover:text-navy-950"
                    >
                      <SocialIcon platform={link.platform} className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerNav.map((column) => (
              <div key={column.heading}>
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gold-400">
                  {column.heading}
                </h2>
                <ul className="space-y-2">
                  {column.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-sm text-navy-200 transition-colors hover:text-white"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 border-t border-navy-800 pt-6">
          <p className="max-w-3xl text-xs leading-relaxed text-navy-300">
            {EDITORIAL_INDEPENDENCE_NOTICE} Rankings are editorial judgments based
            on research and public information, not objective guarantees.{" "}
            <Link href="/methodology" className="text-gold-400 underline underline-offset-2">
              Read our methodology
            </Link>
            .
          </p>
          <div className="mt-4 flex flex-col gap-2 text-xs text-navy-400 sm:flex-row sm:items-center sm:justify-between">
            <p>
              &copy; {year} {site.name}. All rights reserved.
            </p>
            <p>Made on Long Island, New York.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
