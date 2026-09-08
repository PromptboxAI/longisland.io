"use client";

import { ArrowDown, ArrowUp, Check, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { useActionState, useRef, useState, useTransition } from "react";

import {
  addSectionItem,
  moveSectionItem,
  removeSectionItem,
  updateSectionItem,
  type EditorialActionState,
} from "@/app/admin/editorial/actions";
import { FormError } from "@/components/forms/Field";
import { MediaField } from "@/components/admin/MediaField";
import { TargetPicker } from "@/components/admin/TargetPicker";
import { findPlacement } from "@/lib/editorial/placements";
import { resolveImageUrl } from "@/lib/media/resolve";
import type { TargetPreview } from "@/lib/data/admin-queries";
import type { TargetKind, TargetResult } from "@/lib/data/target-search";
import type { EditorialSectionItemWithTargets } from "@/types/database";
import type { MediaAsset } from "@/types/media";

const INPUT =
  "w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";

/** What the item inherits when an override is blank. Mirrors resolveItem(). */
function inherited(item: EditorialSectionItemWithTargets) {
  if (item.ranking) {
    return {
      type: "Ranking" as const,
      name: item.ranking.title,
      href: `/best/${item.ranking.slug}`,
      status: item.ranking.status,
      kicker: item.ranking.geography,
      headline: item.ranking.title,
      dek: item.ranking.description,
      image: resolveImageUrl(item.ranking.hero_media, item.ranking.hero_image_url),
      media: item.ranking.hero_media ?? null,
    };
  }
  if (item.business) {
    return {
      type: "Business" as const,
      name: item.business.name,
      href: `/business/${item.business.slug}`,
      status: item.business.status,
      kicker: item.business.city,
      headline: item.business.name,
      dek: item.business.description,
      image: resolveImageUrl(item.business.primary_media, item.business.primary_image_url),
      media: item.business.primary_media ?? null,
    };
  }
  if (item.category) {
    return {
      type: "Category" as const,
      name: item.category.name,
      href: `/category/${item.category.slug}`,
      status: item.category.status,
      kicker: null,
      headline: item.category.name,
      dek: item.category.description,
      image: resolveImageUrl(item.category.hero_media, item.category.hero_image_url),
      media: item.category.hero_media ?? null,
    };
  }
  if (item.place) {
    return {
      type: "Place" as const,
      name: item.place.name,
      href: `/place/${item.place.slug}`,
      status: item.place.status,
      kicker: item.place.county,
      headline: item.place.name,
      dek: item.place.description,
      image: resolveImageUrl(item.place.hero_media, item.place.hero_image_url),
      media: item.place.hero_media ?? null,
    };
  }
  if (item.product) {
    return {
      type: "Product" as const,
      name: item.product.name,
      // A product has no page of its own; the card links only to the merchant.
      href: "",
      status: item.product.status,
      kicker: item.product.brand,
      headline: item.product.name,
      dek: item.product.short_description,
      image: resolveImageUrl(item.product.image_media, item.product.image_url),
      media: item.product.image_media ?? null,
    };
  }
  if (item.article) {
    return {
      type: "Article" as const,
      name: item.article.title,
      href: `/articles/${item.article.slug}`,
      status: item.article.status,
      kicker: null,
      headline: item.article.title,
      dek: item.article.dek,
      image: resolveImageUrl(item.article.hero_media, item.article.hero_image_url),
      media: item.article.hero_media ?? null,
    };
  }
  if (item.product_ranking) {
    return {
      type: "Product guide" as const,
      name: item.product_ranking.title,
      href: `/products/${item.product_ranking.slug}`,
      status: item.product_ranking.status,
      kicker: null,
      headline: item.product_ranking.title,
      dek: item.product_ranking.description,
      image: resolveImageUrl(item.product_ranking.hero_media, item.product_ranking.hero_image_url),
      media: item.product_ranking.hero_media ?? null,
    };
  }
  return {
    type: "External" as const,
    name: item.external_url ?? "",
    href: item.external_url ?? "",
    status: "published",
    kicker: null,
    headline: null,
    dek: null,
    image: null,
    media: null,
  };
}

/** Placeholder text that shows what will render if the field is left blank. */
function inheritPlaceholder(value: string | null): string {
  return value ? `Inherits: ${value}` : "No inherited value";
}

/* -------------------------------------------------------------------------- */
/* Add item                                                                    */
/* -------------------------------------------------------------------------- */

export function AddSectionItem({
  sectionId,
  placementKey,
  returnTo,
}: {
  sectionId: string;
  /** Which placement this is, so the picker searches only what it accepts. */
  placementKey?: string | null;
  /** Where a "create new" link should come back to. */
  returnTo?: string;
}) {
  const [external, setExternal] = useState(false);
  const [chosen, setChosen] = useState<TargetResult | null>(null);
  /*
   * What was just added, so the click has a visible result.
   *
   * Adding used to do nothing an editor could see: the preview panel stayed put
   * and the new row appeared far below the fold, so the reasonable conclusion
   * was that the button had not worked.
   */
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const chosenRef = useRef<TargetResult | null>(null);

  /*
   * Wrapped so the outcome is visible.
   *
   * The name is captured from the form before the call, because the selection
   * is cleared on success — the picker should be ready for the next item, not
   * still holding the last one as though nothing happened.
   */
  const [state, formAction, pending] = useActionState<EditorialActionState, FormData>(
    async (previous, formData) => {
      const label =
        chosenRef.current?.title ||
        String(formData.get("headline") ?? "") ||
        "That item";
      const result = await addSectionItem(previous, formData);
      if (!result.error) {
        setJustAdded(label);
        setChosen(null);
      }
      return result;
    },
    {},
  );

  const placement = placementKey ? findPlacement(placementKey) : null;

  /*
   * What this placement will accept.
   *
   * A custom section has no placement row, so it falls back to the full
   * editorial set — the only case where the picker is genuinely allowed to
   * search everything, because nothing has told it otherwise.
   */
  const accepts: TargetKind[] = placement?.accepts ?? [
    "ranking",
    "article",
    "product_ranking",
    "product",
    "business",
    "category",
    "place",
  ];

  return (
    <form action={formAction} className="rounded-card border border-line bg-white p-5">
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="targetId" value={external ? "" : (chosen?.id ?? "")} />
      <input
        type="hidden"
        name="targetType"
        value={external ? "external_url" : (chosen?.kind ?? "")}
      />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
          Add an item
        </h3>
        {/*
          An external link is not a search result — there is no record to find,
          only a URL to type — so it is a mode rather than a target type in the
          picker's list, where it would be a permanent empty row.
        */}
        <button
          type="button"
          onClick={() => {
            setExternal((current) => !current);
            setChosen(null);
          }}
          className="text-xs font-semibold text-brand-600 hover:underline"
        >
          {external ? "Choose existing content instead" : "Link to an external URL instead"}
        </button>
      </div>

      {external ? (
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="externalUrl" className="block text-xs font-semibold text-navy-900">
              URL
            </label>
            <input
              id="externalUrl"
              name="externalUrl"
              type="url"
              placeholder="https://"
              className={`mt-1.5 ${INPUT}`}
            />
          </div>
          <div>
            <label
              htmlFor="externalHeadline"
              className="block text-xs font-semibold text-navy-900"
            >
              Headline <span className="font-normal text-ink-500">(required)</span>
            </label>
            <input
              id="externalHeadline"
              name="headline"
              type="text"
              className={`mt-1.5 ${INPUT}`}
            />
            <p className="mt-1 text-xs text-ink-500">
              An external link has no record to inherit a headline from.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <TargetPicker
            accepts={accepts}
            selectedId={chosen?.id ?? null}
            onSelect={(result) => {
              chosenRef.current = result;
              setChosen(result);
              setJustAdded(null);
            }}
            returnTo={returnTo}
          />
        </div>
      )}

      {justAdded ? (
        <p
          aria-live="polite"
          className="mt-3 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900"
        >
          {justAdded} added. It is in the list above.
        </p>
      ) : null}

      {chosen ? (
        <InheritedPreview
          preview={{
            typeLabel: chosen.typeLabel,
            headline: chosen.title,
            dek: chosen.dek,
            kicker: chosen.kicker,
            imageUrl: chosen.imageUrl,
            status: chosen.status,
          }}
        />
      ) : null}

      <FormError message={state.error} />

      <button
        type="submit"
        disabled={pending || (!external && !chosen)}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-navy-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Adding
          </>
        ) : (
          "Add item"
        )}
      </button>
      <p className="mt-2 text-xs text-ink-500">
        Items are added as drafts. Publish each one below when it is ready.
      </p>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Edit one item                                                               */
/* -------------------------------------------------------------------------- */

export function SectionItemEditor({
  item,
  sectionId,
  isFirst,
  isLast,
  library,
}: {
  item: EditorialSectionItemWithTargets;
  sectionId: string;
  isFirst: boolean;
  isLast: boolean;
  library: MediaAsset[];
}) {
  const [state, formAction, saving] = useActionState<EditorialActionState, FormData>(
    updateSectionItem,
    {},
  );
  const [isPending, startTransition] = useTransition();
  const [confirmRemove, setConfirmRemove] = useState(false);

  const source = inherited(item);
  const targetUnpublished = source.status !== "published";

  const forInput = (value: string | null) =>
    value ? new Date(value).toISOString().slice(0, 16) : "";

  return (
    <div className="rounded-card border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-navy-900 text-sm font-bold text-white">
          {item.position}
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-navy-900">
            {source.name || "(no target)"}
            <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              {source.type}
            </span>
            {item.is_sponsored ? (
              <span className="rounded-full bg-gold-400 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-navy-950">
                Sponsored
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-ink-400">{source.href}</p>

          {targetUnpublished ? (
            <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
              The target is <strong>{source.status}</strong>. Row-level security
              hides this item from the public site until the target is published.
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={isFirst || isPending}
            aria-label="Move up"
            onClick={() =>
              startTransition(() => {
                void moveSectionItem(item.id, sectionId, "up");
              })
            }
            className="rounded-md border border-line p-1.5 text-ink-700 hover:bg-sand-50 disabled:opacity-40"
          >
            <ArrowUp aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            disabled={isLast || isPending}
            aria-label="Move down"
            onClick={() =>
              startTransition(() => {
                void moveSectionItem(item.id, sectionId, "down");
              })
            }
            className="rounded-md border border-line p-1.5 text-ink-700 hover:bg-sand-50 disabled:opacity-40"
          >
            <ArrowDown aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            disabled={isPending}
            aria-label="Remove item"
            onClick={() => {
              if (!confirmRemove) {
                setConfirmRemove(true);
                return;
              }
              startTransition(() => {
                void removeSectionItem(item.id, sectionId);
              });
            }}
            className={`rounded-md border p-1.5 disabled:opacity-40 ${
              confirmRemove
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-line text-ink-700 hover:bg-sand-50"
            }`}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      {confirmRemove ? (
        <p className="mt-2 text-xs text-red-600">
          Click the bin again to remove.{" "}
          <button
            type="button"
            onClick={() => setConfirmRemove(false)}
            className="font-semibold underline"
          >
            Cancel
          </button>
        </p>
      ) : null}

      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="sectionId" value={sectionId} />

        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
          Overrides — leave blank to inherit
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`kicker-${item.id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Kicker
            </label>
            <input
              id={`kicker-${item.id}`}
              name="kicker"
              defaultValue={item.kicker ?? ""}
              placeholder={inheritPlaceholder(source.kicker)}
              className={`mt-1.5 ${INPUT}`}
            />
          </div>

          <div>
            <label
              htmlFor={`badge-${item.id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Badge
            </label>
            <input
              id={`badge-${item.id}`}
              name="badge"
              defaultValue={item.badge ?? ""}
              placeholder="No badge"
              className={`mt-1.5 ${INPUT}`}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={`headline-${item.id}`}
            className="block text-xs font-semibold text-navy-900"
          >
            Headline
          </label>
          <input
            id={`headline-${item.id}`}
            name="headline"
            defaultValue={item.headline ?? ""}
            placeholder={inheritPlaceholder(source.headline)}
            className={`mt-1.5 ${INPUT}`}
          />
        </div>

        <div>
          <label
            htmlFor={`dek-${item.id}`}
            className="block text-xs font-semibold text-navy-900"
          >
            Dek
          </label>
          <textarea
            id={`dek-${item.id}`}
            name="dek"
            rows={2}
            defaultValue={item.dek ?? ""}
            placeholder={inheritPlaceholder(source.dek)}
            className={`mt-1.5 ${INPUT}`}
          />
        </div>

        {/*
          The inherited image, shown rather than described. An editor choosing a
          ranking that plainly has a hero should see that hero, not a blank URL
          box saying "no inherited value" — which is what this was.
        */}
        <div className="rounded-md border border-line bg-sand-50 p-3">
          <p className="text-xs font-semibold text-navy-900">Image</p>

          {source.image ? (
            <div className="mt-2 flex items-center gap-3">
              <span className="relative size-16 shrink-0 overflow-hidden rounded border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={source.image}
                  alt=""
                  className="size-full object-cover"
                  style={
                    source.media
                      ? {
                          objectPosition: `${source.media.focal_x * 100}% ${source.media.focal_y * 100}%`,
                        }
                      : undefined
                  }
                />
              </span>
              <p className="text-xs text-ink-500">
                Inherited from {source.type.toLowerCase()}. Leave the override
                empty to keep it.
              </p>
            </div>
          ) : (
            <p className="mt-1 text-xs text-ink-500">
              This {source.type.toLowerCase()} has no image yet. Add one on the
              record itself so every placement inherits it, or override here for
              this placement only.
            </p>
          )}

          <div className="mt-3">
            <MediaField
              name="imageMediaId"
              value={item.image_media ?? null}
              library={library}
              label="Override for this placement"
              hint="Optional. Empty means use the inherited image above."
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label
              htmlFor={`status-${item.id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Status
            </label>
            <select
              id={`status-${item.id}`}
              name="status"
              defaultValue={item.status}
              className={`mt-1.5 ${INPUT} bg-white`}
            >
              <option value="draft">Draft</option>
              <option value="review">In review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label
              htmlFor={`starts-${item.id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Starts
            </label>
            <input
              id={`starts-${item.id}`}
              name="startsAt"
              type="datetime-local"
              defaultValue={forInput(item.starts_at)}
              className={`mt-1.5 ${INPUT}`}
            />
          </div>

          <div>
            <label
              htmlFor={`ends-${item.id}`}
              className="block text-xs font-semibold text-navy-900"
            >
              Ends
            </label>
            <input
              id={`ends-${item.id}`}
              name="endsAt"
              type="datetime-local"
              defaultValue={forInput(item.ends_at)}
              className={`mt-1.5 ${INPUT}`}
            />
          </div>
        </div>

        <label className="flex items-center gap-2.5 text-sm text-ink-700">
          <input
            type="checkbox"
            name="isSponsored"
            defaultChecked={item.is_sponsored}
            className="size-4 rounded border-line text-brand-600 focus:ring-2 focus:ring-brand-500"
          />
          Sponsored placement
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full border border-navy-300 px-4 py-1.5 text-xs font-semibold text-navy-900 hover:bg-sand-50 disabled:opacity-60"
          >
            {saving ? (
              <span className="flex items-center gap-1.5">
                <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                Saving
              </span>
            ) : (
              "Save item"
            )}
          </button>

          {source.href ? (
            <a
              href={source.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
            >
              Preview target
              <ExternalLink aria-hidden="true" className="size-3" />
            </a>
          ) : null}

          {state.ok && !saving ? (
            <span role="status" className="flex items-center gap-1 text-xs text-brand-600">
              <Check aria-hidden="true" className="size-3.5" />
              Saved
            </span>
          ) : null}
          {state.error ? (
            <span role="alert" className="text-xs text-red-600">
              {state.error}
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}

/**
 * Everything the item would inherit, shown before it is added.
 *
 * Deliberately the same four fields the public card renders — image, kicker,
 * headline, dek — laid out the way they will appear, plus the two facts that
 * decide whether it renders at all: what kind of thing it is, and whether it
 * is published. A draft target in a published section is the single most
 * common way a placement goes live empty.
 *
 * Missing values are named rather than left blank. "No image" is information;
 * an empty box is a question.
 */
function InheritedPreview({ preview }: { preview: TargetPreview }) {
  const published = preview.status === "published";

  return (
    <div className="mt-4 rounded-card border border-line bg-sand-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-ink-500">
        What this will inherit
      </p>

      <div className="mt-3 flex gap-4">
        {preview.imageUrl ? (
          <span className="relative h-20 w-28 shrink-0 overflow-hidden rounded border border-line bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.imageUrl}
              alt=""
              className="size-full object-cover"
            />
          </span>
        ) : (
          <span className="grid h-20 w-28 shrink-0 place-items-center rounded border border-dashed border-line bg-white px-2 text-center text-[11px] font-semibold leading-tight text-amber-700">
            No image
          </span>
        )}

        <div className="min-w-0 flex-1">
          {preview.kicker ? (
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
              {preview.kicker}
            </p>
          ) : (
            <p className="text-[11px] italic text-ink-400">No kicker</p>
          )}

          <p className="mt-0.5 text-sm font-bold leading-snug text-navy-900">
            {preview.headline || "Untitled"}
          </p>

          {preview.dek ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-700">
              {preview.dek}
            </p>
          ) : (
            <p className="mt-1 text-xs italic text-ink-400">No dek</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-2.5 text-xs">
        <span className="text-ink-500">
          Type <span className="font-semibold text-navy-900">{preview.typeLabel}</span>
        </span>
        <span className="text-ink-500">
          Status{" "}
          <span
            className={`font-semibold ${published ? "text-emerald-700" : "text-amber-700"}`}
          >
            {published ? "Published" : "Draft"}
          </span>
        </span>
        {!published ? (
          <span className="font-semibold text-amber-700">
            Draft — will not appear publicly until it is published.
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-ink-400">
        Anything here can be overridden on the item once it is added.
      </p>
    </div>
  );
}
