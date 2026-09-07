"use client";

import { Check, Loader2 } from "lucide-react";
import { useActionState } from "react";

import { saveProduct, type ActionState } from "@/app/admin/products/actions";
import { FormError } from "@/components/forms/Field";
import { MediaField } from "@/components/admin/MediaField";
import type { MediaAsset } from "@/types/media";
import type { Product, ProductCategory } from "@/types/products";

export interface ProductFormProps {
  product: Product;
  categories: ProductCategory[];
  library: MediaAsset[];
  imageMedia: MediaAsset | null;
}

const inputClass =
  "w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";

export function ProductForm({
  product,
  categories,
  library,
  imageMedia,
}: ProductFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveProduct,
    {},
  );

  // Parents first, then their children indented, so a long flat list still reads
  // as the tree it is.
  const grouped = categories
    .filter((category) => !category.parent_id)
    .flatMap((parent) => [
      parent,
      ...categories.filter((child) => child.parent_id === parent.id),
    ]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={product.id} />

      <section className="rounded-card border border-line bg-white p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
          Identity
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-navy-900">
              Product name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={product.name}
              className={`mt-2 ${inputClass}`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="brand" className="block text-sm font-semibold text-navy-900">
                Brand
              </label>
              <input
                id="brand"
                name="brand"
                type="text"
                defaultValue={product.brand ?? ""}
                className={`mt-2 ${inputClass}`}
              />
            </div>

            <div>
              <label
                htmlFor="categoryId"
                className="block text-sm font-semibold text-navy-900"
              >
                Category
              </label>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={product.category_id ?? ""}
                className={`mt-2 ${inputClass} bg-white`}
              >
                <option value="">No category</option>
                {grouped.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.parent_id ? `  ${category.name}` : category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-semibold text-navy-900">
              Slug
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              required
              defaultValue={product.slug}
              className={`mt-2 ${inputClass} font-mono`}
            />
            <p className="mt-1 text-xs text-ink-500">
              Products have no public page of their own — the slug identifies the
              row and seeds its placeholder image.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-card border border-line bg-white p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
          Editorial
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="shortDescription"
              className="block text-sm font-semibold text-navy-900"
            >
              What it is
            </label>
            <textarea
              id="shortDescription"
              name="shortDescription"
              rows={2}
              placeholder="The factual description — size, material, capacity."
              defaultValue={product.short_description ?? ""}
              className={`mt-2 ${inputClass}`}
            />
            <p className="mt-1 text-xs text-ink-500">
              Specifications only. Keep judgments in the field below so a spec
              sheet is never mistaken for our opinion.
            </p>
          </div>

          <div>
            <label
              htmlFor="editorialSummary"
              className="block text-sm font-semibold text-navy-900"
            >
              Our take
            </label>
            <textarea
              id="editorialSummary"
              name="editorialSummary"
              rows={3}
              placeholder="The specific reason this is worth recommending."
              defaultValue={product.editorial_summary ?? ""}
              className={`mt-2 ${inputClass}`}
            />
            <p className="mt-1 text-xs text-ink-500">
              Never write that we tested something we did not test.
            </p>
          </div>

          <MediaField
            name="imageMediaId"
            urlName="imageUrl"
            value={imageMedia}
            urlValue={product.image_url ?? null}
            library={library}
            label="Product image"
            hint="Owned, licensed or manufacturer-supplied only. Blank renders a branded placeholder."
          />
        </div>
      </section>

      <section className="rounded-card border border-line bg-white p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
          Publishing
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="status" className="block text-sm font-semibold text-navy-900">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={product.status}
              className={`mt-2 ${inputClass} bg-white sm:max-w-xs`}
            >
              <option value="draft">Draft</option>
              <option value="review">In review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <p className="mt-1 text-xs text-ink-500">
              A draft product is hidden everywhere it appears — its offers and
              recommendations are hidden with it, enforced by RLS.
            </p>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-ink-700">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={product.featured}
              className="size-4 rounded border-line text-brand-600 focus:ring-2 focus:ring-brand-500"
            />
            Featured
          </label>
        </div>
      </section>

      <FormError message={state.error} />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              Saving
            </>
          ) : (
            "Save Product"
          )}
        </button>

        {state.ok && !pending ? (
          <span role="status" className="flex items-center gap-1.5 text-sm text-brand-600">
            <Check aria-hidden="true" className="size-4" />
            Saved
          </span>
        ) : null}
      </div>
    </form>
  );
}
