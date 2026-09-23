import { Plus } from "lucide-react";
import Link from "next/link";

import { createBlankProduct } from "@/app/admin/products/actions";
import { ProductBulkList } from "@/components/admin/ProductBulkList";
import { listAdminProducts } from "@/lib/data/admin-product-queries";
import { getClickCountsByProduct } from "@/lib/data/click-queries";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "review", label: "In review" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

type PageProps = {
  searchParams: Promise<{ status?: string; q?: string; returnTo?: string }>;
};

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const products = await listAdminProducts({
    status: params.status,
    query: params.q,
  });

  /*
   * One query for the page. A per-row count would fire forty requests for a
   * column that is a single number each, which is not a trade worth making.
   */
  const clicks = await getClickCountsByProduct(products.map((p) => p.id));

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
          {/* Carries the placement an editor came from through to the new
              record, so the trip back is not lost. */}
          <input type="hidden" name="returnTo" value={params.returnTo ?? ""} />
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
        <ProductBulkList
          products={products.map((product) => ({
            id: product.id,
            name: product.name,
            slug: product.slug,
            brand: product.brand,
            categoryName: product.category?.name ?? null,
            offer_count: product.offer_count,
            clicks: clicks.get(product.id) ?? 0,
            status: product.status,
          }))}
        />
      )}
    </div>
  );
}
