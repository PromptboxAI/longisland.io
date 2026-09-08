import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteSection } from "@/app/admin/editorial/actions";
import { PlacementBoard } from "@/components/admin/PlacementBoard";
import { PlacementHeadingForm } from "@/components/admin/PlacementHeadingForm";
import { SectionForm } from "@/components/admin/SectionForm";
import { DeleteRowButton } from "@/components/admin/DeleteRowButton";
import { findPlacement, isSingleSlot } from "@/lib/editorial/placements";
import { readPlacementState } from "@/lib/editorial/placement-state";
import { resolveImageUrl } from "@/lib/media/resolve";
import { hasUsableOffer } from "@/lib/affiliate";
import {
  getEditorialSection,
  listAdminCategories,
  listAdminPlaces,
  listMediaAssets,
} from "@/lib/data/admin-queries";

export const dynamic = "force-dynamic";

type PageParams = { params: Promise<{ id: string }> };

export default async function EditorialSectionEditorPage({ params }: PageParams) {
  const { id } = await params;

  const [section, categories, places, library] = await Promise.all([
    getEditorialSection(id),
    listAdminCategories(),
    listAdminPlaces(),
    listMediaAssets(),
  ]);

  if (!section) notFound();

  const placement = findPlacement(section.key);
  const singleSlot = isSingleSlot(section.key);
  const placementName = placement?.name ?? section.title ?? section.key;

  /*
   * One reading of the placement's state, built from the three the database
   * keeps. Everything on screen below works from this rather than from the raw
   * statuses, which is what stops the editor being handed the reconciliation
   * job that produced "1 item · 0 published".
   */
  const targetStatusOf = (item: (typeof section.items)[number]): string | null =>
    item.ranking?.status ??
    item.article?.status ??
    item.product?.status ??
    item.product_ranking?.status ??
    item.business?.status ??
    item.category?.status ??
    item.place?.status ??
    (item.external_url ? "published" : null);

  const placementStatus = readPlacementState(
    section.status,
    section.items.map((item) => ({
      itemStatus: item.status,
      targetStatus: targetStatusOf(item),
    })),
  );

  /** What each row shows, resolved once here rather than in the client. */
  const rows = section.items.map((item) => {
    const title =
      item.ranking?.title ??
      item.article?.title ??
      item.product?.name ??
      item.product_ranking?.title ??
      item.business?.name ??
      item.category?.name ??
      item.place?.name ??
      item.external_url ??
      "Untitled";

    const typeLabel = item.ranking
      ? "Ranking"
      : item.article
        ? "Article"
        : item.product
          ? "Product"
          : item.product_ranking
            ? "Buying guide"
            : item.business
              ? "Business"
              : item.category
                ? "Category"
                : item.place
                  ? "Place"
                  : "Link";

    const sourceImage =
      resolveImageUrl(item.ranking?.hero_media ?? null, item.ranking?.hero_image_url ?? null) ??
      resolveImageUrl(item.article?.hero_media ?? null, item.article?.hero_image_url ?? null) ??
      resolveImageUrl(
        item.product_ranking?.hero_media ?? null,
        item.product_ranking?.hero_image_url ?? null,
      ) ??
      resolveImageUrl(item.business?.primary_media ?? null, item.business?.primary_image_url ?? null) ??
      item.product?.image_url ??
      null;

    return {
      id: item.id,
      position: item.position,
      headline: item.headline ?? title,
      typeLabel,
      // The override wins, then the content's own picture.
      imageUrl: resolveImageUrl(item.image_media ?? null, item.image_url) ?? sourceImage,
      targetStatus: targetStatusOf(item) ?? "published",
      itemStatus: item.status,
      context: item.product?.brand ?? item.ranking?.geography ?? null,
      hasOverrides: Boolean(
        item.headline || item.dek || item.kicker || item.image_url || item.image_media_id || item.badge,
      ),
    };
  });

  const slotContent =
    singleSlot && rows.length > 0
      ? {
          headline: rows[0].headline,
          dek:
            section.items[0].dek ??
            section.items[0].ranking?.description ??
            section.items[0].article?.dek ??
            section.items[0].product_ranking?.description ??
            null,
          kicker: section.items[0].kicker ?? section.items[0].ranking?.geography ?? null,
          imageUrl: rows[0].imageUrl,
          typeLabel: rows[0].typeLabel,
          targetStatus: rows[0].targetStatus,
        }
      : null;


  async function removeSection() {
    "use server";
    await deleteSection(id);
  }


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
            {/*
              The placement's name, not its database key. The heading read
              "homepage_primary", which is the one thing on this page an editor
              has no reason to know and no way to act on — the key is fixed by
              the code that asks for it.
            */}
            <h1 className="text-2xl font-extrabold text-navy-900">
              {placementName}
            </h1>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {placement ? placement.location : "Custom section"}
          </p>
          {/*
            The old subtitle read "1 item · 0 published", which was the single
            most confusing string in the admin: both numbers were true and
            together they explained nothing. The Live / Changes not live bar
            below says the same thing in a way that can be acted on.

            The database key is gone entirely. It is fixed by the code that asks
            for it, so an editor can neither change it nor be helped by seeing
            it.
          */}
        </div>

        {/*
          No delete for a system placement.

          These are part of the page rather than pieces of content: the homepage
          asks for this slot by name in its own code, so deleting the row does
          not remove a section from the site — it removes the site's ability to
          fill one. Clearing it is on the bar below, and that is the action
          somebody reaching for "delete" actually wants. Custom sections, which
          nothing asks for by name, keep the control.
        */}
        {placement ? null : (
          <DeleteRowButton
            name={section.title ?? section.key}
            consequence="Everything curated into it is removed too."
            onDelete={removeSection}
          />
        )}
      </div>

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

      {/*
        A system placement has exactly two settings that do anything.
        Key, scope, layout and item limit are all decided by the code that
        renders the slot — offering them as fields invites an editor to change
        something that either has no effect or quietly breaks the page, which is
        the definition of a dead field. Placements that draw no heading get no
        form at all, rather than two inputs that save and never appear.

        Custom sections, which nothing renders by name, keep the full form.
      */}
      {placement ? (
        placement.showsHeading ? (
          <PlacementHeadingForm
            sectionId={section.id}
            title={section.title}
            description={section.description}
            defaultHeading={placement.publicHeading ?? placementName}
            scopeType={section.scope_type}
            categoryId={section.category_id}
            placeId={section.place_id}
            layout={section.layout}
            maxItems={section.max_items}
            status={section.status}
          />
        ) : null
      ) : (
        <details className="rounded-card border border-line bg-white">
          <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-navy-900">
            Section settings
          </summary>
          <div className="border-t border-line p-5">
            <SectionForm section={section} categories={categories} places={places} />
          </div>
        </details>
      )}

      <PlacementBoard
        sectionId={section.id}
        placementName={placementName}
        singleSlot={singleSlot}
        accepts={placement?.accepts ?? ["ranking", "article", "product_ranking"]}
        status={placementStatus}
        rows={rows}
        slotContent={slotContent}
        items={section.items}
        library={library}
        returnTo={`/admin/editorial/${section.id}`}
        placementKey={section.key}
      />

    </div>
  );
}
