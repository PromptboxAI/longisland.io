import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { setRankingStatus } from "@/app/admin/rankings/actions";
import { RankingDetailsForm } from "@/components/admin/RankingDetailsForm";
import { RankingEntryEditor } from "@/components/admin/RankingEntryEditor";
import { RecommendedProductsEditor } from "@/components/admin/RecommendedProductsEditor";
import { StatusPill } from "@/components/admin/StatusPill";
import {
  getAdminRanking,
  listAdminCategories,
  listAdminPlaces,
} from "@/lib/data/admin-queries";

export const dynamic = "force-dynamic";

type PageParams = { params: Promise<{ id: string }> };

export default async function RankingEditorPage({ params }: PageParams) {
  const { id } = await params;

  const [ranking, categories, places] = await Promise.all([
    getAdminRanking(id),
    listAdminCategories(),
    listAdminPlaces(),
  ]);

  if (!ranking) notFound();

  const isPublished = ranking.status === "published";

  // Server Actions must be bound here; the buttons below are inside forms.
  async function publish() {
    "use server";
    await setRankingStatus(id, "published");
  }

  async function unpublish() {
    "use server";
    await setRankingStatus(id, "draft");
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/rankings"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          All rankings
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-navy-900">
              {ranking.title}
            </h1>
            <StatusPill status={ranking.status} />
          </div>
          <p className="mt-1 font-mono text-xs text-ink-400">/best/{ranking.slug}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/best/${ranking.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-navy-900 hover:border-brand-500"
          >
            Preview
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </Link>

          {isPublished ? (
            <form action={unpublish}>
              <button
                type="submit"
                className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-navy-900 hover:border-red-300 hover:text-red-600"
              >
                Unpublish
              </button>
            </form>
          ) : (
            <form action={publish}>
              <button
                type="submit"
                className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Publish
              </button>
            </form>
          )}
        </div>
      </div>

      {!isPublished ? (
        <p className="rounded-card border border-line bg-sand-50 px-4 py-3 text-sm text-ink-700">
          This ranking is a draft. It is not visible on the public site, and its
          entries are hidden by row-level security until it is published.
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* Details */}
        <section aria-labelledby="ranking-details">
          <h2
            id="ranking-details"
            className="mb-4 text-sm font-bold uppercase tracking-wider text-navy-900"
          >
            Details
          </h2>
          <div className="rounded-card border border-line bg-white p-5">
            <RankingDetailsForm
              ranking={ranking}
              categories={categories}
              places={places}
            />
          </div>
        </section>

        {/* Entries */}
        <section aria-labelledby="ranking-entries">
          <h2
            id="ranking-entries"
            className="mb-4 text-sm font-bold uppercase tracking-wider text-navy-900"
          >
            Entries ({ranking.entries.length})
          </h2>

          {ranking.entries.length === 0 ? (
            <div className="rounded-card border border-line bg-white p-10 text-center">
              <p className="text-sm text-ink-500">
                No entries yet. Research candidates and add them to this list.
              </p>
              <Link
                href="/admin/generate"
                className="mt-4 inline-block rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
              >
                Find candidates
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {ranking.entries.map((entry, index) => (
                <RankingEntryEditor
                  key={entry.id}
                  entry={entry}
                  rankingId={ranking.id}
                  isFirst={index === 0}
                  isLast={index === ranking.entries.length - 1}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Products recommended alongside this list. Self-contained: it fetches
          its own data and binds its own actions. */}
      <RecommendedProductsEditor contentType="ranking" contentId={ranking.id} />
    </div>
  );
}
