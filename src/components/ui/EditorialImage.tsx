import Image from "next/image";

/**
 * Image with a deterministic branded fallback.
 *
 * The seed data ships without photography on purpose — we do not scrape images
 * we have no licence to. Until owned, licensed or business-provided media is
 * attached, this renders a stable navy/aqua gradient derived from the subject's
 * name, so a page full of placeholders still looks composed rather than broken.
 *
 * `sizes` is required whenever `fill` is used so Next serves an appropriately
 * sized source instead of the largest candidate.
 */

const GRADIENTS = [
  "from-navy-900 via-navy-800 to-navy-700",
  "from-navy-800 via-navy-700 to-brand-800",
  "from-brand-800 via-navy-800 to-navy-900",
  "from-navy-900 via-brand-900 to-navy-700",
  "from-navy-700 via-navy-800 to-navy-950",
  "from-brand-900 via-navy-900 to-navy-800",
] as const;

/** Stable hash so the same subject always gets the same gradient. */
function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  return GRADIENTS[hash % GRADIENTS.length];
}

export interface EditorialImageProps {
  src?: string | null;
  alt: string;
  /** Drives the fallback gradient and the initial shown inside it. */
  seed?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Short label rendered over the fallback, e.g. a category name. */
  fallbackLabel?: string;
  /**
   * "cover" crops to fill, for editorial photography. "contain" fits the whole
   * subject inside the frame, for product cutouts that must not be cropped.
   */
  fit?: "cover" | "contain";
  /**
   * CSS object-position from the media asset's focal point.
   *
   * The same photo is cropped to 16:9, 16:10, 4:3 and 1:1 across the site, and
   * without this the crop is always centred — which is how a face ends up
   * outside the frame on the one card that matters.
   */
  objectPosition?: string;
}

export function EditorialImage({
  src,
  alt,
  seed,
  className = "",
  sizes = "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw",
  priority = false,
  fallbackLabel,
  fit = "cover",
  objectPosition,
}: EditorialImageProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`${fit === "contain" ? "object-contain" : "object-cover"} ${className}`}
        style={objectPosition ? { objectPosition } : undefined}
      />
    );
  }

  const key = seed ?? alt;

  return (
    <div
      // Decorative: the accessible name is carried by the surrounding link or
      // heading, so announcing a placeholder gradient would only add noise.
      role="presentation"
      className={`absolute inset-0 bg-gradient-to-br ${gradientFor(key)} ${className}`}
    >
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:14px_14px]" />
      {fallbackLabel ? (
        <span className="absolute bottom-3 left-3 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white/85 backdrop-blur-sm">
          {fallbackLabel}
        </span>
      ) : null}
      <span
        aria-hidden="true"
        className="absolute inset-0 grid place-items-center text-5xl font-semibold text-white/15"
      >
        {key.trim().charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
