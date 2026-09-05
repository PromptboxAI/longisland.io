"use client";

import { Loader2, Plus, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import type { Product } from "@/types/products";

export interface ProductPickerProps {
  /**
   * Candidate products, already fetched by the server page.
   *
   * Filtered in the browser rather than round-tripping per keystroke. The page
   * passes a capped list; once the catalogue outgrows that cap this becomes a
   * server search and only this component changes.
   */
  products: Product[];
  /** Ids already on the list, so they are offered as "added" rather than twice. */
  addedProductIds: string[];
  /** Adds one product. A Server Action bound by the page. */
  onAdd: (productId: string) => Promise<void>;
  label?: string;
}

export function ProductPicker({
  products,
  addedProductIds,
  onAdd,
  label = "Add a product",
}: ProductPickerProps) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState<string | null>(null);

  const added = useMemo(() => new Set(addedProductIds), [addedProductIds]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products.slice(0, 8);

    return products
      .filter((product) =>
        `${product.name} ${product.brand ?? ""}`.toLowerCase().includes(needle),
      )
      .slice(0, 8);
  }, [products, query]);

  const inputId = "product-picker-query";

  return (
    <div className="rounded-card border border-line bg-white p-4">
      <label htmlFor={inputId} className="block text-sm font-semibold text-navy-900">
        {label}
      </label>

      <div className="relative mt-2">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
        />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by product or brand"
          className="w-full rounded-md border border-line py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {products.length === 0 ? (
        <p className="mt-3 text-sm text-ink-500">
          No products yet. Create one first, then add it here.
        </p>
      ) : matches.length === 0 ? (
        <p className="mt-3 text-sm text-ink-500">Nothing matches that.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {matches.map((product) => {
            const alreadyAdded = added.has(product.id);

            return (
              <li
                key={product.id}
                className="flex items-center gap-3 rounded-md border border-line px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy-900">
                    {product.name}
                  </p>
                  <p className="truncate text-xs text-ink-500">
                    {product.brand ?? "No brand"} · {product.status}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={alreadyAdded || pending}
                  onClick={() => {
                    setAdding(product.id);
                    startTransition(async () => {
                      await onAdd(product.id);
                      setAdding(null);
                    });
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-navy-300 px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-sand-50 disabled:opacity-40"
                >
                  {adding === product.id && pending ? (
                    <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                  ) : (
                    <Plus aria-hidden="true" className="size-3.5" />
                  )}
                  {alreadyAdded ? "Added" : "Add"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
