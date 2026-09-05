import { Plus } from "lucide-react";
import Link from "next/link";

import { createBlankGuide } from "@/app/admin/product-rankings/actions";
import { StatusPill } from "@/components/admin/StatusPill";
import { listAdminProductGuides } from "@/lib/data/admin-product-queries";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "review", label: "In review" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

type PageProps = { searchParams: Promise<{ status?: string; q?: string }> };

export default async function AdminProductRankingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const guides = await listAdminProductGuides({
    status: params.status,
    query: params.q,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">Product Rankings</h1>
          <p className="mt-1 text-sm text-ink-500">
            {guides.length} {guides.length === 1 ? "buying guide" : "buying guides"}
          </p>
        </div>

        <form action={createBlankGuide}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <Plus aria-hidden="true" className="size-4" />
            New Guide
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = (params.status ?? "") === filter.value;
          const href = filter.value
            ? `/admin/product-rankings?status=${filter.value}`
            : "/admin/product-rankings";

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

      {guides.length === 0 ? (
        <div className="rounded-card border border-line bg-white p-12 text-center">
          <h2 className="text-lg font-bold text-navy-900">No buying guides here</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-500">
            A guide is a ranked list of products, written the same way a local
            ranking is: a standard, a reason per pick, and a stated methodology.
          </p>
          <form action={createBlankGuide} className="mt-5">
            <button
              type="submit"
              className="rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
            >
              Create a guide
            </button>
          </form>
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
                  Picks
                </th>
                <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {guides.map((guide) => (
                <tr key={guide.id} className="hover:bg-sand-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/product-rankings/${guide.id}`}
                      className="font-semibold text-navy-900 hover:text-brand-600 hover:underline"
                    >
                      {guide.title}
                    </Link>
                    <span className="mt-0.5 block font-mono text-xs text-ink-400">
                      /products/{guide.slug}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-700">
                    {guide.category?.name ?? "—"}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-ink-700">
                    {guide.entry_count}
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill status={guide.status} />
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
