import { Plus } from "lucide-react";
import Link from "next/link";

import { createBlankProduct } from "@/app/admin/products/actions";
import { StatusPill } from "@/components/admin/StatusPill";
import { listAdminProducts } from "@/lib/data/admin-product-queries";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "review", label: "In review" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

type PageProps = { searchParams: Promise<{ status?: string; q?: string }> };

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const products = await listAdminProducts({
    status: params.status,
    query: params.q,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">Products</h1>
          <p className="mt-1 text-sm text-ink-500">
            {products.length} {products.length === 1 ? "product" : "products"}
          </p>
        </div>

        <form action={createBlankProduct}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <Plus aria-hidden="true" className="size-4" />
            New Product
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = (params.status ?? "") === filter.value;
          const href = filter.value
            ? `/admin/products?status=${filter.value}`
            : "/admin/products";

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

      {products.length === 0 ? (
        <div className="rounded-card border border-line bg-white p-12 text-center">
          <h2 className="text-lg font-bold text-navy-900">No products here</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-500">
            Create a product, attach merchant offers to it, then add it to a
            buying guide or recommend it on a local page.
          </p>
          <form action={createBlankProduct} className="mt-5">
            <button
              type="submit"
              className="rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
            >
              Create a product
            </button>
          </form>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full min-w-3xl text-sm">
            <thead className="border-b border-line bg-sand-50 text-left">
              <tr>
                <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400">
                  Product
                </th>
                <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400">
                  Brand
                </th>
                <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400">
                  Category
                </th>
                <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400">
                  Offers
                </th>
                <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-sand-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="font-semibold text-navy-900 hover:text-brand-600 hover:underline"
                    >
                      {product.name}
                    </Link>
                    <span className="mt-0.5 block font-mono text-xs text-ink-400">
                      {product.slug}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-700">{product.brand ?? "—"}</td>
                  <td className="px-5 py-3 text-ink-700">
                    {product.category?.name ?? "—"}
                  </td>
                  <td className="px-5 py-3 tabular-nums">
                    {product.offer_count === 0 ? (
                      <span className="font-semibold text-red-600">0</span>
                    ) : (
                      <span className="text-ink-700">{product.offer_count}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill status={product.status} />
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
