import Link from "next/link";

import { AffiliateDisclosure } from "@/components/products/AffiliateDisclosure";
import { ProductCard } from "@/components/products/ProductCard";
import { RuleHeading } from "@/components/ui/RuleHeading";
import { hasAffiliateLinks, merchantDisclosures } from "@/lib/affiliate";
import {
  getRecommendedProducts,
  listProductGuidesForLocalCategory,
} from "@/lib/data/product-queries";
import type { RecommendationContentType } from "@/types/products";

export interface RecommendedProductsModuleProps {
  contentType: RecommendationContentType;
  contentId: string;
  /** Heading used when the editor did not set a context label on the rows. */
  fallbackHeading?: string;
  /**
   * Local category of the host page. When set, the module also offers the
   * buying guides tied to that category — the cross-link back into commerce
   * content from a local page.
   */
  localCategoryId?: string | null;
}

/**
 * The embedded "recommended products" block for a local page.
 *
 * An async server component that fetches its own data, so a host page adds one
 * import and one element: local templates stay ignorant of the product layer,
 * and nothing is hardcoded into them.
 *
 * Renders nothing at all when an editor has attached no products — no heading,
 * no empty state, no reserved space.
 */
export async function RecommendedProductsModule({
  contentType,
  contentId,
  fallbackHeading = "What we recommend bringing",
  localCategoryId,
}: RecommendedProductsModuleProps) {
  const [recommendations, relatedGuides] = await Promise.all([
    getRecommendedProducts(contentType, contentId),
    localCategoryId
      ? listProductGuidesForLocalCategory(localCategoryId)
      : Promise.resolve([]),
  ]);

  if (recommendations.length === 0) return null;

  // The label is written per host page and stored on every row of the module, so
  // any row carries it. Falling back keeps a half-filled module readable.
  const heading =
    recommendations.find((rec) => rec.context_label)?.context_label ??
    fallbackHeading;

  const products = recommendations.map((rec) => rec.product);
  const showDisclosure = hasAffiliateLinks(products);

  return (
    <section
      aria-labelledby="recommended-products"
      className="rounded-card border border-line bg-sand-50 p-6 sm:p-8"
    >
      <RuleHeading id="recommended-products" title={heading} size="sm" />

      {showDisclosure ? (
        <div className="mt-3">
          <AffiliateDisclosure
            variant="inline"
            merchantNotes={merchantDisclosures(products)}
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {recommendations.map((rec) => (
          <ProductCard
            key={rec.id}
            product={rec.product}
            note={rec.editorial_note}
          />
        ))}
      </div>

      {relatedGuides.length > 0 ? (
        <div className="mt-7 border-t border-line pt-5">
          <h3 className="meta">
            Full buying guides
          </h3>
          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            {relatedGuides.map((guide) => (
              <li key={guide.id}>
                <Link
                  href={`/products/${guide.slug}`}
                  className="text-sm font-semibold text-brand-600 hover:underline"
                >
                  {guide.title} &rsaquo;
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
