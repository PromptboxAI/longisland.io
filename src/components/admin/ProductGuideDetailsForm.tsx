"use client";

import { Check, Loader2 } from "lucide-react";
import { useActionState } from "react";

import {
  saveGuideDetails,
  type ActionState,
} from "@/app/admin/product-rankings/actions";
import { FormError } from "@/components/forms/Field";
import { PRODUCT_RESEARCH_NOTICE } from "@/lib/affiliate";
import type { Category } from "@/types/database";
import type { ProductCategory, ProductRankingWithEntries } from "@/types/products";

export interface ProductGuideDetailsFormProps {
  guide: ProductRankingWithEntries;
  categories: ProductCategory[];
  localCategories: Category[];
}

const inputClass =
  "w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";

export function ProductGuideDetailsForm({
  guide,
  categories,
  localCategories,
}: ProductGuideDetailsFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveGuideDetails,
    {},
  );

  const grouped = categories
    .filter((category) => !category.parent_id)
    .flatMap((parent) => [
      parent,
      ...categories.filter((child) => child.parent_id === parent.id),
    ]);

  const isPublished = guide.status === "published";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={guide.id} />

      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-navy-900">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={guide.title}
          className={`mt-2 ${inputClass}`}
        />
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-semibold text-navy-900">
          Slug
        </label>
        <div className="mt-2 flex items-center gap-2">
          <span className="shrink-0 font-mono text-xs text-ink-400">/products/</span>
          <input
            id="slug"
            name="slug"
            type="text"
            required
            defaultValue={guide.slug}
            className={`${inputClass} font-mono`}
          />
        </div>
        {isPublished ? (
          <p className="mt-1 text-xs text-ink-500">
            This guide is published. Changing the slug breaks every existing link
            to it and the search ranking that came with them.
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="categoryId" className="block text-sm font-semibold text-navy-900">
          Product category
        </label>
        <select
          id="categoryId"
          name="categoryId"
          defaultValue={guide.category_id ?? ""}
          className={`mt-2 ${inputClass} bg-white`}
        >
          <option value="">No category</option>
          {grouped.map((category) => (
            <option key={category.id} value={category.id}>
              {category.parent_id ? `  ${category.name}` : category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="localCategoryId"
          className="block text-sm font-semibold text-navy-900"
        >
          Related local category
        </label>
        <select
          id="localCategoryId"
          name="localCategoryId"
          defaultValue={guide.local_category_id ?? ""}
          className={`mt-2 ${inputClass} bg-white`}
        >
          <option value="">No cross-link</option>
          {localCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink-500">
          Links this guide to local content in both directions: our rankings for
          that category appear at the foot of this guide, and this guide is
          offered on those pages.
        </p>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-semibold text-navy-900">
          Dek
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          placeholder="One sentence, for cards and search results."
          defaultValue={guide.description ?? ""}
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
          placeholder="Why this guide exists and what the standard was."
          defaultValue={guide.intro ?? ""}
          className={`mt-2 ${inputClass}`}
        />
      </div>

      <div>
        <label
          htmlFor="methodology"
          className="block text-sm font-semibold text-navy-900"
        >
          How we chose
        </label>
        <textarea
          id="methodology"
          name="methodology"
          rows={5}
          placeholder="How many products were considered, against what criteria, weighted for what."
          defaultValue={guide.methodology ?? ""}
          className={`mt-2 ${inputClass}`}
        />
        <p className="mt-1 text-xs text-ink-500">
          Never claim we bought or tested a product unless we did. Whatever you
          write here, the page also carries this line: &ldquo;
          {PRODUCT_RESEARCH_NOTICE}&rdquo;
        </p>
      </div>

      <div>
        <label htmlFor="authorName" className="block text-sm font-semibold text-navy-900">
          Author
        </label>
        <input
          id="authorName"
          name="authorName"
          type="text"
          defaultValue={guide.author_name ?? ""}
          className={`mt-2 ${inputClass}`}
        />
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
            "Save Details"
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
