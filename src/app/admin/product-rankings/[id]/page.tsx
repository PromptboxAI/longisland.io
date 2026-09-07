import { listMediaAssets } from "@/lib/data/admin-queries";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addProductToGuide,
  setGuideStatus,
} from "@/app/admin/product-rankings/actions";
import { ProductGuideDetailsForm } from "@/components/admin/ProductGuideDetailsForm";
import { ProductGuideEntryEditor } from "@/components/admin/ProductGuideEntryEditor";
import { ProductPicker } from "@/components/admin/ProductPicker";
import { StatusPill } from "@/components/admin/StatusPill";
import {
  getAdminProductGuide,
  listAdminLocalCategories,
  listAdminProductCategories,
  searchAdminProducts,
} from "@/lib/data/admin-product-queries";

export const dynamic = "force-dynamic";

type PageParams = { params: Promise<{ id: string }> };

export default async function ProductGuideEditorPage({ params }: PageParams) {
  const { id } = await params;

  const [guide, categories, localCategories, candidates, library] = await Promise.all([
    getAdminProductGuide(id),
    listAdminProductCategories(),
    listAdminLocalCategories(),
    searchAdminProducts("", 200),
    listMediaAssets(),
  ]);

  if (!guide) notFound();

  const isPublished = guide.status === "published";

  // Server Actions must be bound here; the controls below are inside forms.
  async function publish() {
    "use server";
    await setGuideStatus(id, "published");
  }

  async function unpublish() {
    "use server";
    await setGuideStatus(id, "draft");
  }

  async function addProduct(productId: string) {
    "use server";
    await addProductToGuide(id, productId);
  }

  const entriesWithoutOffers = guide.entries.filter(
    (entry) => entry.product.offers.length === 0,
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/product-rankings"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          All product rankings
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-navy-900">{guide.title}</h1>
            <StatusPill status={guide.status} />
          </div>
          <p className="mt-1 font-mono text-xs text-ink-400">/products/{guide.slug}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={
              isPublished ? `/products/${guide.slug}` : `/preview/guide/${guide.id}`
            }
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-navy-900 hover:border-brand-500"
          >
            {isPublished ? "View page" : "Preview"}
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </Link>

          {isPublished ? (
            <form action={unpublish}>
              <button
                type="submit"
                className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-navy-900 hover:border-red-300 hover:text-red-600"
              >
                Unpublish
              </button>
            </form>
          ) : (
            <form action={publish}>
              <button
                type="submit"
                className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Publish
              </button>
            </form>
          )}
        </div>
      </div>

      {!isPublished ? (
        <p className="rounded-card border border-line bg-sand-50 px-4 py-3 text-sm text-ink-700">
          This guide is a draft. It is not visible on the public site, and its
          picks are hidden by row-level security until it is published.
        </p>
      ) : null}

      {entriesWithoutOffers.length > 0 ? (
        <p className="rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-ink-700">
          <span className="font-semibold">
            {entriesWithoutOffers.length}{" "}
            {entriesWithoutOffers.length === 1 ? "pick has" : "picks have"} no
            merchant offer.
          </span>{" "}
          They will render without a buy button. Add an offer on each product, or
          remove them from this guide.
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section aria-labelledby="guide-details">
          <h2
            id="guide-details"
            className="mb-4 text-sm font-bold uppercase tracking-wider text-navy-900"
          >
            Details
          </h2>
          <div className="rounded-card border border-line bg-white p-5">
            <ProductGuideDetailsForm
              library={library}
              heroMedia={library.find((a) => a.id === guide.hero_media_id) ?? null}
              ogMedia={library.find((a) => a.id === guide.og_image_media_id) ?? null}
              guide={guide}
              categories={categories}
              localCategories={localCategories}
            />
          </div>
        </section>

        <section aria-labelledby="guide-entries">
          <h2
            id="guide-entries"
            className="mb-4 text-sm font-bold uppercase tracking-wider text-navy-900"
          >
            Picks ({guide.entries.length})
          </h2>

          <div className="space-y-4">
            {guide.entries.map((entry, index) => (
              <ProductGuideEntryEditor
                key={entry.id}
                entry={entry}
                guideId={guide.id}
                isFirst={index === 0}
                isLast={index === guide.entries.length - 1}
                library={library}
              />
            ))}

            {guide.entries.length === 0 ? (
              <div className="rounded-card border border-line bg-white p-10 text-center">
                <p className="text-sm text-ink-500">
                  No picks yet. Add products below, then order them and write a
                  reason for each position.
                </p>
              </div>
            ) : null}

            <ProductPicker
              products={candidates}
              addedProductIds={guide.entries.map((entry) => entry.product_id)}
              onAdd={addProduct}
              label="Add a product to this guide"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
