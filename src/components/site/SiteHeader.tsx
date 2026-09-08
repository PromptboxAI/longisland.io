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
 * It is the sticky one, and the only sticky one.
 * Row 2: a navy category bar that is the site's primary browse surface, with
 * hover/click mega-menus. It scrolls away.
 *
 * The two rows are siblings rather than nested because a sticky element can
 * only travel inside its own containing block. With both rows in one `<header>`
 * there were exactly two outcomes — stick the whole 108px block, or watch row 1
 * come unstuck 44px later — and neither is the one we want. Splitting them
 * costs nothing semantically: the category bar keeps its own named `<nav>`
 * landmark, so it is still announced as navigation on its own.
 *
 * Sticking only row 1 also settles the desktop trade-off. 64px of wordmark and
 * search is worth keeping in view; 108px of that plus a navy bar is a strip of
 * furniture following you down a page you are trying to read.
 *
 * Row 2 is desktop-only. Ten top-level destinations cannot be squeezed into a
 * phone's width, and the two ways of trying both fail: scrolling the strip
 * sideways hides half the site behind a gesture nobody performs, and wrapping
 * it turns the masthead into three navy lines before the page has begun. So
 * below `lg` the bar is not rendered at all and the hamburger carries every one
 * of its destinations. `lg` is the honest breakpoint because it is where the
 * mega-menus already live — the row is only ever complete above it.
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

  const [scrolled, setScrolled] = useState(false);

  /*
   * Locking the page behind the menu removes the scrollbar, and on any platform
   * that reserves space for one that is a 15px lurch of every fixed and sticky
   * thing on screen — the header most visibly — at the exact moment the menu
   * appears over it. Replacing the width with padding keeps the layout still.
   */
  useEffect(() => {
    if (!mobileOpen) return;

    const gap = window.innerWidth - document.documentElement.clientWidth;
    const previous = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
    };

    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    return () => {
      document.body.style.overflow = previous.overflow;
      document.body.style.paddingRight = previous.paddingRight;
    };
  }, [mobileOpen]);

  /*
   * The shadow earns its place only once there is something underneath to be
   * lifted off. At the top of the page it is a line under a white bar on a
   * white page; a few pixels down it is the thing that stops the header
   * dissolving into the content scrolling beneath it.
   */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    // Deferred rather than called straight out: a reload part-way down a page
    // needs the shadow immediately, but setting state inside the effect body
    // costs an extra render pass before paint.
    const frame = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

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
    <>
      {/* ------------------------------- Row 1 — the sticky one, every width */}
      {/*
        The navy rule under the mobile header.

        On desktop the category bar is itself a navy band, and it is what stops
        the white header dissolving into a white page. Hiding that bar below
        `lg` took the separation with it and left the masthead floating. The
        rule puts that edge back. A hairline, not a band: at 3px it read as a
        second navigation strip that had lost its labels, which is heavier than
        the job needs. One pixel of the site's navy separates the two surfaces
        and then gets out of the way.
      */}
      <header
        className={`sticky top-0 z-50 border-b border-navy-900 bg-white transition-shadow lg:border-b-0 ${
          scrolled ? "shadow-card" : "shadow-none"
        }`}
      >
        {/*
          56px on a phone, 64px from `lg`.
          The wordmark is the only thing in this row on mobile, and at 20px in
          a 64px bar it floated with dead space above and below. A shorter bar
          and a larger wordmark close that gap from both sides — and 8px off
          the top of every page is worth having on a phone besides.
        */}
        <div className="relative mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:h-16 lg:px-8">
          {/*
            Hamburger first in the DOM as well as on screen, so tab order
            matches reading order on a phone. It disappears at `lg`, where the
            wordmark takes the leading position back.
          */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            className="-ml-2 rounded-md p-2 text-navy-900 transition-colors hover:bg-navy-50 lg:hidden"
          >
            <Menu aria-hidden="true" className="size-6" />
          </button>

          {/*
            Centred by absolute positioning below `lg` rather than by a grid.
            The two side slots hold different things at different widths — a
            hamburger against a search icon, then pills — so any layout that
            centres by balancing them would drift as their widths changed.
            `left-1/2` is indifferent to what sits either side of it.
          */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 text-2xl font-extrabold tracking-tight text-navy-900 lg:static lg:left-auto lg:translate-x-0 lg:shrink-0"
          >
            LongIsland<span className="text-gold-400">.io</span>
          </Link>

          {/*
            The inline field appears at `lg`, with the desktop bar — not at
            `md`, where it would have run into the centred wordmark.
          */}
          <div className="mx-auto hidden w-full max-w-xl lg:block">
            <SearchBar variant="header" />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileSearchOpen((open) => !open)}
              aria-expanded={mobileSearchOpen}
              aria-label="Search"
              className="-mr-2 rounded-md p-2 text-ink-700 transition-colors hover:bg-navy-50 lg:hidden"
            >
              <Search aria-hidden="true" className="size-5" />
            </button>

            <Link
              href="/nominate"
              className="hidden rounded-full border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-900 transition-colors hover:border-navy-400 hover:bg-navy-50 lg:inline-block"
            >
              Nominate
            </Link>
            <Link
              href="/advertise"
              className="hidden rounded-full bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-800 lg:inline-block"
            >
              Advertise
            </Link>
          </div>
        </div>

        {mobileSearchOpen ? (
          <div className="border-t border-line px-4 py-3 lg:hidden">
            <SearchBar variant="header" autoFocus />
          </div>
        ) : null}
      </header>

      {/* ------------- Row 2 — desktop only, and deliberately not sticky */}
      <div className="relative hidden bg-navy-900 lg:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Categories">
            <ul className="flex items-stretch gap-0">
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
                        className={`whitespace-nowrap py-3 pl-2 pr-1 text-[13px] font-semibold uppercase tracking-wide transition-colors xl:pl-3 ${
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
                          className="py-3 pr-2 text-navy-300 transition-colors hover:text-white xl:pr-3"
                        >
                          <ChevronDown
                            aria-hidden="true"
                            className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                          />
                        </button>
                      ) : (
                        <span className="pr-2 xl:pr-3" />
                      )}
                    </div>
                  </li>
                );
              })}

              {/*
                Only "All Categories" sits out here. "Best Of" used to as well,
                which put the same destination on the bar twice — it is already
                the first item — and those ~90px were part of why the row did
                not fit at 1024 without being scrolled sideways.
              */}
              <li className="ml-auto flex shrink-0 items-center pl-4 xl:pl-6">
                <Link
                  href="/categories"
                  className="whitespace-nowrap py-3 text-[13px] font-semibold uppercase tracking-wide text-navy-100 transition-colors hover:text-white"
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
            className="absolute inset-x-0 top-full z-50 border-b border-line bg-white shadow-lift"
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
    </>
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
          className="text-xl font-extrabold tracking-tight text-navy-900"
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

            {/*
              The category bar's right-hand link. It is not part of `primaryNav`
              because on desktop it sits apart from the categories, but on a
              phone the hamburger is the only door to it, so it has to be here
              or the destination becomes unreachable below 1024px.
            */}
            <li>
              <Link
                href="/categories"
                onClick={onClose}
                className={`block py-3.5 text-[15px] font-semibold uppercase tracking-wide ${
                  pathname.startsWith("/categories")
                    ? "text-brand-600"
                    : "text-navy-900"
                }`}
              >
                All Categories
              </Link>
            </li>
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
