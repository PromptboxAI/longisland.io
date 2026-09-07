import { ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";

import { ReturnToBanner } from "@/components/admin/ReturnToBanner";
import { DeleteRowButton } from "@/components/admin/DeleteRowButton";
import { notFound } from "next/navigation";

import { deleteArticle, setArticleStatus } from "@/app/admin/articles/actions";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { StatusPill } from "@/components/admin/StatusPill";
import {
  getAdminArticle,
  listAdminCategories,
  listAdminPlaces,
  listMediaAssets,
} from "@/lib/data/admin-queries";

export const dynamic = "force-dynamic";

type PageParams = { params: Promise<{ id: string }> };

export default async function ArticleEditorPage({
  params,
  searchParams,
}: PageParams & { searchParams: Promise<{ returnTo?: string }> }) {
  // Set when an editor came here from an editorial placement to make something
  // that did not exist yet. It is the only record of that trip.
  const { returnTo } = await searchParams;
  const { id } = await params;

  const [article, categories, places, library] = await Promise.all([
    getAdminArticle(id),
    listAdminCategories(),
    listAdminPlaces(),
    listMediaAssets(),
  ]);

  if (!article) notFound();

  const isPublished = article.status === "published";

  async function publish() {
    "use server";
    await setArticleStatus(id, "published");
  }

  async function unpublish() {
    "use server";
    await setArticleStatus(id, "draft");
  }

  async function remove() {
    "use server";
    await deleteArticle(id);
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/articles"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All articles
      </Link>
      <ReturnToBanner returnTo={returnTo} label="Back to the placement" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-navy-900">{article.title}</h1>
            <StatusPill status={article.status} />
          </div>
          <p className="mt-1 font-mono text-xs text-ink-400">
            /articles/{article.slug}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/preview/article/${article.id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-full border border-navy-300 px-4 py-2 text-sm font-semibold text-navy-900 hover:border-navy-500 hover:bg-navy-50"
          >
            <Eye aria-hidden="true" className="size-4" />
            Preview
          </Link>

          {isPublished ? (
            <form action={unpublish}>
              <button
                type="submit"
                className="rounded-full border border-navy-300 px-5 py-2 text-sm font-semibold text-navy-900 hover:border-navy-500 hover:bg-navy-50"
              >
                Unpublish
              </button>
            </form>
          ) : (
            <form action={publish}>
              <button
                type="submit"
                className="rounded-full bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800"
              >
                Publish
              </button>
            </form>
          )}

          {/* Asks first: deleting is not undone by typing again. */}
          <DeleteRowButton
            name={article.title}
            consequence="Every placement curating it loses the item too."
            onDelete={remove}
          />
        </div>
      </div>

      <div className="rounded-card border border-line bg-white p-5">
        <ArticleForm
          article={article}
          categories={categories}
          places={places}
          library={library}
        />
      </div>
    </div>
  );
}
