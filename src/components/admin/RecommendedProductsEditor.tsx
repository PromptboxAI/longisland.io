import Link from "next/link";

import { ProductPicker } from "@/components/admin/ProductPicker";
import { RecommendationRow } from "@/components/admin/RecommendationRow";
import { addRecommendation } from "@/app/admin/recommendations/actions";
import {
  getAdminRecommendations,
  searchAdminProducts,
} from "@/lib/data/admin-product-queries";
import type { RecommendationContentType } from "@/types/products";

export interface RecommendedProductsEditorProps {
  contentType: RecommendationContentType;
  contentId: string;
}

/**
 * "Recommended Products" for one host page.
 *
 * An async server component that fetches its own data and binds its own action,
 * so a host editor adds one import and one element — the local ranking editor
 * does not learn what a product is, and no local file is edited to add a second
 * host surface later.
 */
export async function RecommendedProductsEditor({
  contentType,
  contentId,
}: RecommendedProductsEditorProps) {
  const [recommendations, candidates] = await Promise.all([
    getAdminRecommendations(contentType, contentId),
    // Empty query returns the first page of the catalogue, which the picker
    // then filters in the browser.
    searchAdminProducts("", 200),
  ]);

  // Server Action, bound to this host so the picker only passes a product id.
  async function add(productId: string) {
    "use server";
    await addRecommendation(contentType, contentId, productId);
  }

  const addedIds = recommendations.map((rec) => rec.product_id);

  return (
    <section aria-labelledby="recommended-products-editor">
      <h2
        id="recommended-products-editor"
        className="mb-1 text-sm font-bold uppercase tracking-wider text-navy-900"
      >
        Recommended Products ({recommendations.length})
      </h2>
      <p className="mb-4 text-xs text-ink-500">
        Products shown in a module on this page. Affiliate disclosure appears
        automatically when any of them carries an affiliate link.
      </p>

      <div className="space-y-4">
        {recommendations.map((recommendation, index) => (
          <RecommendationRow
            key={recommendation.id}
            recommendation={recommendation}
            isFirst={index === 0}
            isLast={index === recommendations.length - 1}
            showLabelField={index === 0}
          />
        ))}

        {recommendations.length === 0 ? (
          <div className="rounded-card border border-line bg-white p-8 text-center">
            <p className="text-sm text-ink-500">
              No products recommended on this page yet. The module renders nothing
              until you add one.
            </p>
            <Link
              href="/admin/products"
              className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline"
            >
              Manage products
            </Link>
          </div>
        ) : null}

        <ProductPicker
          products={candidates}
          addedProductIds={addedIds}
          onAdd={add}
          label="Recommend a product on this page"
        />
      </div>
    </section>
  );
}
