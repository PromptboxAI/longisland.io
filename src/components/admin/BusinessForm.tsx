"use client";

import { Check, Loader2 } from "lucide-react";
import { useActionState } from "react";

import { saveBusiness, type BusinessActionState } from "@/app/admin/businesses/actions";
import { FormError } from "@/components/forms/Field";
import { MediaField } from "@/components/admin/MediaField";
import type { MediaAsset } from "@/types/media";
import type { Business, Category } from "@/types/database";

export interface BusinessFormProps {
  business: Business;
  categories: Category[];
  library: MediaAsset[];
  primaryMedia: MediaAsset | null;
}

export function BusinessForm({
  business,
  categories,
  library,
  primaryMedia,
}: BusinessFormProps) {
  const [state, formAction, pending] = useActionState<BusinessActionState, FormData>(
    saveBusiness,
    {},
  );

  const inputClass =
    "w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={business.id} />

      <section className="rounded-card border border-line bg-white p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
          Identity
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-navy-900">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={business.name}
              className={`mt-2 ${inputClass}`}
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-semibold text-navy-900">
              Slug
            </label>
            <div className="mt-2 flex items-center gap-2">
              <span className="shrink-0 font-mono text-xs text-ink-400">
                /business/
              </span>
              <input
                id="slug"
                name="slug"
                type="text"
                required
                defaultValue={business.slug}
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
                defaultValue={business.category_id ?? ""}
                className={`mt-2 ${inputClass} bg-white`}
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="subcategory"
                className="block text-sm font-semibold text-navy-900"
              >
                Subcategory
              </label>
              <input
                id="subcategory"
                name="subcategory"
                type="text"
                defaultValue={business.subcategory ?? ""}
                className={`mt-2 ${inputClass}`}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-card border border-line bg-white p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
          Location and contact
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="address" className="block text-sm font-semibold text-navy-900">
              Address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              defaultValue={business.address ?? ""}
              className={`mt-2 ${inputClass}`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="city" className="block text-sm font-semibold text-navy-900">
                Town
              </label>
              <input
                id="city"
                name="city"
                type="text"
                defaultValue={business.city ?? ""}
                className={`mt-2 ${inputClass}`}
              />
            </div>

            <div>
              <label htmlFor="county" className="block text-sm font-semibold text-navy-900">
                County
              </label>
              <select
                id="county"
                name="county"
                defaultValue={business.county ?? ""}
                className={`mt-2 ${inputClass} bg-white`}
              >
                <option value="">Not set</option>
                <option value="Nassau County">Nassau County</option>
                <option value="Suffolk County">Suffolk County</option>
              </select>
            </div>

            <div>
              <label htmlFor="zip" className="block text-sm font-semibold text-navy-900">
                ZIP
              </label>
              <input
                id="zip"
                name="zip"
                type="text"
                defaultValue={business.zip ?? ""}
                className={`mt-2 ${inputClass}`}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-navy-900">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={business.phone ?? ""}
                className={`mt-2 ${inputClass}`}
              />
            </div>

            <div>
              <label htmlFor="website" className="block text-sm font-semibold text-navy-900">
                Website
              </label>
              <input
                id="website"
                name="website"
                type="url"
                placeholder="https://"
                defaultValue={business.website ?? ""}
                className={`mt-2 ${inputClass}`}
              />
            </div>
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
              htmlFor="description"
              className="block text-sm font-semibold text-navy-900"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="What this place is, in a sentence or two."
              defaultValue={business.description ?? ""}
              className={`mt-2 ${inputClass}`}
            />
          </div>

          <div>
            <label
              htmlFor="editorialSummary"
              className="block text-sm font-semibold text-navy-900"
            >
              Why LongIsland.io likes it
            </label>
            <textarea
              id="editorialSummary"
              name="editorialSummary"
              rows={3}
              placeholder="The specific reason this is worth someone's time."
              defaultValue={business.editorial_summary ?? ""}
              className={`mt-2 ${inputClass}`}
            />
          </div>

          <MediaField
            name="primaryMediaId"
            urlName="primaryImageUrl"
            value={primaryMedia}
            urlValue={business.primary_image_url ?? null}
            library={library}
            label="Primary image"
            hint="1200 × 900 (4:3). Owned, licensed or business-provided photography only. Never a third-party listing photo."
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
              defaultValue={business.status}
              className={`mt-2 ${inputClass} bg-white sm:max-w-xs`}
            >
              <option value="draft">Draft</option>
              <option value="review">In review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <p className="mt-1 text-xs text-ink-500">
              Only published businesses are visible to the public, enforced by RLS.
            </p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2.5 text-sm text-ink-700">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={business.featured}
                className="size-4 rounded border-line text-brand-600 focus:ring-2 focus:ring-brand-500"
              />
              Featured
            </label>

            <label className="flex items-center gap-2.5 text-sm text-ink-700">
              <input
                type="checkbox"
                name="claimed"
                defaultChecked={business.claimed}
                className="size-4 rounded border-line text-brand-600 focus:ring-2 focus:ring-brand-500"
              />
              Claimed by owner
            </label>
          </div>
        </div>
      </section>

      <fieldset className="rounded-card border border-line bg-sand-50 p-4">
        <legend className="px-1 text-xs font-bold uppercase tracking-wider text-ink-500">
          Search &amp; sharing
        </legend>
        <div className="space-y-3">
          <div>
            <label htmlFor="seoTitle" className="block text-sm font-semibold text-navy-900">
              SEO title
            </label>
            <input
              id="seoTitle"
              name="seoTitle"
              maxLength={70}
              defaultValue={business.seo_title ?? ""}
              placeholder={business.name}
              className={`mt-2 ${inputClass}`}
            />
          </div>
          <div>
            <label
              htmlFor="seoDescription"
              className="block text-sm font-semibold text-navy-900"
            >
              SEO description
            </label>
            <textarea
              id="seoDescription"
              name="seoDescription"
              rows={2}
              maxLength={200}
              defaultValue={business.seo_description ?? ""}
              placeholder={business.description ?? "Falls back to the description."}
              className={`mt-2 ${inputClass}`}
            />
          </div>
        </div>
      </fieldset>

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
            "Save Business"
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
