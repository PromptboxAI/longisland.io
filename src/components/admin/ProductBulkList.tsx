"use client";

import Link from "next/link";

import {
  BulkCheckbox,
  BulkDeleteBar,
  BulkSelectAll,
  useBulkSelect,
} from "@/components/admin/BulkDelete";
import { DeleteRowButton } from "@/components/admin/DeleteRowButton";
import { StatusPill } from "@/components/admin/StatusPill";
import { deleteProduct, deleteProducts } from "@/app/admin/products/actions";

export interface BulkProductRow {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  categoryName: string | null;
  offer_count: number;
  clicks: number;
  status: string;
}

/** The products table, with drafts selectable for deletion. */
export function ProductBulkList({ products }: { products: BulkProductRow[] }) {
  const bulk = useBulkSelect(
    products.map((p) => ({
      id: p.id,
      title: p.name,
      deletable: p.status !== "published",
    })),
  );

  return (
    <div className="space-y-3">
      <BulkDeleteBar
        chosen={bulk.chosen}
        noun="product"
        keptNote={
          <>
            Click history is <strong className="font-semibold">kept</strong> —
            what these earned stays readable after the record is gone.
          </>
        }
        error={bulk.error}
        onConfirm={(ids) => deleteProducts(ids)}
        onError={bulk.setError}
        onDone={bulk.clear}
      />

      <div className="overflow-x-auto rounded-card border border-line bg-white">
        <table className="w-full min-w-3xl text-sm">
          <thead className="border-b border-line bg-sand-50 text-left">
            <tr>
              <th scope="col" className="w-10 px-5 py-3">
                <BulkSelectAll
                  any={bulk.deletable.length > 0}
                  allChosen={bulk.allChosen}
                  onToggle={bulk.toggleAll}
                />
              </th>
              {["Product", "Brand", "Category"].map((head) => (
                <th
                  key={head}
                  scope="col"
                  className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400"
                >
                  {head}
                </th>
              ))}
              {/*
                "Offers" was read as a metric sitting at zero. It is a count of
                the merchant links attached — configuration, not traffic.
              */}
              <th
                scope="col"
                className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400"
                title="How many merchant buy-links are attached. Not a click count."
              >
                Buy links
              </th>
              {/*
                Clicks, never sales. Nothing here can see a purchase, so the
                header says what the number actually is.
              */}
              <th
                scope="col"
                className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400"
                title="Outbound buy-link clicks in the last 30 days. Not sales."
              >
                Clicks 30d
              </th>
              <th
                scope="col"
                className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400"
              >
                Status
              </th>
              <th scope="col" className="px-5 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((product) => {
              const chosen = bulk.selected.has(product.id);
              return (
                <tr
                  key={product.id}
                  className={chosen ? "bg-amber-50" : "hover:bg-sand-50"}
                >
                  <td className="px-5 py-3">
                    <BulkCheckbox
                      id={product.id}
                      title={product.name}
                      checked={chosen}
                      deletable={product.status !== "published"}
                      onToggle={() => bulk.toggle(product.id)}
                      blockedReason="Published — unpublish before deleting"
                    />
                  </td>
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
                    {product.categoryName ?? "—"}
                  </td>
                  <td className="px-5 py-3 tabular-nums">
                    {product.offer_count === 0 ? (
                      <span
                        className="font-semibold text-amber-700"
                        title="No merchant link yet, so this product will not render in a commerce row"
                      >
                        None
                      </span>
                    ) : (
                      <span className="text-ink-700">{product.offer_count}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 tabular-nums">
                    {product.clicks > 0 ? (
                      <span className="font-semibold text-navy-900">
                        {product.clicks.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill status={product.status} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <DeleteRowButton
                      name={product.name}
                      consequence="It is removed from every guide and recommendation too."
                      onDelete={() => deleteProduct(product.id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
