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
 * Shaped after `cards/RankingCard` so the /products index reads as the same
 * publication as /best — same dateline-kicker-headline stack, same stretched
 * link over the whole card.
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
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
          {dateline ? <span>{dateline}</span> : null}
          {dateline && guide.category ? <span className="mx-1.5">|</span> : null}
          {guide.category ? (
            <span className="text-brand-600">{guide.category.name}</span>
          ) : null}
        </p>

        <h3
          className={`font-bold leading-tight text-navy-900 ${
            isFeature ? "text-2xl sm:text-[28px]" : "text-base"
          }`}
        >
          <Link href={href} className="after:absolute after:inset-0 hover:text-brand-600">
            {guide.title}
          </Link>
        </h3>

        {guide.description ? (
          <p
            className={`mt-2 leading-relaxed text-ink-700 ${
              isFeature ? "text-[15px]" : "line-clamp-2 text-sm"
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
