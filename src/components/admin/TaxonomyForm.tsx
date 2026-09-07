"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";

import { saveCategory, type CategoryActionState } from "@/app/admin/categories/actions";
import { savePlace, type PlaceActionState } from "@/app/admin/places/actions";
import { MediaField } from "@/components/admin/MediaField";
import { FormError } from "@/components/forms/Field";
import type { Category, Place, PlaceType } from "@/types/database";
import type { MediaAsset } from "@/types/media";

/**
 * The editor for a category or a place.
 *
 * One component for both because they are the same shape — a name, a slug, a
 * parent, a description, a picture, and whether they are featured — and the
 * only real difference is that a place also has a type. Two nearly identical
 * files would drift apart within a month.
 *
 * `featured` and `sort_order` are what let the homepage stop naming slugs in
 * code. They are taxonomy facts rather than weekly editorial judgments, which
 * is why they sit on the row instead of in an editorial section.
 */

const INPUT =
  "w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";
const LABEL = "block text-sm font-semibold text-navy-900";

const PLACE_TYPES: { value: PlaceType; label: string }[] = [
  { value: "island", label: "Island" },
  { value: "county", label: "County" },
  { value: "region", label: "Region (shore, fork, East End)" },
  { value: "town", label: "Town" },
  { value: "village", label: "Village" },
  { value: "hamlet", label: "Hamlet" },
];

export interface TaxonomyFormProps {
  kind: "category" | "place";
  record: Category | Place;
  /** Possible parents — the same table, minus this record. */
  parents: { id: string; name: string }[];
  library: MediaAsset[];
  heroMedia: MediaAsset | null;
}

export function TaxonomyForm({
  kind,
  record,
  parents,
  library,
  heroMedia,
}: TaxonomyFormProps) {
  const action = kind === "category" ? saveCategory : savePlace;
  const [state, formAction, pending] = useActionState<
    CategoryActionState | PlaceActionState,
    FormData
  >(action, {});

  const place = kind === "place" ? (record as Place) : null;
  const category = kind === "category" ? (record as Category) : null;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={record.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={LABEL}>
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={record.name}
            className={`mt-2 ${INPUT}`}
          />
        </div>

        <div>
          <label htmlFor="slug" className={LABEL}>
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            required
            defaultValue={record.slug}
            className={`mt-2 ${INPUT} font-mono`}
          />
          <p className="mt-1 font-mono text-xs text-ink-400">
            /{kind === "category" ? "category" : "place"}/{record.slug}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {place ? (
          <div>
            <label htmlFor="type" className={LABEL}>
              Type
            </label>
            <select
              id="type"
              name="type"
              defaultValue={place.type}
              className={`mt-2 ${INPUT}`}
            >
              {PLACE_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label htmlFor="parentId" className={LABEL}>
            Sits inside
          </label>
          <select
            id="parentId"
            name="parentId"
            defaultValue={record.parent_id ?? ""}
            className={`mt-2 ${INPUT}`}
          >
            <option value="">Top level</option>
            {parents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
              </option>
            ))}
          </select>
        </div>

        {place ? (
          <div>
            <label htmlFor="county" className={LABEL}>
              County
            </label>
            <input
              id="county"
              name="county"
              defaultValue={place.county ?? ""}
              placeholder="Suffolk County"
              className={`mt-2 ${INPUT}`}
            />
          </div>
        ) : (
          <div>
            <label htmlFor="icon" className={LABEL}>
              Icon
            </label>
            <input
              id="icon"
              name="icon"
              defaultValue={category?.icon ?? ""}
              placeholder="pizza"
              className={`mt-2 ${INPUT}`}
            />
          </div>
        )}
      </div>

      <div>
        <label htmlFor="description" className={LABEL}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={record.description ?? ""}
          placeholder="Shown at the top of the page and on cards."
          className={`mt-2 ${INPUT}`}
        />
      </div>

      <MediaField
        name="heroMediaId"
        urlName="heroImageUrl"
        value={heroMedia}
        urlValue={record.hero_image_url ?? null}
        library={library}
        label="Hero image"
        hint={
          kind === "category"
            ? "1600 × 900 (16:9)."
            : "1200 × 900 (4:3)."
        }
      />

      <fieldset className="rounded-card border border-line bg-sand-50 p-4">
        <legend className="px-1 text-xs font-bold uppercase tracking-wider text-ink-500">
          Prominence
        </legend>

        <div className="flex flex-wrap items-end gap-6">
          <label className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={record.featured}
              className="size-4 rounded border-line"
            />
            Featured
          </label>

          <div>
            <label htmlFor="sortOrder" className="block text-xs font-semibold text-navy-900">
              Order
            </label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              min={0}
              max={999}
              defaultValue={record.sort_order}
              className={`mt-1 w-24 ${INPUT}`}
            />
          </div>
        </div>

        <p className="mt-2 text-xs text-ink-500">
          Featured {kind === "category" ? "categories" : "places"} are the ones
          offered on the homepage, lowest order first.
        </p>
      </fieldset>

      <fieldset className="rounded-card border border-line bg-sand-50 p-4">
        <legend className="px-1 text-xs font-bold uppercase tracking-wider text-ink-500">
          Search &amp; sharing
        </legend>

        <div className="space-y-3">
          <div>
            <label htmlFor="seoTitle" className={LABEL}>
              SEO title
            </label>
            <input
              id="seoTitle"
              name="seoTitle"
              maxLength={70}
              defaultValue={record.seo_title ?? ""}
              placeholder={record.name}
              className={`mt-2 ${INPUT}`}
            />
          </div>
          <div>
            <label htmlFor="seoDescription" className={LABEL}>
              SEO description
            </label>
            <textarea
              id="seoDescription"
              name="seoDescription"
              rows={2}
              maxLength={200}
              defaultValue={record.seo_description ?? ""}
              placeholder={record.description ?? "Falls back to the description."}
              className={`mt-2 ${INPUT}`}
            />
          </div>
        </div>
      </fieldset>

      <div>
        <label htmlFor="status" className={LABEL}>
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={record.status}
          className={`mt-2 ${INPUT} sm:max-w-xs`}
        >
          <option value="draft">Draft</option>
          <option value="review">In review</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <p className="mt-1 text-xs text-ink-500">
          Only published {kind === "category" ? "categories" : "places"} are
          visible to readers, and only published ones can be featured in a
          curated section.
        </p>
      </div>

      <FormError message={state.error} />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
        >
          {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          Save
        </button>
        {state.ok ? (
          <span className="text-sm font-semibold text-emerald-700">Saved</span>
        ) : null}
      </div>
    </form>
  );
}
