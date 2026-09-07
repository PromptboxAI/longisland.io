"use client";

import {
  BarChart3,
  Building2,
  FileText,
  FolderTree,
  Images,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  Link2,
  ListOrdered,
  LogOut,
  MapPin,
  Menu,
  Newspaper,
  Package,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/generate", label: "Generate List", icon: Sparkles },
  { href: "/admin/editorial", label: "Editorial", icon: LayoutTemplate },
  { href: "/admin/articles", label: "Articles", icon: Newspaper },
  { href: "/admin/rankings", label: "Rankings", icon: ListOrdered },
  { href: "/admin/businesses", label: "Businesses", icon: Building2 },
  { href: "/admin/media", label: "Media", icon: Images },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/places", label: "Places", icon: MapPin },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/product-rankings", label: "Product Rankings", icon: ShoppingBag },
  { href: "/admin/affiliate-offers", label: "Affiliate Offers", icon: Link2 },
  { href: "/admin/nominations", label: "Nominations", icon: Inbox },
  { href: "/admin/leads", label: "Leads", icon: BarChart3 },
  { href: "/admin/content", label: "Content", icon: FileText },
];

export interface AdminShellProps {
  email: string;
  children: React.ReactNode;
}

export function AdminShell({ email, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  function isActive(item: (typeof NAV)[number]) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="flex h-14 items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Close navigation" : "Open navigation"}
            className="rounded-md p-2 text-navy-900 hover:bg-sand-100 lg:hidden"
          >
            {open ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>

          <Link href="/admin" className="text-sm font-extrabold uppercase tracking-tight text-navy-900">
            LongIsland
            <span className="ml-1.5 rounded bg-navy-900 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Admin
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/"
              className="hidden text-xs font-semibold text-brand-600 hover:underline sm:inline"
            >
              View site
            </Link>
            <span className="hidden max-w-[180px] truncate text-xs text-ink-500 sm:inline">
              {email}
            </span>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-sand-100 disabled:opacity-60"
            >
              <LogOut aria-hidden="true" className="size-3.5" />
              {signingOut ? "Signing out" : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 top-14 z-30 w-60 shrink-0 border-r border-line bg-white transition-transform lg:sticky lg:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <nav aria-label="Admin" className="p-3">
            <ul className="space-y-0.5">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-navy-900 text-white"
                          : "text-ink-700 hover:bg-sand-100 hover:text-navy-900"
                      }`}
                    >
                      <Icon aria-hidden="true" className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {open ? (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-14 z-20 bg-navy-950/40 lg:hidden"
          />
        ) : null}

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
