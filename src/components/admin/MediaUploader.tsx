"use client";

import { Loader2, Upload } from "lucide-react";
import { MAX_UPLOAD_LABEL } from "@/lib/media/limits";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  createUploadTicket,
  registerUploadedAsset,
} from "@/app/admin/media/actions";
import { createClient } from "@/lib/supabase/client";

/**
 * Adding pictures to the library, from the library.
 *
 * The Media page listed and described assets but had no way to add one. The
 * only route in was the image control on a record, which means the library
 * could only ever be stocked one photo at a time, at the moment it was needed —
 * exactly when an editor least wants to stop and find a file. Someone preparing
 * a week of images in advance had nowhere to put them.
 *
 * Several at once, because that is how photographs arrive. Each is uploaded in
 * turn rather than in parallel: the failures worth reporting are per-file, and
 * eight simultaneous full-size uploads is a worse experience than eight quick
 * ones on any connection that would struggle.
 *
 * The file never passes through our server — a signed token authorises exactly
 * one path in Storage, and the bucket enforces type and size on arrival.
 */
export function MediaUploader() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  async function uploadAll(files: FileList) {
    setBusy(true);
    setErrors([]);
    const failed: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(`${i + 1} of ${files.length} — ${file.name}`);

      try {
        const ticket = await createUploadTicket(file.type, file.size);
        if (ticket.error || !ticket.token) {
          failed.push(`${file.name}: ${ticket.error ?? "could not start"}`);
          continue;
        }

        const { error: uploadError } = await createClient()
          .storage.from("media")
          .uploadToSignedUrl(ticket.path, ticket.token, file, {
            contentType: file.type,
          });

        if (uploadError) {
          failed.push(
            `${file.name}: refused — images only, ${MAX_UPLOAD_LABEL} maximum`,
          );
          continue;
        }

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

        if (result.error) failed.push(`${file.name}: ${result.error}`);
      } catch {
        failed.push(`${file.name}: the upload did not complete`);
      }
    }

    setErrors(failed);
    setProgress("");
    setBusy(false);
    if (input.current) input.current.value = "";
    // The list is server-rendered, so it needs telling.
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Upload aria-hidden="true" className="size-4" />
        )}
        {busy ? "Uploading…" : "Upload images"}
      </button>

      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={(event) => {
          const files = event.target.files;
          if (files && files.length > 0) void uploadAll(files);
        }}
      />

      {progress ? (
        <p aria-live="polite" className="mt-2 text-xs text-ink-500">
          {progress}
        </p>
      ) : null}

      {/*
        Named per file. "3 of 8 failed" makes an editor re-upload all eight to
        find out which three.
      */}
      {errors.length > 0 ? (
        <ul className="mt-2 space-y-0.5">
          {errors.map((message) => (
            <li key={message} className="text-xs font-semibold text-red-700">
              {message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Natural size, so a layout can reserve space before the image loads. */
function readDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });
}
