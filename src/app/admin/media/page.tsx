import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { listMediaAssets, mediaUsageCounts } from "@/lib/data/admin-queries";

export const dynamic = "force-dynamic";

export default async function MediaLibraryPage() {
  const [assets, usage] = await Promise.all([listMediaAssets(), mediaUsageCounts()]);

  const missingAlt = assets.filter((asset) => !asset.alt_text).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-extrabold text-navy-900">Media</h1>
        <p className="mt-1 text-sm text-ink-500">
          {assets.length} image{assets.length === 1 ? "" : "s"}
          {missingAlt > 0 ? ` · ${missingAlt} without alt text` : null}
        </p>
      </div>

      <MediaLibrary assets={assets} usage={Object.fromEntries(usage)} />
    </div>
  );
}
