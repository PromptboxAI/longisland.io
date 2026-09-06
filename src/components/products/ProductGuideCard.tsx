import Link from "next/link";

import { formatDate } from "@/components/editorial/EditorialDisclosure";
import { EditorialImage } from "@/components/ui/EditorialImage";
import type { ProductRankingSummary } from "@/types/products";

export interface ProductGuideCardProps {
  guide: ProductRankingSummary;
  variant?: "feature" | "standard";
  priority?: boolean;
}

/**
 * Index card for a buying guide.
 *
 * Deliberately shaped after `cards/RankingCard` — same dateline/kicker line,
 * same `.headline` face, same stretched link over the whole card — so /products
 * reads as the same publication as /best rather than as a store bolted on.
 *
 * Not `PickCard`: that is a merchandising tile for a single product, framed in a
 * white field with a price CTA. A guide is an article, and this card says so.
 */
export function ProductGuideCard({
  guide,
  variant = "standard",
  priority = false,
}: ProductGuideCardProps) {
  const href = `/products/${guide.slug}`;
  const dateline = guide.published_at
    ? formatDate(new Date(guide.published_at))
    : null;
  const isFeature = variant === "feature";

  return (
    <article className="group relative">
      <div
        className={`relative overflow-hidden rounded-card border border-line ${
          isFeature ? "aspect-[16/9]" : "aspect-[16/10]"
        }`}
      >
        <EditorialImage
          src={null}
          alt=""
          seed={guide.slug}
          priority={priority}
          fallbackLabel={guide.category?.name}
          sizes={
            isFeature
              ? "(max-width: 1024px) 100vw, 50vw"
              : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          }
        />
      </div>

      <div className={isFeature ? "pt-4" : "pt-3"}>
        <p className="mb-1.5 text-xs leading-[25px]">
          {dateline ? <span className="text-ink-400">{dateline}</span> : null}
          {dateline && guide.category ? (
            <span className="mx-1.5 text-ink-400">|</span>
          ) : null}
          {guide.category ? (
            <Link
              href={`/products?category=${guide.category.slug}`}
              className="relative z-10 font-semibold uppercase text-brand-600 hover:underline"
            >
              {guide.category.name}
            </Link>
          ) : null}
        </p>

        <h3
          className={`headline text-navy-900 ${
            isFeature ? "text-2xl leading-[1.27] sm:text-[30px]" : "text-base"
          }`}
        >
          <Link href={href} className="after:absolute after:inset-0 hover:text-brand-600">
            {guide.title}
          </Link>
        </h3>

        {guide.description ? (
          <p
            className={`mt-2 text-ink-700 ${
              isFeature
                ? "max-w-2xl text-[15px] leading-[25px]"
                : "line-clamp-2 text-sm leading-relaxed"
            }`}
          >
            {guide.description}
          </p>
        ) : null}

        <p className="mt-2 text-xs text-ink-500">
          <span className="font-semibold text-navy-900">
            {guide.entry_count} {guide.entry_count === 1 ? "pick" : "picks"}
          </span>
        </p>
      </div>
    </article>
  );
}
