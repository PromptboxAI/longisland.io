"use client";

import { ArrowDown, ArrowUp, Check, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState, useTransition } from "react";

import {
  addSectionItem,
  moveSectionItem,
  removeSectionItem,
  updateSectionItem,
  type EditorialActionState,
} from "@/app/admin/editorial/actions";
import { FormError } from "@/components/forms/Field";
import { hasUsableOffer } from "@/lib/affiliate";
import type { TargetCandidates } from "@/lib/data/admin-queries";
import type {
  EditorialSectionItemWithTargets,
  SectionTargetType,
} from "@/types/database";

const INPUT =
  "w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";

const TARGET_TYPES: { value: SectionTargetType; label: string }[] = [
  { value: "ranking", label: "Ranking" },
  { value: "article", label: "Article" },
  { value: "business", label: "Business" },
  { value: "category", label: "Category" },
  { value: "place", label: "Place" },
  { value: "product_ranking", label: "Product guide" },
  { value: "product", label: "Product (commerce)" },
  { value: "external_url", label: "External URL" },
];

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
      image: null as string | null,
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
      image: item.business.primary_image_url,
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
      image: item.category.hero_image_url,
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
      image: item.place.hero_image_url,
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
      image: item.product.image_url,
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
      image: item.article.hero_image_url,
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
      image: null,
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
  candidates,
}: {
  sectionId: string;
  candidates: TargetCandidates;
}) {
  const [state, formAction, pending] = useActionState<EditorialActionState, FormData>(
    addSectionItem,
    {},
  );
  const [targetType, setTargetType] = useState<SectionTargetType>("ranking");
  const [filter, setFilter] = useState("");
  const [targetId, setTargetId] = useState("");

  const options = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const match = (label: string) => !needle || label.toLowerCase().includes(needle);

    if (targetType === "ranking") {
      return candidates.rankings
        .filter((r) => match(r.title))
        .map((r) => ({ id: r.id, label: r.title, note: r.status }));
    }
    if (targetType === "business") {
      return candidates.businesses
        .filter((b) => match(`${b.name} ${b.city ?? ""}`))
        .map((b) => ({ id: b.id, label: b.name, note: b.city ?? b.status }));
    }
    if (targetType === "category") {
      return candidates.categories
        .filter((c) => match(c.name))
        .map((c) => ({ id: c.id, label: c.name, note: c.status }));
    }
    if (targetType === "place") {
      return candidates.places
        .filter((p) => match(p.name))
        .map((p) => ({ id: p.id, label: p.name, note: p.status }));
    }
    if (targetType === "article") {
      return candidates.articles
        .filter((a) => match(a.title))
        .map((a) => ({ id: a.id, label: a.title, note: a.status }));
    }
    if (targetType === "product_ranking") {
      return candidates.productRankings
        .filter((g) => match(g.title))
        .map((g) => ({ id: g.id, label: g.title, note: g.status }));
    }
    if (targetType === "product") {
      return candidates.products
        .filter((p) => match(`${p.name} ${p.brand ?? ""}`))
        .map((p) => ({
          id: p.id,
          label: p.brand ? `${p.brand} ${p.name}` : p.name,
          // Says up front what will happen: a product with nothing buyable
          // behind it can be curated, but the page will skip it.
          note: hasUsableOffer(p.offers)
            ? (p.status as string)
            : `${p.status} · no usable offer — will not render`,
        }));
    }
    return [];
  }, [targetType, filter, candidates]);

  const isExternal = targetType === "external_url";

  return (
    <form action={formAction} className="rounded-card border border-line bg-white p-5">
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="targetId" value={isExternal ? "" : targetId} />

      <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
        Add an item
      </h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
        <div>
          <label htmlFor="targetType" className="block text-xs font-semibold text-navy-900">
            Target type
          </label>
          <select
            id="targetType"
            name="targetType"
            value={targetType}
            onChange={(event) => {
              setTargetType(event.target.value as SectionTargetType);
              setTargetId("");
              setFilter("");
            }}
            className={`mt-1.5 ${INPUT} bg-white`}
          >
            {TARGET_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {isExternal ? (
          <div className="space-y-3">
            <div>
              <label
                htmlFor="externalUrl"
                className="block text-xs font-semibold text-navy-900"
              >
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
          <div>
            <label htmlFor="targetFilter" className="block text-xs font-semibold text-navy-900">
              Find a target
            </label>
            <input
              id="targetFilter"
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Type to filter…"
              className={`mt-1.5 ${INPUT}`}
            />

            <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-line">
              {options.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-ink-500">
                  No matches.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {options.slice(0, 50).map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => setTargetId(option.id)}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                          targetId === option.id
                            ? "bg-brand-50 font-semibold text-brand-600"
                            : "hover:bg-sand-50"
                        }`}
                      >
                        <span className="truncate">{option.label}</span>
                        <span className="shrink-0 text-xs text-ink-400">
                          {option.note}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      <FormError message={state.error} />

      <button
        type="submit"
        disabled={pending || (!isExternal && !targetId)}
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
}: {
  item: EditorialSectionItemWithTargets;
  sectionId: string;
  isFirst: boolean;
  isLast: boolean;
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

        <div>
          <label
            htmlFor={`image-${item.id}`}
            className="block text-xs font-semibold text-navy-900"
          >
            Image URL
          </label>
          <input
            id={`image-${item.id}`}
            name="imageUrl"
            type="url"
            defaultValue={item.image_url ?? ""}
            placeholder={inheritPlaceholder(source.image)}
            className={`mt-1.5 ${INPUT}`}
          />
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
