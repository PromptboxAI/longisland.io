/**
 * URL slug helpers.
 *
 * Slugs are permanent public URLs, so they are generated once and then edited
 * deliberately — never silently regenerated when a title changes, which would
 * break every existing link and search ranking.
 */

// Unicode combining marks, left over after NFKD decomposition.
const COMBINING_MARKS = /[̀-ͯ]/g;

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    // Strip combining marks so "Café" becomes "cafe" rather than "caf".
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Business slugs include the town, since names repeat across Long Island. */
export function businessSlug(name: string, city?: string | null): string {
  return slugify(city ? `${name} ${city}` : name);
}

/**
 * Appends a numeric suffix until the slug is unused.
 * `taken` is the set of slugs already in the database.
 */
export function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
