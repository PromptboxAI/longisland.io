import {
  Building2,
  FileCheck2,
  FileText,
  Inbox,
  Megaphone,
  PenSquare,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { StatusPill } from "@/components/admin/StatusPill";
import {
  getAdminStats,
  listAdminRankings,
  listLeads,
  listNominations,
} from "@/lib/data/admin-queries";

export const dynamic = "force-dynamic";

const QUICK_ACTIONS = [
  { href: "/admin/generate", label: "Generate List", icon: Sparkles },
  { href: "/admin/rankings", label: "Create Ranking", icon: PenSquare },
  { href: "/admin/businesses", label: "Add Business", icon: Plus },
  { href: "/admin/nominations", label: "Review Nominations", icon: Inbox },
];

export default async function AdminDashboardPage() {
  const [stats, rankings, nominations, leads] = await Promise.all([
    getAdminStats(),
    listAdminRankings({ limit: 6 }),
    listNominations("new"),
    listLeads("new"),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-navy-900">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-500">
          Editorial pipeline and inbound at a glance.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <AdminStatCard
          label="Businesses"
          value={stats.businesses}
          icon={Building2}
          href="/admin/businesses"
        />
        <AdminStatCard
          label="Published rankings"
          value={stats.publishedRankings}
          icon={FileCheck2}
          href="/admin/rankings?status=published"
        />
        <AdminStatCard
          label="Draft rankings"
          value={stats.draftRankings}
          icon={PenSquare}
          href="/admin/rankings?status=draft"
        />
        <AdminStatCard
          label="New nominations"
          value={stats.newNominations}
          icon={Inbox}
          href="/admin/nominations"
          highlight={stats.newNominations > 0}
        />
        <AdminStatCard
          label="New leads"
          value={stats.newLeads}
          icon={Megaphone}
          href="/admin/leads"
          highlight={stats.newLeads > 0}
        />
        <AdminStatCard
          label="Content ready"
          value={stats.contentReady}
          icon={FileText}
          href="/admin/content"
        />
      </div>

      {/* Quick actions */}
      <section aria-labelledby="quick-actions">
        <h2 id="quick-actions" className="text-sm font-bold uppercase tracking-wider text-navy-900">
          Quick actions
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-semibold text-navy-900 transition-colors hover:border-brand-500 hover:text-brand-600"
              >
                <Icon aria-hidden="true" className="size-4" />
                {action.label}
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent rankings */}
        <section
          aria-labelledby="recent-rankings"
          className="rounded-card border border-line bg-white"
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 id="recent-rankings" className="text-sm font-bold text-navy-900">
              Recent rankings
            </h2>
            <Link href="/admin/rankings" className="text-xs font-semibold text-brand-600 hover:underline">
              View all
            </Link>
          </div>

          {rankings.length === 0 ? (
            <EmptyRow
              message="No rankings yet."
              actionLabel="Generate your first list"
              actionHref="/admin/generate"
            />
          ) : (
            <ul className="divide-y divide-line">
              {rankings.map((ranking) => (
                <li key={ranking.id}>
                  <Link
                    href={`/admin/rankings/${ranking.id}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-sand-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-navy-900">
                        {ranking.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {ranking.entry_count} entries
                        {ranking.category ? ` · ${ranking.category.name}` : ""}
                      </span>
                    </span>
                    <StatusPill status={ranking.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          {/* Nominations */}
          <section
            aria-labelledby="recent-nominations"
            className="rounded-card border border-line bg-white"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 id="recent-nominations" className="text-sm font-bold text-navy-900">
                New nominations
              </h2>
              <Link href="/admin/nominations" className="text-xs font-semibold text-brand-600 hover:underline">
                View all
              </Link>
            </div>

            {nominations.length === 0 ? (
              <EmptyRow message="Nothing waiting for review." />
            ) : (
              <ul className="divide-y divide-line">
                {nominations.slice(0, 5).map((nomination) => (
                  <li key={nomination.id} className="px-5 py-3">
                    <p className="truncate text-sm font-semibold text-navy-900">
                      {nomination.business_name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-500">
                      {[nomination.town, nomination.category]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Leads */}
          <section
            aria-labelledby="recent-leads"
            className="rounded-card border border-line bg-white"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 id="recent-leads" className="text-sm font-bold text-navy-900">
                New leads
              </h2>
              <Link href="/admin/leads" className="text-xs font-semibold text-brand-600 hover:underline">
                View all
              </Link>
            </div>

            {leads.length === 0 ? (
              <EmptyRow message="No inbound advertiser enquiries." />
            ) : (
              <ul className="divide-y divide-line">
                {leads.slice(0, 5).map((lead) => (
                  <li key={lead.id} className="px-5 py-3">
                    <p className="truncate text-sm font-semibold text-navy-900">
                      {lead.business_name ?? lead.name ?? "Unnamed"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-500">
                      {lead.interest ?? "No interest recorded"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function EmptyRow({
  message,
  actionLabel,
  actionHref,
}: {
  message: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="px-5 py-8 text-center">
      <p className="text-sm text-ink-500">{message}</p>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
