/**
 * Media library types.
 *
 * A `MediaAsset` is a row in `media_assets`; the file itself lives in the
 * `media` storage bucket and is reached through `mediaUrl()`. Records reference
 * an asset by id and never copy its fields, so correcting alt text or a credit
 * once corrects it everywhere the image appears.
 */

export type MediaSource =
  | "original"
  | "business_provided"
  | "licensed"
  | "official_website"
  | "official_instagram"
  | "official_facebook"
  | "other_editorial_source"
  | "creator"
  | "manufacturer"
  | "other";

/**
 * Whether a person still has to look at this image before it is published.
 *
 * `needs_review` is not a warning badge bolted on afterwards — it is the
 * default the importer assigns to anything from a source we cannot vouch for,
 * so the burden sits on clearing it rather than on remembering to raise it.
 */
export type MediaReviewState = "ok" | "needs_review" | "taken_down";

export type MediaStatus = "active" | "archived";

export interface MediaAsset {
  id: string;
  storage_path: string;
  filename: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  alt_text: string | null;
  caption: string | null;
  source: MediaSource | null;
  credit: string | null;
  /** The image file we fetched. */
  source_url: string | null;
  /** The page a human can open to check the claim. Outlives the file URL. */
  source_page_url: string | null;
  license: string | null;
  permission_note: string | null;
  review_state: MediaReviewState;
  review_note: string | null;
  focal_x: number;
  focal_y: number;
  status: MediaStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * A one-path, short-lived permission to upload.
 *
 * Lives here rather than beside the action that mints it because a "use server"
 * module may only export async functions.
 */
export interface UploadTicket {
  path: string;
  token: string;
  error?: string;
}

/** What every image field resolves to before it reaches a component. */
export interface ResolvedImage {
  url: string;
  alt: string;
  /** CSS object-position, from the asset's focal point. */
  objectPosition: string;
  width: number | null;
  height: number | null;
  credit: string | null;
}

export const MEDIA_SOURCES: { value: MediaSource; label: string; note: string }[] = [
  { value: "original", label: "Our own photo", note: "Shot by us. No restrictions." },
  {
    value: "business_provided",
    label: "Provided by the business",
    note: "Permission ends if the relationship does — record who gave it.",
  },
  {
    value: "licensed",
    label: "Licensed",
    note: "Record the licence so its terms can be produced later.",
  },
  { value: "creator", label: "Creator-provided", note: "Record the credit line they require." },
  {
    value: "manufacturer",
    label: "Manufacturer image",
    note: "Product shots supplied for retail use.",
  },
  { value: "other", label: "Other", note: "Explain in the permission note." },
];

/**
 * The sources an editor can pick when importing an image from a URL, in the
 * order the policy prefers them.
 *
 * Order is the policy. `tier` is what the UI reads to decide whether to warn,
 * and what the importer reads to decide whether the asset lands needing review:
 * tier 1 is ours or given to us, tier 2 is the business's own public channels,
 * tier 3 is everything else and is never trusted on arrival.
 */
export const EDITORIAL_SOURCE_TYPES: {
  value: MediaSource;
  label: string;
  note: string;
  tier: 1 | 2 | 3;
}[] = [
  {
    value: "original",
    label: "Our own photograph",
    note: "Shot by us. No restrictions.",
    tier: 1,
  },
  {
    value: "business_provided",
    label: "Provided by the business",
    note: "Sent to us to use. Permission ends if the relationship does.",
    tier: 1,
  },
  {
    value: "licensed",
    label: "Licensed",
    note: "Paid for or licensed. Record the terms in the credit.",
    tier: 1,
  },
  {
    value: "official_website",
    label: "The business's own website",
    note: "Their site, used to show the business it depicts. Preferred over social.",
    tier: 2,
  },
  {
    value: "official_instagram",
    label: "The business's own Instagram",
    note: "Their account, not a customer's post or a repost.",
    tier: 2,
  },
  {
    value: "official_facebook",
    label: "The business's own Facebook",
    note: "Their page, not a customer's photo.",
    tier: 2,
  },
  {
    value: "other_editorial_source",
    label: "Another editorial source",
    note: "Anything else. Lands needing review and will not publish until cleared.",
    tier: 3,
  },
];

/** Look up an editorial source by value. */
export function editorialSource(value: string | null | undefined) {
  return EDITORIAL_SOURCE_TYPES.find((option) => option.value === value) ?? null;
}

/** Formats bytes for the library listing. */
export function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
