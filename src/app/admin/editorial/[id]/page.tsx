import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteSection } from "@/app/admin/editorial/actions";
import { SectionForm } from "@/components/admin/SectionForm";
import {
  AddSectionItem,
  SectionItemEditor,
} from "@/components/admin/SectionItemsEditor";
import { StatusPill } from "@/components/admin/StatusPill";
import { findPlacement } from "@/lib/editorial/placements";
import { hasUsableOffer } from "@/lib/affiliate";
import {
  getEditorialSection,
  listAdminCategories,
  listAdminPlaces,
  listMediaAssets,
  listTargetCandidates,
} from "@/lib/data/admin-queries";

export const dynamic = "force-dynamic";

type PageParams = { params: Promise<{ id: string }> };

export default async function EditorialSectionEditorPage({ params }: PageParams) {
  const { id } = await params;

  const [section, categories, places, candidates, library] = await Promise.all([
    getEditorialSection(id),
    listAdminCategories(),
    listAdminPlaces(),
    listTargetCandidates(),
    listMediaAssets(),
  ]);

  if (!section) notFound();

  const placement = findPlacement(section.key);

  async function removeSection() {
    "use server";
    await deleteSection(id);
  }

  const liveCount = section.items.filter((i) => i.status === "published").length;

  /*
   * Top Picks is a product-only row in presentation, though not in the schema.
   *
   * Any target can be saved here — the constraint lives in the renderer, which
   * skips non-product items so the five tiles agree on image ratio, height and
   * button position. Saving is still allowed, but this has to say plainly that
   * the item will not appear, or an editor will curate into a void.
   */
  const isTopPicks = section.key === "homepage_top_picks";
  const nonProduct = isTopPicks
    ? section.items.filter((item) => !item.product_id)
    : [];

  /*
   * A curated product with nothing buyable behind it is skipped by the page.
   * Surfaced here so the disappearance is explained where it can be fixed.
   */
  const unbuyable = section.items.filter(
    (item) => item.product && !hasUsableOffer(item.product.offers),
  );

  return (
    <div className="space-y-6">
      <Link
        href="/admin/editorial"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All sections
      </Link>

      {nonProduct.length > 0 ? (
        <div className="flex gap-3 rounded-card border border-red-300 bg-red-50 p-4">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div className="text-sm leading-relaxed text-navy-900">
            <p className="font-semibold">
              {nonProduct.length} of {section.items.length} item
              {section.items.length === 1 ? "" : "s"} in Top Picks
              {nonProduct.length === 1 ? " is not" : " are not"} a product and
              will not render.
            </p>
            <p className="mt-1 text-ink-700">
              Top Picks is a product-only row: it is skipped rather than shown as
              an editorial card, because a mixed row disagrees about image ratio,
              card height and whether there is a button. Saved anyway — but move
              these to another section, or swap them for products, if you want
              them on the page. Non-product targets are fine everywhere else.
            </p>
            <ul className="mt-2 list-disc pl-5 text-ink-700">
              {nonProduct.map((item) => (
                <li key={item.id}>
                  {item.headline ??
                    item.ranking?.title ??
                    item.product_ranking?.title ??
                    item.business?.name ??
                    item.category?.name ??
                    item.place?.name ??
                    item.external_url}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {unbuyable.length > 0 ? (
        <div className="flex gap-3 rounded-card border border-red-300 bg-red-50 p-4">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div className="text-sm leading-relaxed text-navy-900">
            <p className="font-semibold">
              {unbuyable.length} curated product
              {unbuyable.length === 1 ? "" : "s"} will not render.
            </p>
            <p className="mt-1 text-ink-700">
              {unbuyable.map((item) => item.product?.name).join(", ")} — no offer
              that is both in stock and has a URL. The page skips the tile rather
              than showing a card with no way to buy. Add or update an offer.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-extrabold text-navy-900">
              {section.key}
            </h1>
            <StatusPill status={section.status} />
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {section.items.length} item{section.items.length === 1 ? "" : "s"} ·{" "}
            {liveCount} published · layout {section.layout}
          </p>
        </div>

        <form action={removeSection}>
          <button
            type="submit"
            className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-navy-900 hover:border-red-300 hover:text-red-600"
          >
            Delete section
          </button>
        </form>
      </div>

      {section.status !== "published" ? (
        <p className="rounded-card border border-line bg-sand-50 px-4 py-3 text-sm text-ink-700">
          This section is <strong>{section.status}</strong>. Row-level security
          hides every item from the public site until the section itself is
          published.
        </p>
      ) : null}

      {/*
        The content is the work; the settings are configuration that is right
        once and then left alone. Showing both as equals meant creating a
        section, then opening it and being asked the same questions again.
      */}
      {placement ? (
        <div className="rounded-card border border-line bg-sand-50 px-5 py-3">
          <p className="text-sm font-semibold text-navy-900">
            {placement.location} → {placement.name}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-700">
            {placement.purpose}
            {placement.showsHeading
              ? ` Appears under the heading “${placement.publicHeading}”.`
              : " The item you choose supplies the headline; this section's title is an admin label only."}
          </p>
        </div>
      ) : null}

      <details className="rounded-card border border-line bg-white">
        <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-navy-900">
          Section settings
          <span className="ml-2 font-normal text-ink-400">
            key, scope, layout, limit
          </span>
        </summary>
        <div className="border-t border-line p-5">
          <SectionForm section={section} categories={categories} places={places} />
        </div>
      </details>

      <div className="grid gap-8">
        <section aria-labelledby="section-items" className="space-y-4">
          <h2
            id="section-items"
            className="text-sm font-bold uppercase tracking-wider text-navy-900"
          >
            Items ({section.items.length})
          </h2>

          <AddSectionItem sectionId={section.id} candidates={candidates} />

          {section.items.length === 0 ? (
            <p className="rounded-card border border-line bg-white p-8 text-center text-sm text-ink-500">
              No items yet. Add one above.
            </p>
          ) : (
            <div className="space-y-4">
              {section.items.map((item, index) => (
                <SectionItemEditor
                library={library}
                  key={item.id}
                  item={item}
                  sectionId={section.id}
                  isFirst={index === 0}
                  isLast={index === section.items.length - 1}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
