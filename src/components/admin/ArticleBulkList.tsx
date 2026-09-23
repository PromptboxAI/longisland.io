"use client";

import Link from "next/link";

import {
  BulkCheckbox,
  BulkDeleteBar,
  BulkSelectAll,
  useBulkSelect,
} from "@/components/admin/BulkDelete";
import { StatusPill } from "@/components/admin/StatusPill";
import { deleteArticles } from "@/app/admin/articles/actions";

export interface BulkArticleRow {
  id: string;
  title: string;
  slug: string;
  kindLabel: string;
  published_at: string | null;
  status: string;
}

/** The articles table, with drafts selectable for deletion. */
export function ArticleBulkList({ articles }: { articles: BulkArticleRow[] }) {
  const bulk = useBulkSelect(
    articles.map((a) => ({
      id: a.id,
      title: a.title,
      deletable: a.status !== "published",
    })),
  );

  return (
    <div className="space-y-3">
      <BulkDeleteBar
        chosen={bulk.chosen}
        noun="article"
        keptNote="Any images they used stay in the media library."
        error={bulk.error}
        onConfirm={(ids) => deleteArticles(ids)}
        onError={bulk.setError}
        onDone={bulk.clear}
      />

      <div className="overflow-x-auto rounded-card border border-line bg-white">
        <table className="w-full min-w-3xl text-sm">
          <thead className="border-b border-line bg-sand-50 text-left">
            <tr>
              <th scope="col" className="w-10 px-5 py-3">
                <BulkSelectAll
                  any={bulk.deletable.length > 0}
                  allChosen={bulk.allChosen}
                  onToggle={bulk.toggleAll}
                />
              </th>
              {["Headline", "Kind", "Published", "Status"].map((head) => (
                <th
                  key={head}
                  scope="col"
                  className="px-5 py-3 font-semibold text-navy-900"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {articles.map((article) => {
              const chosen = bulk.selected.has(article.id);
              return (
                <tr
                  key={article.id}
                  className={chosen ? "bg-amber-50" : "hover:bg-sand-50"}
                >
                  <td className="px-5 py-3">
                    <BulkCheckbox
                      id={article.id}
                      title={article.title}
                      checked={chosen}
                      deletable={article.status !== "published"}
                      onToggle={() => bulk.toggle(article.id)}
                      blockedReason="Published — unpublish before deleting"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/articles/${article.id}`}
                      className="font-semibold text-navy-900 hover:text-brand-600 hover:underline"
                    >
                      {article.title}
                    </Link>
                    <span className="mt-0.5 block font-mono text-xs text-ink-400">
                      /articles/{article.slug}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-700">{article.kindLabel}</td>
                  <td className="px-5 py-3 text-ink-500">
                    {article.published_at
                      ? new Date(article.published_at).toLocaleDateString("en-US")
                      : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill status={article.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
