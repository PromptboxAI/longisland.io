import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { DeleteRowButton } from "@/components/admin/DeleteRowButton";
import { ReturnToBanner } from "@/components/admin/ReturnToBanner";
import { notFound } from "next/navigation";

import { deleteProduct } from "@/app/admin/products/actions";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductOfferEditor } from "@/components/admin/ProductOfferEditor";
import { StatusPill } from "@/components/admin/StatusPill";
import { listMediaAssets } from "@/lib/data/admin-queries";
import {
  getAdminProduct,
  listAdminMerchants,
  listAdminProductCategories,
} from "@/lib/data/admin-product-queries";

export const dynamic = "force-dynamic";

type PageParams = { params: Promise<{ id: string }> };

export default async function ProductEditorPage({
  params,
  searchParams,
}: PageParams & { searchParams: Promise<{ returnTo?: string }> }) {
  // Set when an editor came here from an editorial placement to make something
  // that did not exist yet. It is the only record of that trip.
  const { returnTo } = await searchParams;
  const { id } = await params;

  const [product, categories, merchants, library] = await Promise.all([
    getAdminProduct(id),
    listAdminProductCategories(),
    listAdminMerchants(),
    listMediaAssets(),
  ]);

  if (!product) notFound();

  const imageMedia =
    library.find((asset) => asset.id === product.image_media_id) ?? null;

  // Server Actions must be bound here; the button below is inside a form.
  async function remove() {
    "use server";
    await deleteProduct(id);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          All products
        </Link>
        <ReturnToBanner returnTo={returnTo} label="Back to the placement" />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-navy-900">{product.name}</h1>
            <StatusPill status={product.status} />
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {product.brand ?? "No brand"} · {product.offers.length}{" "}
            {product.offers.length === 1 ? "offer" : "offers"}
          </p>
        </div>

        {/*
          Asks before doing something no amount of retyping undoes. It used to
          delete on the first click, which is a poor match for an action that
          also strips the product out of every guide it appears in.
        */}
        <DeleteRowButton
          name={product.name}
          consequence="It is removed from every guide and recommendation too."
          onDelete={remove}
        />
      </div>

      {product.status !== "published" ? (
        <p className="rounded-card border border-line bg-sand-50 px-4 py-3 text-sm text-ink-700">
          This product is a draft. It is hidden everywhere it appears — in guides
          and in recommendation modules — and its offers are hidden with it.
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
        <section aria-labelledby="product-details">
          <h2
            id="product-details"
            className="mb-4 text-sm font-bold uppercase tracking-wider text-navy-900"
          >
            Details
          </h2>
          <ProductForm
        product={product}
        categories={categories}
        library={library}
        imageMedia={imageMedia}
      />
        </section>

        <section aria-labelledby="product-offers">
          <h2
            id="product-offers"
            className="mb-1 text-sm font-bold uppercase tracking-wider text-navy-900"
          >
            Merchant offers ({product.offers.length})
          </h2>
          <p className="mb-4 text-xs text-ink-500">
            Where readers can buy this. Saving an offer records that its price was
            checked just now, which is what keeps a displayed price honest.
          </p>

          <ProductOfferEditor
            productId={product.id}
            offers={product.offers}
            merchants={merchants}
          />
        </section>
      </div>
    </div>
  );
}
