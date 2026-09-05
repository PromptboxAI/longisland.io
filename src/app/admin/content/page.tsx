import Link from "next/link";

import { StatusPill } from "@/components/admin/StatusPill";
import { listAdminRankings, listContentItems } from "@/lib/data/admin-queries";

export const dynamic = "force-dynamic";

/** The editorial pipeline, in order. Mirrors docs/editorial-workflow.md. */
const PIPELINE = [
  { status: "idea", label: "Idea" },
  { status: "script", label: "Script" },
  { status: "media", label: "Media" },
  { status: "ready", label: "Ready" },
  { status: "published", label: "Published" },
] as const;

export default async function AdminContentPage() {
  const [items, rankings] = await Promise.all([
    listContentItems(),
    listAdminRankings({ limit: 100 }),
  ]);

  const rankingTitle = new Map(rankings.map((r) => [r.id, r.title]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy-900">Content</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-500">
          Social and video work attached to rankings. Video rendering is not built
          yet — this tracks scripts, captions and links through the pipeline.
        </p>
      </div>

      {/* Pipeline counts */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PIPELINE.map((stage) => {
          const count = items.filter((item) => item.status === stage.status).length;
          return (
            <div
              key={stage.status}
              className="rounded-card border border-line bg-white p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                {stage.label}
              </p>
              <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-navy-900">
                {count}
              </p>
            </div>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="rounded-card border border-line bg-white p-12 text-center">
          <h2 className="text-lg font-bold text-navy-900">No content items yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
            Content items are created against a published ranking when you start
            scripting a video or social post for it.
          </p>
          <Link
            href="/admin/rankings"
            className="mt-5 inline-block rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            Go to rankings
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full min-w-3xl text-sm">
            <thead className="border-b border-line bg-sand-50 text-left">
              <tr>
                {["Ranking", "Platform", "Type", "Video", "Status"].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-sand-50">
                  <td className="px-5 py-3">
                    {item.ranking_id ? (
                      <Link
                        href={`/admin/rankings/${item.ranking_id}`}
                        className="font-semibold text-navy-900 hover:text-brand-600 hover:underline"
                      >
                        {rankingTitle.get(item.ranking_id) ?? "Untitled ranking"}
                      </Link>
                    ) : (
                      <span className="text-ink-500">Not linked</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink-700">{item.platform ?? "—"}</td>
                  <td className="px-5 py-3 text-ink-700">{item.content_type ?? "—"}</td>
                  <td className="px-5 py-3">
                    {item.video_url ? (
                      <a
                        href={item.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:underline"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
