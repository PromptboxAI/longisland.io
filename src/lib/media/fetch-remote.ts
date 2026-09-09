import "server-only";

import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/media/limits";

/**
 * Fetching an editorial image from a URL an editor typed.
 *
 * Server-side by necessity: we host our own copy rather than hotlinking, so the
 * bytes have to reach us. That makes this the one place in the application that
 * issues an outbound request to an address supplied through the browser, which
 * is the definition of an SSRF sink, so the guards below are not decoration.
 *
 * The admin is trusted, but "trusted" is not the question. A URL pasted from a
 * page an editor was reading is attacker-influenced input arriving through a
 * trusted hand, and the cloud metadata address returns credentials to anyone
 * who can persuade someone to paste it.
 */

export const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export type RemoteImage = {
  bytes: Uint8Array;
  mimeType: string;
  width: number | null;
  height: number | null;
  /** The URL actually fetched, after redirects. */
  finalUrl: string;
};

export type RemoteImageResult =
  | { ok: true; image: RemoteImage }
  | { ok: false; error: string };

/** Hosts that must never be reachable from a user-supplied URL. */
function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "0.0.0.0" || host === "::" || host === "::1") return true;
  // .local and .internal resolve inside private networks.
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;

  // IPv4 literals: loopback, link-local (cloud metadata), and RFC1918.
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true; // the cloud metadata endpoint
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  }

  // IPv6 unique-local and link-local.
  if (/^f[cd][0-9a-f]{2}:/i.test(host)) return true;
  if (/^fe80:/i.test(host)) return true;

  return false;
}

/**
 * Validates a URL an editor supplied, without fetching it.
 *
 * Exported so the action can reject a source PAGE url on the same terms as the
 * image url. That one is never fetched, but it is stored and later rendered as
 * a link, and a javascript: scheme in an href is its own problem.
 */
export function validateHttpUrl(raw: string): { url: URL } | { error: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { error: "That is not a valid URL." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { error: "Only http and https URLs are allowed." };
  }
  if (isBlockedHost(url.hostname)) {
    return { error: "That address is not reachable from here." };
  }
  return { url };
}

/**
 * Image dimensions from the file header.
 *
 * The upload path reads these in the browser, where an img element does the
 * work. Nothing equivalent exists on the server without pulling in an image
 * library for two numbers, so the three container formats that matter are
 * parsed by hand. AVIF is not among them; it returns null, and null is already
 * what every consumer handles, because dimensions are a layout hint rather than
 * a fact anything depends on.
 */
export function readDimensions(
  bytes: Uint8Array,
  mimeType: string,
): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  try {
    if (mimeType === "image/png" && bytes.length > 24) {
      // IHDR is always the first chunk: width and height at 16 and 20.
      return { width: view.getUint32(16), height: view.getUint32(20) };
    }

    if (mimeType === "image/jpeg") {
      // Walk the segment chain to the first start-of-frame marker.
      let offset = 2;
      while (offset + 9 < bytes.length) {
        if (view.getUint8(offset) !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = view.getUint8(offset + 1);
        // SOF0-SOF15, excluding the three that are not frame headers.
        if (
          marker >= 0xc0 &&
          marker <= 0xcf &&
          marker !== 0xc4 &&
          marker !== 0xc8 &&
          marker !== 0xcc
        ) {
          return {
            height: view.getUint16(offset + 5),
            width: view.getUint16(offset + 7),
          };
        }
        offset += 2 + view.getUint16(offset + 2);
      }
      return null;
    }

    if (mimeType === "image/webp" && bytes.length > 30) {
      const format = String.fromCharCode(
        bytes[12],
        bytes[13],
        bytes[14],
        bytes[15],
      );
      if (format === "VP8X") {
        // 24-bit little-endian, stored as the value minus one.
        const w = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
        const h = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
        return { width: w, height: h };
      }
      if (format === "VP8 ") {
        return {
          width: view.getUint16(26, true) & 0x3fff,
          height: view.getUint16(28, true) & 0x3fff,
        };
      }
      if (format === "VP8L") {
        const bits =
          bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
        return {
          width: (bits & 0x3fff) + 1,
          height: ((bits >> 14) & 0x3fff) + 1,
        };
      }
    }
  } catch {
    return null;
  }

  return null;
}

/** Sniffs the real type, so a .jpg that is actually HTML is caught. */
function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  const b = bytes;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return "image/png";
  }
  const riff = String.fromCharCode(b[0], b[1], b[2], b[3]);
  const webp = String.fromCharCode(b[8], b[9], b[10], b[11]);
  if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  // ISO-BMFF ftyp box with an AVIF brand.
  const ftyp = String.fromCharCode(b[4], b[5], b[6], b[7]);
  if (ftyp === "ftyp") {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return null;
}

/**
 * Downloads one image.
 *
 * The declared content-type is treated as a hint and the magic bytes as the
 * answer: a server that labels an HTML error page as a JPEG would otherwise put
 * a page of markup in the library under a .jpg name.
 */
export async function fetchRemoteImage(rawUrl: string): Promise<RemoteImageResult> {
  const checked = validateHttpUrl(rawUrl);
  if ("error" in checked) return { ok: false, error: checked.error };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let response: Response;
  try {
    response = await fetch(checked.url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Some CDNs refuse an unrecognised agent outright.
        "User-Agent": "LongIsland.io editorial image import",
        Accept: "image/avif,image/webp,image/png,image/jpeg",
      },
      cache: "no-store",
    });
  } catch {
    clearTimeout(timeout);
    return { ok: false, error: "Could not reach that URL." };
  }
  clearTimeout(timeout);

  if (!response.ok) {
    return { ok: false, error: `That URL returned ${response.status}.` };
  }

  // A redirect can land somewhere the original hostname check would have
  // refused, so the final address is checked too.
  const landed = validateHttpUrl(response.url || checked.url.toString());
  if ("error" in landed) return { ok: false, error: landed.error };

  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `Images must be ${MAX_UPLOAD_LABEL} or smaller.` };
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await response.arrayBuffer();
  } catch {
    return { ok: false, error: "That image could not be downloaded." };
  }

  const bytes = new Uint8Array(buffer);
  if (bytes.byteLength === 0) {
    return { ok: false, error: "That URL returned nothing." };
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `Images must be ${MAX_UPLOAD_LABEL} or smaller.` };
  }

  const sniffed = sniffMime(bytes);
  if (!sniffed || !ALLOWED_IMAGE_MIME.has(sniffed)) {
    return {
      ok: false,
      error: "That URL is not a JPEG, PNG, WebP or AVIF image.",
    };
  }

  const dimensions = readDimensions(bytes, sniffed);

  return {
    ok: true,
    image: {
      bytes,
      mimeType: sniffed,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
      finalUrl: landed.url.toString(),
    },
  };
}
