import { supabaseUrl } from "@/lib/env";
import type { MediaAsset, ResolvedImage } from "@/types/media";

/**
 * One place where "which image, and what does it look like" is decided.
 *
 * Every content type carries two columns — a media_assets reference and a
 * pasted URL — and the rule is the same everywhere: the library asset wins
 * because it is the only one that brings alt text, a credit and a focal point
 * with it; the URL fills in for images we do not host; and neither one present
 * falls through to the generated gradient.
 *
 * Keeping this in a single function is what stops that order drifting between
 * eight call sites, which is exactly how one card ends up showing a stale
 * pasted URL while another shows the uploaded replacement.
 */

const BUCKET = "media";

/** Public URL for a stored object. */
export function mediaUrl(storagePath: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

/**
 * Resolves a record's image.
 *
 * `fallbackAlt` is used when the asset has no alt text of its own — usually the
 * subject's name. An empty string is a legitimate answer for decorative art and
 * is preserved rather than replaced.
 */
export function resolveImage(
  asset: MediaAsset | null | undefined,
  urlFallback: string | null | undefined,
  fallbackAlt = "",
): ResolvedImage | null {
  if (asset) {
    return {
      url: mediaUrl(asset.storage_path),
      alt: asset.alt_text ?? fallbackAlt,
      objectPosition: `${asset.focal_x * 100}% ${asset.focal_y * 100}%`,
      width: asset.width,
      height: asset.height,
      credit: asset.credit,
    };
  }

  if (urlFallback && urlFallback.trim().length > 0) {
    return {
      url: urlFallback,
      alt: fallbackAlt,
      // A pasted URL has no focal point; centre is the only honest answer.
      objectPosition: "50% 50%",
      width: null,
      height: null,
      credit: null,
    };
  }

  return null;
}

/** The URL alone, for the places that only need a src. */
export function resolveImageUrl(
  asset: MediaAsset | null | undefined,
  urlFallback: string | null | undefined,
): string | null {
  return resolveImage(asset, urlFallback)?.url ?? null;
}
