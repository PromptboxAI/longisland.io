"use client";

import { Check, Loader2 } from "lucide-react";
import { useActionState, useState } from "react";

import {
  createSection,
  updateSection,
  type EditorialActionState,
} from "@/app/admin/editorial/actions";
import { FormError } from "@/components/forms/Field";
import {
  SECTION_KEYS,
  SECTION_LAYOUTS,
  type Category,
  type EditorialSection,
  type Place,
  type SectionScope,
} from "@/types/database";

export interface SectionFormProps {
  section?: EditorialSection;
  categories: Category[];
  places: Place[];
}

const LAYOUT_HINT: Record<string, string> = {
  feature: "One dominant item — the homepage lead slot.",
  rail: "A narrow vertical list beside the main column.",
  grid: "A row of cards.",
  link_row: "Inline text links, e.g. under a category heading.",
};

export function SectionForm({ section, categories, places }: SectionFormProps) {
  const isEdit = Boolean(section);
  const [state, formAction, pending] = useActionState<EditorialActionState, FormData>(
    isEdit ? updateSection : createSection,
    {},
  );
  const [scope, setScope] = useState<SectionScope>(section?.scope_type ?? "global");

  const input =
    "w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <form action={formAction} className="space-y-4">
      {section ? <input type="hidden" name="id" value={section.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="key" className="block text-sm font-semibold text-navy-900">
            Section key
          </label>
          <input
            id="key"
            name="key"
            list="section-keys"
            required
            defaultValue={section?.key ?? ""}
            placeholder="homepage_primary"
            className={`mt-2 ${input} font-mono`}
          />
          <datalist id="section-keys">
            {SECTION_KEYS.map((key) => (
              <option key={key} value={key} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-ink-500">
            What the site asks for by name. Lowercase, underscores.
          </p>
        </div>

        <div>
          <label htmlFor="layout" className="block text-sm font-semibold text-navy-900">
            Layout
          </label>
          <select
            id="layout"
            name="layout"
            defaultValue={section?.layout ?? "grid"}
            className={`mt-2 ${input} bg-white`}
          >
            {SECTION_LAYOUTS.map((layout) => (
              <option key={layout} value={layout}>
                {layout}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-500">
            {LAYOUT_HINT[section?.layout ?? "grid"] ??
              "A hint for whichever component renders this section."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="scopeType" className="block text-sm font-semibold text-navy-900">
            Scope
          </label>
          <select
            id="scopeType"
            name="scopeType"
            value={scope}
            onChange={(event) => setScope(event.target.value as SectionScope)}
            className={`mt-2 ${input} bg-white`}
          >
            <option value="global">Global (site-wide)</option>
            <option value="category">Category</option>
            <option value="place">Place</option>
          </select>
        </div>

        {scope === "category" ? (
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
              defaultValue={section?.category_id ?? ""}
              className={`mt-2 ${input} bg-white`}
            >
              <option value="">Choose a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {scope === "place" ? (
          <div>
            <label htmlFor="placeId" className="block text-sm font-semibold text-navy-900">
              Place
            </label>
            <select
              id="placeId"
              name="placeId"
              defaultValue={section?.place_id ?? ""}
              className={`mt-2 ${input} bg-white`}
            >
              <option value="">Choose a place</option>
              {places.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-navy-900">
          Title
        </label>
        <input
          id="title"
          name="title"
          defaultValue={section?.title ?? ""}
          placeholder="Our Top Picks"
          className={`mt-2 ${input}`}
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-semibold text-navy-900">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={section?.description ?? ""}
          className={`mt-2 ${input}`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="maxItems" className="block text-sm font-semibold text-navy-900">
            Max items
          </label>
          <input
            id="maxItems"
            name="maxItems"
            type="number"
            min={1}
            max={50}
            defaultValue={section?.max_items ?? ""}
            placeholder="No limit"
            className={`mt-2 ${input}`}
          />
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-semibold text-navy-900">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={section?.status ?? "draft"}
            className={`mt-2 ${input} bg-white`}
          >
            <option value="draft">Draft</option>
            <option value="review">In review</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <p className="mt-1 text-xs text-ink-500">
            A draft section hides all of its items from the public site.
          </p>
        </div>
      </div>

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
          ) : isEdit ? (
            "Save section"
          ) : (
            "Create section"
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
