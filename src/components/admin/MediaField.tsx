"use client";

import {
  ImagePlus,
  Library,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { MAX_UPLOAD_LABEL } from "@/lib/media/limits";

import {
  createUploadTicket,
  registerUploadedAsset,
  saveMediaMetadata,
} from "@/app/admin/media/actions";
import { mediaUrl } from "@/lib/media/resolve";
import { createClient } from "@/lib/supabase/client";
import type { MediaAsset } from "@/types/media";

/**
 * The standard image control.
 *
 * Every image on the site is set through this: rankings, articles, guides,
 * businesses, categories, places, products and editorial overrides. It writes
 * the chosen asset id into a hidden input, so it drops into the existing form
 * pattern without any action needing to know an upload happened.
 *
 * Two ways in, because they answer different questions. "Upload new" is for a
 * photo that does not exist here yet. "Choose existing" is the reason the
 * library exists at all — one business photo belongs on the business profile
 * and in three rankings, and uploading it four times would leave four files to
 * correct when the credit turns out to be wrong.
 *
 * The file never passes through our server: `createUploadTicket` mints a signed
 * URL for a server-chosen path and the browser PUTs straight to Storage, which
 * is what allows a large photo at all.
 */

export interface MediaFieldProps {
  /** Hidden input name — the media asset id the form action will read. */
  name: string;
  /** Currently selected asset, if any. */
  value?: MediaAsset | null;
  /** The library, for "Choose existing". */
  library: MediaAsset[];
  label?: string;
  /** Optional URL fallback field, for images we do not host. */
  urlName?: string;
  urlValue?: string | null;
  hint?: string;
  /**
   * Called whenever the selection changes, so a parent using autosave can
   * persist it. The hidden inputs remain for the forms that still submit.
   */
  onChange?: (mediaId: string | null, urlFallback: string | null) => void;
}

const BUTTON =
  "inline-flex items-center gap-1.5 rounded-full border border-navy-300 px-3.5 py-1.5 text-xs font-semibold text-navy-900 transition-colors hover:border-navy-500 hover:bg-navy-50 disabled:opacity-60";

export function MediaField({
  name,
  value = null,
  library,
  label = "Image",
  urlName,
  urlValue = null,
  hint,
  onChange,
}: MediaFieldProps) {
  const [asset, setAsset] = useState<MediaAsset | null>(value);
  const [url, setUrl] = useState(urlValue ?? "");
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const preview = asset ? mediaUrl(asset.storage_path) : url.trim() || null;

  const results = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return library;
    return library.filter((item) =>
      `${item.filename} ${item.alt_text ?? ""} ${item.caption ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [library, filter]);

  async function upload(file: File) {
    setBusy(true);
    setError("");

    try {
      const ticket = await createUploadTicket(file.type, file.size);
      if (ticket.error || !ticket.token) {
        setError(ticket.error ?? "Could not start the upload.");
        return;
      }

      // Straight to Storage. The signed token authorises exactly this one path,
      // and the bucket enforces the type and size limits on arrival.
      const { error: uploadError } = await createClient()
        .storage.from("media")
        .uploadToSignedUrl(ticket.path, ticket.token, file, {
          contentType: file.type,
        });

      if (uploadError) {
        setError(`The upload was refused. Images only, ${MAX_UPLOAD_LABEL} maximum.`);
        return;
      }

      // Read the natural size so layouts can reserve space before it loads.
      const dimensions = await readDimensions(file);

      const result = await registerUploadedAsset({
        storagePath: ticket.path,
        filename: file.name,
        mimeType: file.type,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        sizeBytes: file.size,
        altText: null,
      });

      if (result.error || !result.asset) {
        setError(result.error ?? "Uploaded, but could not be saved to the library.");
        return;
      }

      setAsset(result.asset);
      setUrl("");
      onChange?.(result.asset.id, null);
    } catch {
      setError("The upload did not complete.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div>
      <p className="block text-sm font-semibold text-navy-900">{label}</p>

      {/* What the form actually submits. */}
      <input type="hidden" name={name} value={asset?.id ?? ""} />
      {urlName ? <input type="hidden" name={urlName} value={asset ? "" : url} /> : null}

      <div className="mt-2 flex flex-wrap items-start gap-4">
        <div className="relative size-28 shrink-0 overflow-hidden rounded-md border border-line bg-sand-50">
          {preview ? (
            /* Admin preview only. A pasted URL can be any host, and the
               optimiser would need each one allow-listed to render a thumbnail
               nobody outside the CMS ever sees. */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className="size-full object-cover"
              style={
                asset
                  ? { objectPosition: `${asset.focal_x * 100}% ${asset.focal_y * 100}%` }
                  : undefined
              }
            />
          ) : (
            <span className="grid size-full place-items-center text-ink-400">
              <ImagePlus aria-hidden="true" className="size-6" />
            </span>
          )}
          {busy ? (
            <span className="absolute inset-0 grid place-items-center bg-white/75">
              <Loader2 aria-hidden="true" className="size-5 animate-spin text-navy-900" />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={BUTTON}
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              <Upload aria-hidden="true" className="size-3.5" />
              {asset || url ? "Replace" : "Upload new"}
            </button>

            <button
              type="button"
              className={BUTTON}
              disabled={busy}
              onClick={() => setPicking(true)}
            >
              <Library aria-hidden="true" className="size-3.5" />
              Choose existing
            </button>

            {asset || url ? (
              <button
                type="button"
                className={BUTTON}
                disabled={busy}
                onClick={() => {
                  setAsset(null);
                  setUrl("");
                  onChange?.(null, null);
                }}
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                Remove
              </button>
            ) : null}
          </div>

          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />

          {asset ? (
            <ImageDetails
              asset={asset}
              onSaved={(next) => setAsset(next)}
            />
          ) : null}

          {urlName && !asset ? (
            <div className="mt-3">
              <label
                htmlFor={`${name}-url`}
                className="block text-xs font-semibold text-ink-500"
              >
                Or paste a URL
              </label>
              <input
                id={`${name}-url`}
                type="url"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  onChange?.(null, event.target.value);
                }}
                placeholder="https://…"
                className="mt-1 w-full rounded-md border border-line px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="mt-1 text-xs text-ink-400">
                Fallback for images we do not host. An uploaded image carries alt
                text, credit and a focal point; a pasted URL carries none of them.
              </p>
            </div>
          ) : null}

          {hint ? <p className="mt-2 text-xs text-ink-400">{hint}</p> : null}
          {error ? <p className="mt-2 text-xs font-semibold text-red-600">{error}</p> : null}
        </div>
      </div>

      {picking ? (
        <div className="mt-3 rounded-card border border-line bg-white p-4">
          <div className="flex items-center gap-3">
            <input
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Search by filename, alt text or caption"
              className="w-full rounded-md border border-line px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="button"
              className={BUTTON}
              onClick={() => setPicking(false)}
              aria-label="Close the library"
            >
              <X aria-hidden="true" className="size-3.5" />
              Close
            </button>
          </div>

          {results.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">
              {library.length === 0
                ? "Nothing in the library yet. Upload an image and it will be reusable everywhere."
                : "No image matches that."}
            </p>
          ) : (
            <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
              {results.slice(0, 60).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setAsset(item);
                      setUrl("");
                      setPicking(false);
                      onChange?.(item.id, null);
                    }}
                    className={`block w-full overflow-hidden rounded-md border transition-colors ${
                      asset?.id === item.id
                        ? "border-brand-600 ring-2 ring-brand-500"
                        : "border-line hover:border-navy-500"
                    }`}
                    title={item.alt_text ?? item.filename}
                  >
                    <span className="block aspect-square bg-sand-50">
                      {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
                      <img
                        src={mediaUrl(item.storage_path)}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Natural pixel size, read in the browser before upload. */
async function readDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}

/**
 * The one-line description that goes with a photo, editable where the photo is.
 *
 * This used to say "No alt text — add it in the Media library", which asked an
 * editor to know a piece of HTML vocabulary and then to leave the page they
 * were working on to act on it. Both halves were wrong: the words are jargon,
 * and sending someone away mid-task is how a field stays empty forever.
 *
 * So it is asked as a question — what is in the photo — and answered here.
 */
function ImageDetails({
  asset,
  onSaved,
}: {
  asset: MediaAsset;
  onSaved: (asset: MediaAsset) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(asset.alt_text ?? "");
  const [credit, setCredit] = useState(asset.credit ?? "");
  const [saving, startSave] = useTransition();
  const [error, setError] = useState("");

  const described = Boolean(asset.alt_text?.trim());

  function save() {
    startSave(async () => {
      setError("");
      const result = await saveMediaMetadata(asset.id, {
        altText: description,
        caption: asset.caption ?? "",
        credit,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved({
        ...asset,
        alt_text: description.trim() || null,
        credit: credit.trim() || null,
      });
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
        <span className="truncate text-ink-500">{asset.filename}</span>
        {described ? (
          <span className="truncate text-ink-400">&ldquo;{asset.alt_text}&rdquo;</span>
        ) : (
          <span className="font-semibold text-amber-700">Not described yet</span>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline"
        >
          <Pencil aria-hidden="true" className="size-3" />
          {described ? "Edit description" : "Describe this image"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-line bg-sand-50 p-3">
      <label
        htmlFor={`describe-${asset.id}`}
        className="block text-xs font-semibold text-navy-900"
      >
        What is in this photo?
      </label>
      <p className="mt-0.5 text-xs leading-relaxed text-ink-400">
        One plain sentence, as if describing it to someone on the phone. It is
        read aloud to people using a screen reader, shown if the image fails to
        load, and it is one of the few things Google can read about a picture.
      </p>
      <input
        id={`describe-${asset.id}`}
        type="text"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="A margherita pizza coming out of a wood-fired oven"
        className="mt-1.5 w-full rounded-md border border-line px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
      />

      <label
        htmlFor={`credit-${asset.id}`}
        className="mt-3 block text-xs font-semibold text-navy-900"
      >
        Photo credit <span className="font-normal text-ink-400">(if needed)</span>
      </label>
      <input
        id={`credit-${asset.id}`}
        type="text"
        value={credit}
        onChange={(event) => setCredit(event.target.value)}
        placeholder="Who took it, or where it came from"
        className="mt-1.5 w-full rounded-md border border-line px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
      />

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          ) : null}
          Save
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            setDescription(asset.alt_text ?? "");
            setCredit(asset.credit ?? "");
            setEditing(false);
          }}
          className="rounded-full border border-navy-300 px-4 py-1.5 text-xs font-semibold text-navy-900 hover:bg-navy-50"
        >
          Cancel
        </button>
        {/* The photo is shared, so the consequence has to be said. */}
        <span className="text-xs text-ink-400">
          Applies everywhere this photo is used.
        </span>
      </div>

      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
