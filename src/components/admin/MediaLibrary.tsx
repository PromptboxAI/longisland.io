"use client";

import { Archive, ImageOff, Loader2 } from "lucide-react";
import { useActionState, useMemo, useState, useTransition } from "react";

import {
  saveMediaDetails,
  setMediaStatus,
  type MediaActionState,
} from "@/app/admin/media/actions";
import { FormError } from "@/components/forms/Field";
import { mediaUrl } from "@/lib/media/resolve";
import { formatBytes, MEDIA_SOURCES, type MediaAsset } from "@/types/media";

/**
 * The media library screen.
 *
 * A grid on the left, the selected asset's details on the right. The details
 * are where alt text, credit and rights live, and they live on the ASSET rather
 * than on each record that uses it — so a credit typed once is right in all
 * eight places the photo appears, and correcting it later is one edit rather
 * than a search.
 */

const INPUT =
  "w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";
const LABEL = "block text-xs font-semibold text-navy-900";

export function MediaLibrary({
  assets,
  usage,
}: {
  assets: MediaAsset[];
  usage: Record<string, number>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(assets[0]?.id ?? null);
  const [filter, setFilter] = useState("");

  const results = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return assets;
    return assets.filter((a) =>
      `${a.filename} ${a.alt_text ?? ""} ${a.caption ?? ""} ${a.credit ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [assets, filter]);

  const selected = assets.find((a) => a.id === selectedId) ?? null;

  if (assets.length === 0) {
    return (
      <div className="rounded-card border border-line bg-white p-10 text-center">
        <ImageOff aria-hidden="true" className="mx-auto size-8 text-ink-400" />
        <p className="mt-3 text-sm font-semibold text-navy-900">
          The library is empty.
        </p>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-500">
          Images are uploaded from the record that needs them — a ranking,
          article, business or product — and every one lands here, reusable
          everywhere else.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div>
        <input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Search filename, alt text, caption or credit"
          className={INPUT}
        />

        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5">
          {results.map((asset) => (
            <li key={asset.id}>
              <button
                type="button"
                onClick={() => setSelectedId(asset.id)}
                className={`relative block w-full overflow-hidden rounded-md border transition-colors ${
                  selectedId === asset.id
                    ? "border-brand-600 ring-2 ring-brand-500"
                    : "border-line hover:border-navy-500"
                }`}
              >
                <span className="block aspect-square bg-sand-50">
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin
                      thumbnails, not part of the public render path */}
                  <img
                    src={mediaUrl(asset.storage_path)}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                    style={{
                      objectPosition: `${asset.focal_x * 100}% ${asset.focal_y * 100}%`,
                    }}
                  />
                </span>
                {/* "No alt" names an HTML attribute. The badge is for an
                    editor, so it names what is missing instead. */}
                {!asset.alt_text ? (
                  <span className="absolute left-1 top-1 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    No description
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>

        {results.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">No image matches that.</p>
        ) : null}
      </div>

      {selected ? (
        <MediaDetails
          key={selected.id}
          asset={selected}
          usageCount={usage[selected.id] ?? 0}
        />
      ) : null}
    </div>
  );
}

function MediaDetails({
  asset,
  usageCount,
}: {
  asset: MediaAsset;
  usageCount: number;
}) {
  const [state, formAction, pending] = useActionState<MediaActionState, FormData>(
    saveMediaDetails,
    {},
  );
  const [focal, setFocal] = useState({ x: asset.focal_x, y: asset.focal_y });
  const [archiving, startArchive] = useTransition();

  return (
    <form action={formAction} className="rounded-card border border-line bg-white p-5">
      <input type="hidden" name="id" value={asset.id} />
      <input type="hidden" name="focalX" value={focal.x} />
      <input type="hidden" name="focalY" value={focal.y} />

      {/*
        Click the preview to set the focal point. The same photo is cropped to
        four different shapes across the site, and this is the only thing that
        decides which part survives the crop.
      */}
      <button
        type="button"
        className="relative block aspect-[4/3] w-full overflow-hidden rounded-md border border-line bg-sand-50"
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          setFocal({
            x: Number(((event.clientX - box.left) / box.width).toFixed(3)),
            y: Number(((event.clientY - box.top) / box.height).toFixed(3)),
          });
        }}
        title="Click to set the focal point"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
        <img
          src={mediaUrl(asset.storage_path)}
          alt=""
          className="size-full object-cover"
          style={{ objectPosition: `${focal.x * 100}% ${focal.y * 100}%` }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-600 shadow"
          style={{ left: `${focal.x * 100}%`, top: `${focal.y * 100}%` }}
        />
      </button>

      <p className="mt-2 text-xs text-ink-400">
        {asset.filename} · {asset.width ?? "?"}×{asset.height ?? "?"} ·{" "}
        {formatBytes(asset.size_bytes)} ·{" "}
        {usageCount === 0
          ? "not used yet"
          : `used in ${usageCount} place${usageCount === 1 ? "" : "s"}`}
      </p>

      <div className="mt-4 space-y-3">
        <div>
          {/* The same question the image control on every record asks, worded
              the same way. Two names for one field is how a VA learns that
              admin has a vocabulary they have to decode. */}
          <label htmlFor={`alt-${asset.id}`} className={LABEL}>
            What is in this photo?
          </label>
          <input
            id={`alt-${asset.id}`}
            name="altText"
            defaultValue={asset.alt_text ?? ""}
            className={`mt-1 ${INPUT}`}
            placeholder="A margherita pizza coming out of a wood-fired oven"
          />
          <p className="mt-1 text-xs text-ink-400">
            Read aloud to people using a screen reader, shown if the image fails
            to load, and one of the few things Google can read about a picture.
          </p>
        </div>

        <div>
          <label htmlFor={`caption-${asset.id}`} className={LABEL}>
            Caption
          </label>
          <input
            id={`caption-${asset.id}`}
            name="caption"
            defaultValue={asset.caption ?? ""}
            className={`mt-1 ${INPUT}`}
          />
        </div>

        <div>
          <label htmlFor={`source-${asset.id}`} className={LABEL}>
            Where it came from
          </label>
          <select
            id={`source-${asset.id}`}
            name="source"
            defaultValue={asset.source ?? ""}
            className={`mt-1 ${INPUT}`}
          >
            <option value="">Not recorded</option>
            {MEDIA_SOURCES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-400">
            What we are allowed to do with this file depends on the answer.
          </p>
        </div>

        <div>
          <label htmlFor={`credit-${asset.id}`} className={LABEL}>
            Credit line
          </label>
          <input
            id={`credit-${asset.id}`}
            name="credit"
            defaultValue={asset.credit ?? ""}
            className={`mt-1 ${INPUT}`}
            placeholder="Photograph by…"
          />
        </div>

        <div>
          <label htmlFor={`license-${asset.id}`} className={LABEL}>
            Licence
          </label>
          <input
            id={`license-${asset.id}`}
            name="license"
            defaultValue={asset.license ?? ""}
            className={`mt-1 ${INPUT}`}
          />
        </div>

        <div>
          <label htmlFor={`sourceUrl-${asset.id}`} className={LABEL}>
            Source URL
          </label>
          <input
            id={`sourceUrl-${asset.id}`}
            name="sourceUrl"
            type="url"
            defaultValue={asset.source_url ?? ""}
            className={`mt-1 ${INPUT}`}
          />
        </div>

        <div>
          <label htmlFor={`note-${asset.id}`} className={LABEL}>
            Permission note
          </label>
          <textarea
            id={`note-${asset.id}`}
            name="permissionNote"
            rows={2}
            defaultValue={asset.permission_note ?? ""}
            className={`mt-1 ${INPUT}`}
            placeholder="Who gave permission, when, and on what terms"
          />
        </div>
      </div>

      <FormError message={state.error} />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
        >
          {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          Save details
        </button>

        <button
          type="button"
          disabled={archiving}
          onClick={() => startArchive(() => void setMediaStatus(asset.id, "archived"))}
          className="inline-flex items-center gap-1.5 rounded-full border border-navy-300 px-4 py-2 text-sm font-semibold text-navy-900 hover:border-red-300 hover:text-red-600 disabled:opacity-60"
          title={
            usageCount > 0
              ? "Still used — archiving hides it from the picker but leaves live pages intact"
              : "Hide from the picker"
          }
        >
          <Archive aria-hidden="true" className="size-3.5" />
          Archive
        </button>

        {state.ok ? (
          <span className="text-xs font-semibold text-emerald-700">Saved</span>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-ink-400">
        Archiving takes an image out of the picker. It is never deleted, because
        a page already using it would be left pointing at nothing.
      </p>
    </form>
  );
}
