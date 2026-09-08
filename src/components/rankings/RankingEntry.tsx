import { Globe, MapPin, Navigation, Phone } from "lucide-react";
import { PhoneLink } from "@/components/business/PhoneLink";
import Link from "next/link";

import { EditorialImage } from "@/components/ui/EditorialImage";
import { isProfileReady } from "@/lib/business/readiness";
import { resolveImage } from "@/lib/media/resolve";
import type { RankingEntryWithBusiness } from "@/types/database";

export interface RankingEntryProps {
  entry: RankingEntryWithBusiness;
  priority?: boolean;
}

/**
 * One ranked entry, laid out as a comparison card.
 *
 * Structure: badge chip, image on the left, editorial content in the middle,
 * actions on the right, and a details row beneath with address, phone and
 * website. The `id` anchors the quick list at the top of the page.
 */
const SECONDARY_ACTION =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-navy-300 px-4 py-2 text-sm font-semibold text-navy-900 transition-colors hover:border-navy-500 hover:bg-navy-50";

export function RankingEntry({ entry, priority = false }: RankingEntryProps) {
  const { business } = entry;
  const profileReady = isProfileReady(business);
  const image = resolveImage(
    business.primary_media ?? null,
    business.primary_image_url,
    business.name,
  );
  const location = [business.city, business.county].filter(Boolean).join(", ");
  const directionsQuery = encodeURIComponent(
    [business.name, business.address, business.city, "NY"].filter(Boolean).join(", "),
  );

  return (
    <article
      id={`entry-${entry.position}`}
      className="relative rounded-card border border-line bg-white shadow-card"
    >
      {entry.badge ? (
        <div className="absolute -top-3 left-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gold-400">
            {entry.badge}
          </span>
        </div>
      ) : null}

      <div className="grid gap-5 p-5 pt-7 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-6 lg:grid-cols-[220px_minmax(0,1fr)_190px]">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden rounded border border-line">
          {/*
            One image per entry, and it belongs to the BUSINESS rather than to
            this list. The same restaurant in four rankings shows the same
            photo, and correcting it once corrects all four — which is why
            there is no per-entry image field to get out of step.
          */}
          <EditorialImage
            src={image?.url ?? null}
            alt={image?.alt ?? ""}
            seed={business.slug}
            priority={priority}
            objectPosition={image?.objectPosition}
            sizes="(max-width: 640px) 100vw, 220px"
          />
          <span className="absolute left-2 top-2 grid size-9 place-items-center rounded-full bg-navy-900 text-sm font-bold text-white">
            {entry.position}
          </span>
        </div>

        {/* Editorial content */}
        <div className="min-w-0">
          <h3 className="text-xl font-extrabold leading-tight text-navy-900 [overflow-wrap:anywhere]">
            <Link href={`/business/${business.slug}`} className="hover:text-brand-600">
              {business.name}
            </Link>
          </h3>

          {location ? (
            <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-500">
              <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              <span className="min-w-0">{location}</span>
            </p>
          ) : null}

          {entry.best_for ? (
            <p className="mt-3 text-sm font-bold text-brand-600 [overflow-wrap:anywhere]">
              Best for: {entry.best_for}
            </p>
          ) : null}

          {entry.editorial_reason ? (
            <div className="mt-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                Why we picked it
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-700 [overflow-wrap:anywhere]">
                {entry.editorial_reason}
              </p>
            </div>
          ) : null}

          {/* Contact details */}
          <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-line pt-3 text-xs text-ink-500">
            {business.address ? (
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Address</dt>
                <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                <dd>
                  {business.address}
                  {business.city ? `, ${business.city}` : ""}
                </dd>
              </div>
            ) : null}
            {business.phone ? (
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Phone</dt>
                <Phone aria-hidden="true" className="size-3.5 shrink-0" />
                <dd>
                  <PhoneLink
                    phone={business.phone}
                    className="hover:text-brand-600 hover:underline"
                  />
                </dd>
              </div>
            ) : null}
            {business.website ? (
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Website</dt>
                <Globe aria-hidden="true" className="size-3.5 shrink-0" />
                <dd>
                  <a
                    href={business.website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-brand-600 hover:underline"
                  >
                    Visit website
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        {/* Actions */}
        {/*
          self-start keeps this column from stretching to the row height — the
          buttons size to their content instead of growing to fill the card.

          "View Profile" leads only when there is a profile worth reading. A
          page holding a name and a town breaks the promise the button makes,
          so until then the primary action is the one that gets a reader to the
          business itself. See lib/business/readiness.
        */}
        <div className="flex flex-row flex-wrap gap-2 self-start sm:col-span-2 lg:col-span-1 lg:flex-col">
          {profileReady ? (
            <>
              <Link
                href={`/business/${business.slug}`}
                className="rounded-full bg-navy-900 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-navy-800"
              >
                View Profile
              </Link>
              {business.website ? (
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className={SECONDARY_ACTION}
                >
                  <Globe aria-hidden="true" className="size-3.5" />
                  Website
                </a>
              ) : null}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${directionsQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className={SECONDARY_ACTION}
              >
                <Navigation aria-hidden="true" className="size-3.5" />
                Directions
              </a>
            </>
          ) : (
            <>
              {business.website ? (
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
                >
                  <Globe aria-hidden="true" className="size-3.5" />
                  Visit Website
                </a>
              ) : null}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${directionsQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  business.website
                    ? SECONDARY_ACTION
                    : "inline-flex items-center justify-center gap-1.5 rounded-full bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
                }
              >
                <Navigation aria-hidden="true" className="size-3.5" />
                Directions
              </a>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
