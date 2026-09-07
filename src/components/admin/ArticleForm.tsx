"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";

import { saveArticle, type ArticleActionState } from "@/app/admin/articles/actions";
import { MediaField } from "@/components/admin/MediaField";
import { FormError } from "@/components/forms/Field";
import { ARTICLE_KINDS, type ArticleWithRelations } from "@/types/articles";
import type { Category, Place } from "@/types/database";
import type { MediaAsset } from "@/types/media";

const INPUT =
  "w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";
const LABEL = "block text-sm font-semibold text-navy-900";

export interface ArticleFormProps {
  article: ArticleWithRelations;
  categories: Category[];
  places: Place[];
  library: MediaAsset[];
}

export function ArticleForm({
  article,
  categories,
  places,
  library,
}: ArticleFormProps) {
  const [state, formAction, pending] = useActionState<ArticleActionState, FormData>(
    saveArticle,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={article.id} />

      <div>
        <label htmlFor="title" className={LABEL}>
          Headline
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={4}
          defaultValue={article.title}
          className={`mt-2 ${INPUT}`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="slug" className={LABEL}>
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            required
            defaultValue={article.slug}
            className={`mt-2 ${INPUT} font-mono`}
          />
          <p className="mt-1 font-mono text-xs text-ink-400">
            /articles/{article.slug}
          </p>
        </div>

        <div>
          <label htmlFor="kind" className={LABEL}>
            Kind
          </label>
          <select
            id="kind"
            name="kind"
            defaultValue={article.kind}
            className={`mt-2 ${INPUT}`}
          >
            {ARTICLE_KINDS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-500">
            Changes the label and how it filters. Everything else is identical.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="categoryId" className={LABEL}>
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={article.category_id ?? ""}
            className={`mt-2 ${INPUT}`}
          >
            <option value="">None</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="placeId" className={LABEL}>
            Place
          </label>
          <select
            id="placeId"
            name="placeId"
            defaultValue={article.place_id ?? ""}
            className={`mt-2 ${INPUT}`}
          >
            <option value="">None</option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="authorName" className={LABEL}>
            Byline
          </label>
          <input
            id="authorName"
            name="authorName"
            defaultValue={article.author_name ?? ""}
            placeholder="LongIsland.io Editors"
            className={`mt-2 ${INPUT}`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="dek" className={LABEL}>
          Standfirst
        </label>
        <textarea
          id="dek"
          name="dek"
          rows={2}
          defaultValue={article.dek ?? ""}
          placeholder="One or two sentences under the headline, and on every card."
          className={`mt-2 ${INPUT}`}
        />
      </div>

      <MediaField
        name="heroMediaId"
        urlName="heroImageUrl"
        value={article.hero_media}
        urlValue={article.hero_image_url ?? null}
        library={library}
        label="Hero image"
      />

      <div>
        <label htmlFor="heroImageAlt" className={LABEL}>
          Hero alt text override
        </label>
        <input
          id="heroImageAlt"
          name="heroImageAlt"
          defaultValue={article.hero_image_alt ?? ""}
          placeholder={article.hero_media?.alt_text ?? "Uses the library alt text"}
          className={`mt-2 ${INPUT}`}
        />
        <p className="mt-1 text-xs text-ink-500">
          Only needed when the library description is not the right one here.
        </p>
      </div>

      <div>
        <label htmlFor="body" className={LABEL}>
          Body
        </label>
        <textarea
          id="body"
          name="body"
          rows={20}
          defaultValue={article.body ?? ""}
          placeholder={"## A heading\n\nMarkdown. **Bold**, _italic_, [links](https://example.com), lists and quotes."}
          className={`mt-2 ${INPUT} font-mono text-[13px] leading-relaxed`}
        />
        <p className="mt-1 text-xs text-ink-500">
          Markdown. Rendered through a sanitiser, so raw HTML is stripped rather
          than executed.
        </p>
      </div>

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
              defaultValue={article.seo_title ?? ""}
              placeholder={article.title}
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
              defaultValue={article.seo_description ?? ""}
              placeholder={article.dek ?? "Falls back to the standfirst."}
              className={`mt-2 ${INPUT}`}
            />
          </div>

          <MediaField
            name="ogImageMediaId"
            value={article.og_media}
            library={library}
            label="Social share image"
            hint="Optional. Falls back to the hero image."
          />
        </div>
      </fieldset>

      <FormError message={state.error} />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
        >
          {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          Save draft
        </button>
        {state.ok ? (
          <span className="text-sm font-semibold text-emerald-700">Saved</span>
        ) : null}
      </div>
    </form>
  );
}
