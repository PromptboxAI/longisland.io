"use client";

import { useState } from "react";

import { MediaField } from "@/components/admin/MediaField";
import { useRankingTitle } from "@/components/admin/RankingEditorContext";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import { AiReviewPanel } from "@/components/admin/AiReviewPanel";
import { PendingChangesBar } from "@/components/admin/PendingChangesBar";
import {
  applyRankingChanges,
  discardRankingChanges,
} from "@/app/admin/rankings/actions";
import {
  applyRankingDraft,
  discardRankingDraft,
  generateRankingCopy,
  type StagedRankingDraft,
} from "@/app/admin/rankings/ai-actions";
import { displayValue } from "@/lib/editorial/field-policy";

/** Column name to the words on the form. */
const RANKING_FIELD_LABELS: Record<string, string> = {
  description: "Dek",
  intro: "Intro",
  methodology: "Methodology",
};
import { useAutosave } from "@/components/admin/useAutosave";
import { saveRankingDetails } from "@/app/admin/rankings/actions";
import type { Category, Place, RankingWithEntries } from "@/types/database";
import type { MediaAsset } from "@/types/media";

export interface RankingDetailsFormProps {
  ranking: RankingWithEntries;
  categories: Category[];
  places: Place[];
  library: MediaAsset[];
  heroMedia: MediaAsset | null;
  ogMedia: MediaAsset | null;
}

export function RankingDetailsForm({
  ranking,
  categories,
  places,
  library,
  heroMedia,
  ogMedia,
}: RankingDetailsFormProps) {
  const { setTitle } = useRankingTitle();
  const isPublished = ranking.status === "published";

  /*
   * What the editor sees is the pending value when there is one.
   *
   * The live page keeps the previous text until Update live page is pressed,
   * so reading the live value here would make an edit look lost on reload —
   * which is the failure the staging model exists to prevent, arriving by
   * another route.
   */
  const pendingChanges = (ranking.pending_changes ?? null) as Record<
    string,
    string
  > | null;

  /** The AI's proposal for the dek, intro and methodology. Never a field. */
  const [aiDraft, setAiDraft] = useState<StagedRankingDraft | null>(
    (ranking.ai_draft ?? null) as StagedRankingDraft | null,
  );

  const [fields, setFields] = useState({
    title: ranking.title,
    slug: ranking.slug,
    categoryId: ranking.category_id ?? "",
    placeId: ranking.place_id ?? "",
    geography: ranking.geography ?? "",
    authorName: ranking.author_name ?? "",
    description: displayValue("description", ranking.description, pendingChanges),
    intro: displayValue("intro", ranking.intro, pendingChanges),
    methodology: displayValue("methodology", ranking.methodology, pendingChanges),
    seoTitle: ranking.seo_title ?? "",
    seoDescription: ranking.seo_description ?? "",
  });
  // Media and the slug of a published ranking are not autosaved — see below.
  const [media, setMedia] = useState({
    heroMediaId: ranking.hero_media_id ?? "",
    heroImageUrl: ranking.hero_image_url ?? "",
    ogImageMediaId: ranking.og_image_media_id ?? "",
  });

  const set = (key: keyof typeof fields) => (value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
    if (key === "title") setTitle(value);
  };

  const {
    status,
    error,
    destination,
    stagedFields,
    setStagedFields,
    saveNow,
  } = useAutosave({ ...fields, ...media }, async (values) => {
    const form = new FormData();
    form.set("id", ranking.id);
    for (const [key, value] of Object.entries(values)) form.set(key, value);
    return saveRankingDetails({}, form);
  }, { published: isPublished });

  const inputClass =
    "w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="space-y-4">

      {/*
        Both of these sit above the fields they concern: a proposal to compare
        against what is there, and a statement of what readers are currently
        seeing. Below the form they would be found after the decision.
      */}
      {aiDraft ? (
        <AiReviewPanel
          fields={[
            ...(aiDraft.dek !== undefined
              ? [{ key: "dek", label: "Dek", value: aiDraft.dek, kind: "textarea" as const, staged: isPublished }]
              : []),
            ...(aiDraft.intro !== undefined
              ? [{ key: "intro", label: "Intro", value: aiDraft.intro, kind: "textarea" as const, staged: isPublished }]
              : []),
            ...(aiDraft.methodology !== undefined
              ? [{ key: "methodology", label: "Methodology", value: aiDraft.methodology, kind: "textarea" as const, staged: isPublished }]
              : []),
          ]}
          onApply={async (values) => {
            const result = await applyRankingDraft(ranking.id, values);
            if (result.error) return { error: result.error };
            setAiDraft(null);
            setFields((current) => ({
              ...current,
              ...(values.dek !== undefined ? { description: values.dek } : {}),
              ...(values.intro !== undefined ? { intro: values.intro } : {}),
              ...(values.methodology !== undefined
                ? { methodology: values.methodology }
                : {}),
            }));
            return {};
          }}
          onRegenerate={() => {
            void generateRankingCopy(ranking.id).then((result) => {
              if (!result.error) window.location.reload();
            });
          }}
          onDiscard={() => {
            setAiDraft(null);
            void discardRankingDraft(ranking.id);
          }}
        />
      ) : null}

      {isPublished ? (
        <div className="mb-4">
          <PendingChangesBar
            fieldLabels={(
              stagedFields ?? Object.keys(pendingChanges ?? {})
            ).map((key) => RANKING_FIELD_LABELS[key] ?? key)}
            onApply={async () => {
              const result = await applyRankingChanges(ranking.id);
              if (!result.error) setStagedFields([]);
              return result;
            }}
            onDiscard={async () => {
              const result = await discardRankingChanges(ranking.id);
              if (!result.error) setStagedFields([]);
              return result;
            }}
          />
        </div>
      ) : null}

      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-navy-900">
          Title
        </label>
        <input
          id="title"
          type="text"
          required
          value={fields.title}
          onChange={(event) => set("title")(event.target.value)}
          onBlur={saveNow}
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
              type="text"
            required
            value={fields.slug}
          onChange={(event) => set("slug")(event.target.value)}
          onBlur={saveNow}
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
              value={fields.categoryId}
          onChange={(event) => set("categoryId")(event.target.value)}
          onBlur={saveNow}
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
              value={fields.placeId}
          onChange={(event) => set("placeId")(event.target.value)}
          onBlur={saveNow}
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
              type="text"
            placeholder="Long Island"
            value={fields.geography}
          onChange={(event) => set("geography")(event.target.value)}
          onBlur={saveNow}
            className={`mt-2 ${inputClass}`}
          />
        </div>

        <div>
          <label htmlFor="authorName" className="block text-sm font-semibold text-navy-900">
            Author
          </label>
          <input
            id="authorName"
              type="text"
            placeholder="The LongIsland.io Editorial Team"
            value={fields.authorName}
          onChange={(event) => set("authorName")(event.target.value)}
          onBlur={saveNow}
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
          rows={2}
          placeholder="One sentence shown on cards and in search results."
          value={fields.description}
          onChange={(event) => set("description")(event.target.value)}
          onBlur={saveNow}
          className={`mt-2 ${inputClass}`}
        />
      </div>

      <MediaField
        name="heroMediaId"
        urlName="heroImageUrl"
        value={heroMedia}
        urlValue={ranking.hero_image_url ?? null}
        library={library}
        label="Hero image"
        hint="2000 × 1125 (16:9). Used on the ranking page, on cards, and when this list is shared."
        onChange={(mediaId, url) =>
          setMedia((current) => ({
            ...current,
            heroMediaId: mediaId ?? "",
            heroImageUrl: url ?? "",
          }))
        }
      />

      <div>
        <label htmlFor="intro" className="block text-sm font-semibold text-navy-900">
          Intro
        </label>
        <textarea
          id="intro"
          rows={5}
          placeholder="The opening paragraph readers see above the list."
          value={fields.intro}
          onChange={(event) => set("intro")(event.target.value)}
          onBlur={saveNow}
          className={`mt-2 ${inputClass}`}
        />
      </div>

      <div>
        <label htmlFor="methodology" className="block text-sm font-semibold text-navy-900">
          Methodology
        </label>
        <textarea
          id="methodology"
          rows={5}
          placeholder="How this list was researched and ordered. Shown on the page."
          value={fields.methodology}
          onChange={(event) => set("methodology")(event.target.value)}
          onBlur={saveNow}
          className={`mt-2 ${inputClass}`}
        />
        <p className="mt-1 text-xs text-ink-500">
          Published on the page under &ldquo;How we chose&rdquo;. Be specific —
          this is what makes the list defensible.
        </p>
      </div>

      {/*
        SEO lives on the record rather than on a separate screen. Kept next to
        the copy it describes, it gets written while the page is fresh in mind;
        on its own dashboard it is filled in last, by someone who has forgotten
        what the page says.
      */}
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
                  maxLength={70}
              value={fields.seoTitle}
          onChange={(event) => set("seoTitle")(event.target.value)}
          onBlur={saveNow}
              placeholder={ranking.title}
              className={`mt-2 ${inputClass}`}
            />
            <p className="mt-1 text-xs text-ink-500">
              Leave blank to use the headline.
            </p>
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
                  rows={2}
              maxLength={200}
              value={fields.seoDescription}
          onChange={(event) => set("seoDescription")(event.target.value)}
          onBlur={saveNow}
              placeholder={ranking.description ?? "Falls back to the dek."}
              className={`mt-2 ${inputClass}`}
            />
          </div>

          <MediaField
            name="ogImageMediaId"
            value={ogMedia}
            library={library}
            label="Social share image"
            hint="1200 × 630. Optional — falls back to the hero image."
            onChange={(mediaId) =>
              setMedia((current) => ({ ...current, ogImageMediaId: mediaId ?? "" }))
            }
          />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <SaveIndicator status={status} error={error} destination={destination} />
        <p className="text-xs text-ink-400">
          Changes save as you type. Publishing and deleting stay explicit.
        </p>
      </div>

      {isPublished ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          This ranking is published. Changing the slug moves its URL and breaks
          any link already pointing at the old one.
        </p>
      ) : null}
    </div>

  );
}
