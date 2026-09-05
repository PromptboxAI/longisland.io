import Link from "next/link";

import { EditorialImage } from "@/components/ui/EditorialImage";
import type { Category } from "@/types/database";

export interface CategoryCardProps {
  category: Pick<Category, "name" | "slug" | "description" | "hero_image_url">;
  /** "tile" is the dense discovery grid; "feature" carries a description. */
  variant?: "tile" | "feature";
}

export function CategoryCard({ category, variant = "tile" }: CategoryCardProps) {
  const href = `/category/${category.slug}`;

  if (variant === "tile") {
    return (
      <Link
        href={href}
        className="group relative flex h-24 items-end overflow-hidden rounded-card border border-navy-100 p-3 transition-shadow hover:shadow-lift sm:h-28"
      >
        <EditorialImage src={category.hero_image_url} alt="" seed={category.slug} sizes="200px" />
        <span className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/25 to-transparent" />
        <span className="relative text-sm font-semibold leading-tight text-white">
          {category.name}
        </span>
      </Link>
    );
  }

  return (
    <article className="group relative overflow-hidden rounded-card border border-navy-100 bg-white shadow-card transition-shadow hover:shadow-lift">
      <div className="relative aspect-[16/9]">
        <EditorialImage
          src={category.hero_image_url}
          alt=""
          seed={category.slug}
          sizes="(max-width: 640px) 100vw, 33vw"
        />
      </div>
      <div className="p-5">
        <h3 className="text-lg font-semibold text-navy-900">
          <Link href={href} className="after:absolute after:inset-0">
            {category.name}
          </Link>
        </h3>
        {category.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-700">
            {category.description}
          </p>
        ) : null}
      </div>
    </article>
  );
}
