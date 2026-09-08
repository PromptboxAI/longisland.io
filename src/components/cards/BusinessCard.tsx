import { MapPin } from "lucide-react";
import { resolveImageUrl } from "@/lib/media/resolve";
import Link from "next/link";

import { EditorialImage } from "@/components/ui/EditorialImage";
import type { BusinessWithMedia } from "@/types/database";

export interface BusinessCardProps {
  business: BusinessWithMedia;
  /** Rank shown as a numeral, when the card appears inside an ordered context. */
  position?: number;
  variant?: "standard" | "compact";
}

export function BusinessCard({
  business,
  position,
  variant = "standard",
}: BusinessCardProps) {
  const href = `/business/${business.slug}`;
  const location = [business.city, business.county].filter(Boolean).join(", ");

  if (variant === "compact") {
    return (
      <Link
        href={href}
        className="group flex items-center gap-3 rounded-lg border border-navy-100 p-3 transition-colors hover:border-brand-300 hover:bg-sand-50"
      >
        {position ? (
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-navy-900 font-mono text-sm font-semibold text-white">
            {position}
          </span>
        ) : null}

        {/*
          A 48px thumbnail, the same as the ranking quick list.

          The compact row had no picture at all, so the only way to show a
          business with its photograph was the full card — four 4:3 photographs
          for what is a see-also list. This carries the picture at a size that
          says "another one of these" rather than competing with the page it is
          attached to.
        */}
        <span className="relative size-12 shrink-0 overflow-hidden rounded border border-line">
          <EditorialImage
            src={resolveImageUrl(
              business.primary_media ?? null,
              business.primary_image_url,
            )}
            alt=""
            seed={business.slug}
            sizes="48px"
          />
        </span>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-navy-900 group-hover:text-brand-600">
            {business.name}
          </p>
          {location ? (
            <p className="truncate text-xs text-ink-500">{location}</p>
          ) : null}
        </div>
      </Link>
    );
  }

  return (
    <article className="group relative overflow-hidden rounded-card border border-navy-100 bg-white shadow-card transition-shadow hover:shadow-lift">
      <div className="relative aspect-[4/3] overflow-hidden">
        <EditorialImage
          src={resolveImageUrl(
            business.primary_media ?? null,
            business.primary_image_url,
          )}
          alt=""
          seed={business.slug}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {position ? (
          <span className="absolute left-3 top-3 grid size-9 place-items-center rounded-full bg-white/95 font-mono text-sm font-bold text-navy-900 shadow-card">
            {position}
          </span>
        ) : null}
      </div>

      <div className="p-4">
        <h3 className="text-base font-semibold leading-snug text-navy-900">
          <Link href={href} className="after:absolute after:inset-0">
            {business.name}
          </Link>
        </h3>

        {location ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-ink-500">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            {location}
          </p>
        ) : null}

        {business.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-700">
            {business.description}
          </p>
        ) : null}
      </div>
    </article>
  );
}
