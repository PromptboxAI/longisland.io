import { Plus } from "lucide-react";
import Link from "next/link";

import { createBlankBusiness } from "@/app/admin/businesses/actions";
import { StatusPill } from "@/components/admin/StatusPill";
import { listAdminBusinesses, listAdminCategories } from "@/lib/data/admin-queries";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

type PageProps = {
  searchParams: Promise<{ status?: string; category?: string; city?: string; q?: string }>;
};

export default async function AdminBusinessesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const [businesses, categories] = await Promise.all([
    listAdminBusinesses({
      status: params.status,
      categoryId: params.category,
      city: params.city,
      query: params.q,
    }),
    listAdminCategories(),
  ]);

  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  function hrefWith(patch: Record<string, string | undefined>): string {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...params, ...patch })) {
      if (value) next.set(key, value);
    }
    const query = next.toString();
    return query ? `/admin/businesses?${query}` : "/admin/businesses";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">Businesses</h1>
          <p className="mt-1 text-sm text-ink-500">
            {businesses.length} {businesses.length === 1 ? "business" : "businesses"}
          </p>
        </div>

        <form action={createBlankBusiness}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add Business
          </button>
        </form>
      </div>

      {/* Filters */}
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="q" className="block text-xs font-semibold text-navy-900">
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={params.q ?? ""}
            placeholder="Business name"
            className="mt-1.5 rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-xs font-semibold text-navy-900">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={params.category ?? ""}
            className="mt-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="city" className="block text-xs font-semibold text-navy-900">
            Town
          </label>
          <input
            id="city"
            name="city"
            type="text"
            defaultValue={params.city ?? ""}
            placeholder="Huntington"
            className="mt-1.5 rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {params.status ? (
          <input type="hidden" name="status" value={params.status} />
        ) : null}

        <button
          type="submit"
          className="rounded-full border border-navy-300 px-5 py-2 text-sm font-semibold text-navy-900 hover:bg-sand-50"
        >
          Apply
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = (params.status ?? "") === filter.value;
          return (
            <Link
              key={filter.label}
              href={hrefWith({ status: filter.value || undefined })}
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

      {businesses.length === 0 ? (
        <div className="rounded-card border border-line bg-white p-12 text-center">
          <h2 className="text-lg font-bold text-navy-900">No businesses found</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-500">
            Adjust the filters, or research candidates to add some.
          </p>
          <Link
            href="/admin/generate"
            className="mt-5 inline-block rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            Find candidates
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full min-w-3xl text-sm">
            <thead className="border-b border-line bg-sand-50 text-left">
              <tr>
                {["Name", "Town", "Category", "Flags", "Status"].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {businesses.map((business) => (
                <tr key={business.id} className="hover:bg-sand-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/businesses/${business.id}`}
                      className="font-semibold text-navy-900 hover:text-brand-600 hover:underline"
                    >
                      {business.name}
                    </Link>
                    <span className="mt-0.5 block font-mono text-xs text-ink-400">
                      /{business.slug}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-700">
                    {business.city ?? "—"}
                    {business.county ? (
                      <span className="block text-xs text-ink-400">
                        {business.county}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-ink-700">
                    {business.category_id
                      ? (categoryName.get(business.category_id) ?? "—")
                      : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span className="flex flex-wrap gap-1.5">
                      {business.featured ? (
                        <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-800">
                          Featured
                        </span>
                      ) : null}
                      {business.claimed ? (
                        <span className="rounded-full border border-line bg-sand-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-ink-700">
                          Claimed
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill status={business.status} />
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
