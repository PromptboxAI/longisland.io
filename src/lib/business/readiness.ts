import type { Business } from "@/types/database";

/**
 * Whether a business profile is worth sending a reader to.
 *
 * "View Profile" as the primary action is a promise: click here and learn
 * something. A profile holding a name, a town and nothing else breaks that
 * promise on arrival, and the reader who bounces once is slower to trust the
 * next one — so until a profile is actually populated, the useful actions are
 * the ones that get someone to the business itself.
 *
 * The threshold is deliberately low. This is a gate against empty pages, not a
 * quality bar: a profile with something to read and a way to make contact
 * clears it.
 *
 * This becomes less relevant once profiles are enriched, at which point View
 * Profile can lead everywhere.
 */
export function isProfileReady(
  business: Pick<
    Business,
    | "description"
    | "editorial_summary"
    | "address"
    | "phone"
    | "website"
    | "primary_media_id"
    | "primary_image_url"
  >,
): boolean {
  const hasSomethingToRead = Boolean(
    business.description?.trim() || business.editorial_summary?.trim(),
  );

  const hasContactDetail = Boolean(
    business.address?.trim() || business.phone?.trim() || business.website?.trim(),
  );

  return hasSomethingToRead && hasContactDetail;
}
