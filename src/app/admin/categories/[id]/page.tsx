import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteCategory } from "@/app/admin/categories/actions";
import { StatusPill } from "@/components/admin/StatusPill";
import { TaxonomyForm } from "@/components/admin/TaxonomyForm";
import { listAdminCategories, listMediaAssets } from "@/lib/data/admin-queries";

export const dynamic = "force-dynamic";

type PageParams = { params: Promise<{ id: string }> };

export default async function CategoryEditorPage({ params }: PageParams) {
  const { id } = await params;

  const [categories, library] = await Promise.all([
    listAdminCategories(),
    listMediaAssets(),
  ]);

  const category = categories.find((c) => c.id === id);
  if (!category) notFound();

  async function remove() {
    "use server";
    await deleteCategory(id);
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/categories"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All categories
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold text-navy-900">{category.name}</h1>
          <StatusPill status={category.status} />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/category/${category.slug}`}
            className="rounded-full border border-navy-300 px-4 py-2 text-sm font-semibold text-navy-900 hover:border-navy-500 hover:bg-navy-50"
          >
            View page
          </Link>
          <form action={remove}>
            <button
              type="submit"
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy-900 hover:border-red-300 hover:text-red-600"
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-card border border-line bg-white p-5">
        <TaxonomyForm
          kind="category"
          record={category}
          parents={categories
            .filter((c) => c.id !== category.id)
            .map((c) => ({ id: c.id, name: c.name }))}
          library={library}
          heroMedia={library.find((a) => a.id === category.hero_media_id) ?? null}
        />
      </div>
    </div>
  );
}
