"use client";

import { ChevronDown, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SearchBar } from "@/components/site/SearchBar";
import { primaryNav, site, type NavItem } from "@/lib/site";

/**
 * Two-row masthead.
 *
 * Row 1: wordmark, a prominent search field, and the two conversion actions.
 * Row 2: a navy category bar that is the site's primary browse surface, with
 * hover/click mega-menus on desktop and horizontal scroll on mobile.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close every menu on navigation. Adjusting state during render rather than
  // in an effect: React applies this before committing, so the menus never
  // paint open on the new route, and it avoids the cascading re-render that
  // setState-in-an-effect causes.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpenMenu(null);
    setMobileOpen(false);
    setMobileSearchOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpenMenu(null);
      setMobileOpen(false);
      setMobileSearchOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 140);
  }

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  function isActive(item: NavItem) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-card">
      {/* ------------------------------------------------------------ Row 1 */}
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 text-xl font-extrabold uppercase tracking-tight text-navy-900 sm:text-2xl"
        >
          LongIsland<span className="text-gold-400">.io</span>
        </Link>

        <div className="mx-auto hidden w-full max-w-xl md:block">
          <SearchBar variant="header" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((open) => !open)}
            aria-expanded={mobileSearchOpen}
            aria-label="Search"
            className="rounded-md p-2 text-ink-700 transition-colors hover:bg-navy-50 md:hidden"
          >
            <Search aria-hidden="true" className="size-5" />
          </button>

          <Link
            href="/nominate"
            className="hidden rounded-full border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-900 transition-colors hover:border-navy-400 hover:bg-navy-50 sm:inline-block"
          >
            Nominate
          </Link>
          <Link
            href="/advertise"
            className="hidden rounded-full bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-800 sm:inline-block"
          >
            Advertise
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            className="rounded-md p-2 text-navy-900 transition-colors hover:bg-navy-50 lg:hidden"
          >
            <Menu aria-hidden="true" className="size-6" />
          </button>
        </div>
      </div>

      {mobileSearchOpen ? (
        <div className="border-t border-line px-4 py-3 md:hidden">
          <SearchBar variant="header" autoFocus />
        </div>
      ) : null}

      {/* ------------------------------------------------------------ Row 2 */}
      <div className="relative bg-navy-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Categories">
            <ul className="no-scrollbar flex items-stretch gap-0 overflow-x-auto">
              {primaryNav.map((item) => {
                const hasMenu = Boolean(item.columns?.length);
                const expanded = openMenu === item.label;

                return (
                  <li
                    key={item.label}
                    className="shrink-0"
                    onMouseEnter={() => {
                      cancelClose();
                      if (hasMenu) setOpenMenu(item.label);
                    }}
                    onMouseLeave={scheduleClose}
                  >
                    <div className="flex items-center">
                      <Link
                        href={item.href}
                        className={`whitespace-nowrap py-3 pl-3 pr-1 text-[13px] font-semibold uppercase tracking-wide transition-colors ${
                          isActive(item)
                            ? "text-gold-400"
                            : "text-navy-100 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </Link>
                      {hasMenu ? (
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-label={`${expanded ? "Hide" : "Show"} ${item.label} subcategories`}
                          onClick={() => setOpenMenu(expanded ? null : item.label)}
                          className="hidden py-3 pr-3 text-navy-300 transition-colors hover:text-white lg:block"
                        >
                          <ChevronDown
                            aria-hidden="true"
                            className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                          />
                        </button>
                      ) : (
                        <span className="pr-3" />
                      )}
                    </div>
                  </li>
                );
              })}

              <li className="ml-auto hidden shrink-0 items-center gap-5 pl-6 lg:flex">
                <Link
                  href="/best"
                  className="whitespace-nowrap text-[13px] font-semibold uppercase tracking-wide text-gold-400 transition-colors hover:text-gold-300"
                >
                  Best Of
                </Link>
                <Link
                  href="/categories"
                  className="whitespace-nowrap text-[13px] font-semibold uppercase tracking-wide text-navy-100 transition-colors hover:text-white"
                >
                  All Categories
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Mega-menu drops out of the category bar, full width of the container. */}
        {openMenu ? (
          <div
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            className="absolute inset-x-0 top-full z-50 hidden border-b border-line bg-white shadow-lift lg:block"
          >
            <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
              {primaryNav
                .filter((item) => item.label === openMenu)
                .map((item) => (
                  <div key={item.label} className="flex gap-12">
                    {item.columns?.map((column) => (
                      <div key={column.heading} className="min-w-44">
                        <p className="mb-3 border-b border-line pb-2 text-[11px] font-bold uppercase tracking-wider text-navy-900">
                          {column.heading}
                        </p>
                        <ul className="space-y-1.5">
                          {column.items.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className="block text-sm text-ink-700 transition-colors hover:text-brand-600 hover:underline"
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    <div className="ml-auto max-w-xs border-l border-line pl-8">
                      <p className="text-sm font-semibold text-navy-900">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-ink-500">
                        Every ranking, guide and local pick we publish in{" "}
                        {item.label.toLowerCase()}.
                      </p>
                      <Link
                        href={item.href}
                        className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline"
                      >
                        Browse all &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : null}
      </div>

      {mobileOpen ? (
        <MobileNav onClose={() => setMobileOpen(false)} pathname={pathname} />
      ) : null}
    </header>
  );
}

function MobileNav({
  onClose,
  pathname,
}: {
  onClose: () => void;
  pathname: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden"
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
        <Link
          href="/"
          onClick={onClose}
          className="text-xl font-extrabold uppercase tracking-tight text-navy-900"
        >
          LongIsland<span className="text-gold-400">.io</span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="rounded-md p-2 text-navy-900 hover:bg-navy-50"
        >
          <X aria-hidden="true" className="size-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="mb-5">
          <SearchBar variant="header" />
        </div>

        <nav aria-label="Primary mobile">
          <ul className="divide-y divide-line">
            {primaryNav.map((item) => {
              const open = expanded === item.label;
              const active = pathname.startsWith(item.href);

              return (
                <li key={item.label}>
                  <div className="flex items-center">
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`flex-1 py-3.5 text-[15px] font-semibold uppercase tracking-wide ${
                        active ? "text-brand-600" : "text-navy-900"
                      }`}
                    >
                      {item.label}
                    </Link>
                    {item.columns?.length ? (
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-label={`${open ? "Collapse" : "Expand"} ${item.label}`}
                        onClick={() => setExpanded(open ? null : item.label)}
                        className="rounded-md p-3 text-ink-400"
                      >
                        <ChevronDown
                          aria-hidden="true"
                          className={`size-5 transition-transform ${open ? "rotate-180" : ""}`}
                        />
                      </button>
                    ) : null}
                  </div>

                  {open && item.columns ? (
                    <div className="pb-3">
                      {item.columns.map((column) => (
                        <div key={column.heading} className="mb-3">
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-400">
                            {column.heading}
                          </p>
                          <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {column.items.map((child) => (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  onClick={onClose}
                                  className="block py-2 text-sm text-ink-700"
                                >
                                  {child.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="shrink-0 space-y-2 border-t border-line p-4">
        <Link
          href="/nominate"
          onClick={onClose}
          className="block rounded-full border border-navy-200 py-3 text-center text-sm font-semibold text-navy-900"
        >
          Nominate a Business
        </Link>
        <Link
          href="/advertise"
          onClick={onClose}
          className="block rounded-full bg-navy-900 py-3 text-center text-sm font-semibold text-white"
        >
          Advertise With Us
        </Link>
        <p className="pt-1 text-center text-xs text-ink-400">{site.positioning}</p>
      </div>
    </div>
  );
}
