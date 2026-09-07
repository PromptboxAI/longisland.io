import type { NextConfig } from "next";

/**
 * Remote image hosts.
 *
 * next/image refuses any host that is not allow-listed, with no fallback and no
 * visible error beyond a broken frame — so an uploaded image renders nothing
 * until its host appears here.
 *
 * The hostname is derived from the Supabase URL rather than written out, so the
 * allow-list follows the project across environments instead of silently
 * pointing at whichever one happened to be configured when this was written.
 * `/storage/v1/object/public/**` is the only path a public asset is served
 * from; nothing else in the Supabase API returns an image.
 */
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";

const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
