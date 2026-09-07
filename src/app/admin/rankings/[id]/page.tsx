import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  publishEntryBusinesses,
  setRankingStatus,
} from "@/app/admin/rankings/actions";
import { AddRankingEntry } from "@/components/admin/AddRankingEntry";
import { RankingDetailsForm } from "@/components/admin/RankingDetailsForm";
import {
  RankingEditorProvider,
  RankingLiveTitle,
} from "@/components/admin/RankingEditorContext";
import { AiDraftPanel } from "@/components/admin/AiDraftPanel";
import { PublishRankingButton } from "@/components/admin/PublishRankingButton";
import { RankingEntryList } from "@/components/admin/RankingEntryList";
import { RecommendedProductsEditor } from "@/components/admin/RecommendedProductsEditor";
import { StatusPill } from "@/components/admin/StatusPill";
import {
  getAdminRanking,
  listAdminCategories,
  listAdminPlaces,
  listMediaAssets,
  listTargetCandidates,
  listYelpReferencedBusinessIds,
} from "@/lib/data/admin-queries";
import { isAiConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

type PageParams = { params: Promise<{ id: string }> };

export default async function RankingEditorPage({ params }: PageParams) {
  const { id } = await params;

  const [ranking, categories, places, library, candidates] = await Promise.all([
    getAdminRanking(id),
    listAdminCategories(),
    listAdminPlaces(),
    listMediaAssets(),
    listTargetCandidates(),
  ]);

  if (!ranking) notFound();

  const heroMedia = library.find((a) => a.id === ranking.hero_media_id) ?? null;

  /*
   * Which businesses have a Yelp reference, so the evidence line can say
   * whether review excerpts are obtainable — one query for the whole list
   * rather than one per entry.
   */
  const yelpReferencedBusinessIds = await listYelpReferencedBusinessIds(
    ranking.entries.map((entry) => entry.business.id),
  );

  const entriesMissingCopy = ranking.entries.filter(
    (entry) => !entry.best_for?.trim() || !entry.editorial_reason?.trim(),
  ).length;
  const ogMedia = library.find((a) => a.id === ranking.og_image_media_id) ?? null;

  const isPublished = ranking.status === "published";

  /*
   * Businesses arrive from a Yelp search as drafts, and RLS hides a draft
   * business from readers — so a published ranking whose entries are all drafts
   * renders "no published entries" while the editor is looking at ten of them.
   * The warning below is the only place that failure is visible before a reader
   * finds it.
   */
  const draftBusinesses = ranking.entries.filter(
    (entry) => entry.business.status !== "published",
  );

  async function publishBusinesses() {
    "use server";
    await publishEntryBusinesses(id);
  }

  // Server Actions must be bound here; the buttons below are inside forms.
  async function unpublish() {
    "use server";
    await setRankingStatus(id, "draft");
  }

  return (
    <RankingEditorProvider initialTitle={ranking.title}>
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

      {isPublished ? (
        <p className="rounded-card border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
          <span className="font-semibold">Published — changes save live.</span>{" "}
          Edits below reach the public page as they save. You do not need to
          publish again.
        </p>
      ) : null}

      {draftBusinesses.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-amber-300 bg-amber-50 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-navy-900">
              {draftBusinesses.length} of {ranking.entries.length} businesses on
              this list {draftBusinesses.length === 1 ? "is a draft" : "are drafts"}
              {isPublished ? " and will not appear on the published page." : "."}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-700">
              Businesses researched from Yelp are created as drafts so nothing
              reaches the site straight from a third-party search. Publishing the
              ranking does not publish them.
            </p>
          </div>
          <form action={publishBusinesses}>
            <button
              type="submit"
              className="rounded-full bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800"
            >
              Publish {draftBusinesses.length}{" "}
              {draftBusinesses.length === 1 ? "business" : "businesses"}
            </button>
          </form>
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <RankingLiveTitle fallback={ranking.title} />
            <StatusPill status={ranking.status} />
          </div>
          <p className="mt-1 font-mono text-xs text-ink-400">/best/{ranking.slug}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={
              isPublished ? `/best/${ranking.slug}` : `/preview/ranking/${ranking.id}`
            }
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-navy-900 hover:border-brand-500"
          >
            {isPublished ? "View page" : "Preview"}
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
            <PublishRankingButton
              rankingId={ranking.id}
              draftBusinessCount={draftBusinesses.length}
            />
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
              library={library}
              heroMedia={heroMedia}
              ogMedia={ogMedia}
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

          <div className="mb-4">
            <AiDraftPanel
              rankingId={ranking.id}
              entryCount={ranking.entries.length}
              entriesMissingCopy={entriesMissingCopy}
              configured={isAiConfigured}
            />
          </div>

          {ranking.entries.length === 0 ? (
            <div className="rounded-card border border-line bg-white p-8 text-center">
              <p className="text-sm text-ink-500">
                Nothing on this list yet. Add businesses below, or start from a
                Yelp search and pick from what it returns.
              </p>
              <Link
                href="/admin/generate"
                className="mt-4 inline-block rounded-full border border-navy-300 px-5 py-2 text-sm font-semibold text-navy-900 hover:border-navy-500 hover:bg-navy-50"
              >
                Research candidates
              </Link>
            </div>
          ) : (
            <RankingEntryList
              entries={ranking.entries}
              rankingId={ranking.id}
              library={library}
              rankingPlaceName={
                /*
                 * Only a town-shaped place is a fair comparison. A ranking
                 * scoped to "Long Island" produced "This business is in North
                 * Babylon, not Long Island" — nonsense, since North Babylon is
                 * on Long Island. Region-scoped rankings are covered by the
                 * Long Island check inside the editor instead.
                 */
                ranking.place &&
                ["town", "village", "hamlet"].includes(ranking.place.type)
                  ? ranking.place.name
                  : null
              }
              yelpReferencedBusinessIds={yelpReferencedBusinessIds}
              aiConfigured={isAiConfigured}
              rankingPublished={isPublished}
            />
          )}

          <div className="mt-4">
            <AddRankingEntry
              rankingId={ranking.id}
              businesses={candidates.businesses}
              usedBusinessIds={ranking.entries.map((entry) => entry.business_id)}
            />
          </div>
        </section>
      </div>

      {/* Products recommended alongside this list. Self-contained: it fetches
          its own data and binds its own actions. */}
      <RecommendedProductsEditor contentType="ranking" contentId={ranking.id} />
      </div>
    </RankingEditorProvider>
  );
}
