"use client";

import { Check, Loader2 } from "lucide-react";
import { useActionState } from "react";

import { FormError } from "@/components/forms/Field";
import { saveRankingDetails, type ActionState } from "@/app/admin/rankings/actions";
import type { Category, Place, RankingWithEntries } from "@/types/database";

export interface RankingDetailsFormProps {
  ranking: RankingWithEntries;
  categories: Category[];
  places: Place[];
}

export function RankingDetailsForm({
  ranking,
  categories,
  places,
}: RankingDetailsFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveRankingDetails,
    {},
  );

  const inputClass =
    "w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={ranking.id} />

      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-navy-900">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={ranking.title}
          className={`mt-2 ${inputClass}`}
        />
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-semibold text-navy-900">
          Slug
        </label>
        <div className="mt-2 flex items-center gap-2">
          <span className="shrink-0 font-mono text-xs text-ink-400">/best/</span>
          <input
            id="slug"
            name="slug"
            type="text"
            required
            defaultValue={ranking.slug}
            className={`${inputClass} font-mono`}
          />
        </div>
        <p className="mt-1 text-xs text-ink-500">
          Changing this breaks existing links to a published ranking. Change it
          only before the first publish.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="categoryId" className="block text-sm font-semibold text-navy-900">
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={ranking.category_id ?? ""}
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
          <label htmlFor="placeId" className="block text-sm font-semibold text-navy-900">
            Place
          </label>
          <select
            id="placeId"
            name="placeId"
            defaultValue={ranking.place_id ?? ""}
            className={`mt-2 ${inputClass} bg-white`}
          >
            <option value="">No place</option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="geography" className="block text-sm font-semibold text-navy-900">
            Geography label
          </label>
          <input
            id="geography"
            name="geography"
            type="text"
            placeholder="Long Island"
            defaultValue={ranking.geography ?? ""}
            className={`mt-2 ${inputClass}`}
          />
        </div>

        <div>
          <label htmlFor="authorName" className="block text-sm font-semibold text-navy-900">
            Author
          </label>
          <input
            id="authorName"
            name="authorName"
            type="text"
            placeholder="The LongIsland.io Editorial Team"
            defaultValue={ranking.author_name ?? ""}
            className={`mt-2 ${inputClass}`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-semibold text-navy-900">
          Dek
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          placeholder="One sentence shown on cards and in search results."
          defaultValue={ranking.description ?? ""}
          className={`mt-2 ${inputClass}`}
        />
      </div>

      <div>
        <label htmlFor="intro" className="block text-sm font-semibold text-navy-900">
          Intro
        </label>
        <textarea
          id="intro"
          name="intro"
          rows={5}
          placeholder="The opening paragraph readers see above the list."
          defaultValue={ranking.intro ?? ""}
          className={`mt-2 ${inputClass}`}
        />
      </div>

      <div>
        <label htmlFor="methodology" className="block text-sm font-semibold text-navy-900">
          Methodology
        </label>
        <textarea
          id="methodology"
          name="methodology"
          rows={5}
          placeholder="How this list was researched and ordered. Shown on the page."
          defaultValue={ranking.methodology ?? ""}
          className={`mt-2 ${inputClass}`}
        />
        <p className="mt-1 text-xs text-ink-500">
          Published on the page under &ldquo;How we chose&rdquo;. Be specific —
          this is what makes the list defensible.
        </p>
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
          ) : (
            "Save Draft"
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
