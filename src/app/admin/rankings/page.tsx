import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";

import { createBlankRanking } from "@/app/admin/rankings/actions";
import { StatusPill } from "@/components/admin/StatusPill";
import { listAdminRankings } from "@/lib/data/admin-queries";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "review", label: "In review" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

type PageProps = { searchParams: Promise<{ status?: string; q?: string }> };

export default async function AdminRankingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rankings = await listAdminRankings({
    status: params.status,
    query: params.q,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">Rankings</h1>
          <p className="mt-1 text-sm text-ink-500">
            {rankings.length} {rankings.length === 1 ? "ranking" : "rankings"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/generate"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-navy-900 hover:border-brand-500"
          >
            <Sparkles aria-hidden="true" className="size-4" />
            Generate List
          </Link>
          <form action={createBlankRanking}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
            >
              <Plus aria-hidden="true" className="size-4" />
              New Ranking
            </button>
          </form>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = (params.status ?? "") === filter.value;
          const href = filter.value
            ? `/admin/rankings?status=${filter.value}`
            : "/admin/rankings";

          return (
            <Link
              key={filter.label}
              href={href}
              aria-current={active ? "true" : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "border-navy-900 bg-navy-900 text-white"
                  : "border-line bg-white text-navy-900 hover:border-brand-500"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {rankings.length === 0 ? (
        <div className="rounded-card border border-line bg-white p-12 text-center">
          <h2 className="text-lg font-bold text-navy-900">No rankings here</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-500">
            Research candidates for a topic and turn them into a draft list.
          </p>
          <Link
            href="/admin/generate"
            className="mt-5 inline-block rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            Generate a list
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full min-w-3xl text-sm">
            <thead className="border-b border-line bg-sand-50 text-left">
              <tr>
                <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400">
                  Title
                </th>
                <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400">
                  Category
                </th>
                <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400">
                  Area
                </th>
                <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400">
                  Entries
                </th>
                <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rankings.map((ranking) => (
                <tr key={ranking.id} className="hover:bg-sand-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/rankings/${ranking.id}`}
                      className="font-semibold text-navy-900 hover:text-brand-600 hover:underline"
                    >
                      {ranking.title}
                    </Link>
                    <span className="mt-0.5 block font-mono text-xs text-ink-400">
                      /{ranking.slug}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-700">
                    {ranking.category?.name ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-ink-700">
                    {ranking.geography ?? ranking.place?.name ?? "—"}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-ink-700">
                    {ranking.entry_count}
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill status={ranking.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
