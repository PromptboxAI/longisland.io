/**
 * Media library types.
 *
 * A `MediaAsset` is a row in `media_assets`; the file itself lives in the
 * `media` storage bucket and is reached through `mediaUrl()`. Records reference
 * an asset by id and never copy its fields, so correcting alt text or a credit
 * once corrects it everywhere the image appears.
 */

export type MediaSource =
  | "own"
  | "business_provided"
  | "licensed"
  | "creator"
  | "manufacturer"
  | "other";

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
  source_url: string | null;
  license: string | null;
  permission_note: string | null;
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
  { value: "own", label: "Our own photo", note: "Shot by us. No restrictions." },
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

/** Formats bytes for the library listing. */
export function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
