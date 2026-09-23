import { Plus } from "lucide-react";

import { createBlankArticle } from "@/app/admin/articles/actions";
import { ArticleBulkList } from "@/components/admin/ArticleBulkList";
import { listAdminArticles } from "@/lib/data/admin-queries";
import { articleKindLabel } from "@/types/articles";

export const dynamic = "force-dynamic";

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
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
          <input type="hidden" name="returnTo" value={params.returnTo ?? ""} />
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
        <ArticleBulkList
          articles={articles.map((article) => ({
            id: article.id,
            title: article.title,
            slug: article.slug,
            kindLabel: articleKindLabel(article.kind),
            published_at: article.published_at,
            status: article.status,
          }))}
        />
      )}
    </div>
  );
}
