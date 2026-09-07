import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { listMediaAssets, mediaUsageCounts } from "@/lib/data/admin-queries";

export const dynamic = "force-dynamic";

export default async function MediaLibraryPage() {
  const [assets, usage] = await Promise.all([listMediaAssets(), mediaUsageCounts()]);

  const missingAlt = assets.filter((asset) => !asset.alt_text).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {/* Monospace said "system table" about the one screen full of
              photographs. */}
          <h1 className="text-2xl font-extrabold text-navy-900">Media</h1>
          <p className="mt-1 text-sm text-ink-500">
            {assets.length} image{assets.length === 1 ? "" : "s"}
            {missingAlt > 0
              ? ` · ${missingAlt} still to describe`
              : null}
          </p>
        </div>

        {/* The library had no way to add to it: the only route in was a
            record's image field, so it could only be stocked one photo at a
            time, at the moment it was needed. */}
        <MediaUploader />
      </div>

      <MediaLibrary assets={assets} usage={Object.fromEntries(usage)} />
    </div>
  );
}
