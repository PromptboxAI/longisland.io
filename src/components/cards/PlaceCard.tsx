import Link from "next/link";
import { resolveImageUrl } from "@/lib/media/resolve";
import type { MediaAsset } from "@/types/media";

import { EditorialImage } from "@/components/ui/EditorialImage";
import type { Place } from "@/types/database";

export interface PlaceCardProps {
  place: Pick<Place, "name" | "slug" | "description" | "hero_image_url" | "type"> & {
    hero_media?: MediaAsset | null;
  };
  /** "region" is the large geography card; "town" is the dense link chip. */
  variant?: "region" | "town";
}

export function PlaceCard({ place, variant = "region" }: PlaceCardProps) {
  const href = `/place/${place.slug}`;

  if (variant === "town") {
    return (
      <Link
        href={href}
        className="rounded-full border border-navy-200 px-4 py-2 text-sm font-medium text-navy-900 transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-brand-800"
      >
        {place.name}
      </Link>
    );
  }

  return (
    <article className="group relative aspect-[4/3] overflow-hidden rounded-card border border-navy-100 shadow-card transition-shadow hover:shadow-lift">
      {/*
        The uploaded hero, then a pasted URL.

        Reading the column alone was the same omission that hid every product
        and business photograph: an image set through the media library lives in
        media_assets and leaves hero_image_url null, so this would have drawn
        its letter-tile fallback over a picture that was already uploaded. No
        category or place has a hero yet — this is so the first one that gets
        one actually appears.
      */}
      <EditorialImage
        src={resolveImageUrl(place.hero_media ?? null, place.hero_image_url)}
        alt=""
        seed={place.slug}
        sizes="(max-width: 640px) 50vw, 25vw"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/35 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="text-lg font-semibold text-white">
          <Link href={href} className="after:absolute after:inset-0">
            {place.name}
          </Link>
        </h3>
        {place.description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-navy-200">
            {place.description}
          </p>
        ) : null}
      </div>
    </article>
  );
}
