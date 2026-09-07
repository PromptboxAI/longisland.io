import { Plus } from "lucide-react";
import Link from "next/link";

import { createBlankArticle } from "@/app/admin/articles/actions";
import { StatusPill } from "@/components/admin/StatusPill";
import { listAdminArticles } from "@/lib/data/admin-queries";
import { articleKindLabel } from "@/types/articles";

export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const articles = await listAdminArticles();
  const live = articles.filter((a) => a.status === "published").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">Articles</h1>
          <p className="mt-1 text-sm text-ink-500">
            {articles.length} total · {live} published. Guides, features,
            roundups and news — everything that is not a ranking or a buying
            guide.
          </p>
        </div>
        <form action={createBlankArticle}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <Plus aria-hidden="true" className="size-4" />
            New article
          </button>
        </form>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-card border border-line bg-white p-10 text-center">
          <p className="text-sm text-ink-500">
            Nothing written yet. An article can be featured on the homepage the
            moment it is published — it does not have to be a ranking.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-sand-50 text-left">
              <tr>
                <th className="px-5 py-3 font-semibold text-navy-900">Headline</th>
                <th className="px-5 py-3 font-semibold text-navy-900">Kind</th>
                <th className="px-5 py-3 font-semibold text-navy-900">Published</th>
                <th className="px-5 py-3 font-semibold text-navy-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-sand-50">
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
                  <td className="px-5 py-3 text-ink-700">
                    {articleKindLabel(article.kind)}
                  </td>
                  <td className="px-5 py-3 text-ink-500">
                    {article.published_at
                      ? new Date(article.published_at).toLocaleDateString("en-US")
                      : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill status={article.status} />
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
