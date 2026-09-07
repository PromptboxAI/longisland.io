import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { ArticleView } from "@/components/articles/ArticleView";
import { ProductGuideView } from "@/components/products/ProductGuideView";
import { RankingView } from "@/components/rankings/RankingView";
import { requireAdmin } from "@/lib/auth";
import { getAdminProductGuide } from "@/lib/data/admin-product-queries";
import { getAdminArticle, getAdminRanking } from "@/lib/data/admin-queries";

/**
 * Admin-only preview of unpublished work.
 *
 * Renders the real page component, not an approximation, so what an editor
 * checks is what a reader gets. Publishing to see how something looks is how
 * half-finished pieces end up live for a minute.
 *
 * This does NOT bypass RLS. requireAdmin() redirects anyone without a session,
 * and the query underneath uses that editor's own cookies — the admin policy on
 * each table is what admits the draft. An anonymous request to this URL is sent
 * to the sign-in screen and never reaches the data.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preview",
  // A preview URL is shareable by accident. Keep it out of every index.
  robots: { index: false, follow: false, nocache: true },
};

type PageParams = { params: Promise<{ type: string; id: string }> };

export default async function PreviewPage({ params }: PageParams) {
  const { type, id } = await params;

  // Redirects to /admin/login when there is no session.
  await requireAdmin();

  if (type === "article") {
    const article = await getAdminArticle(id);
    if (!article) notFound();

    return (
      <>
        <PreviewBanner
          status={article.status}
          label="Article"
          liveHref={article.status === "published" ? `/articles/${article.slug}` : null}
        />
        <ArticleView article={article} />
      </>
    );
  }

  if (type === "ranking") {
    const ranking = await getAdminRanking(id);
    if (!ranking) notFound();

    return (
      <>
        <PreviewBanner
          status={ranking.status}
          label="Ranking"
          liveHref={ranking.status === "published" ? `/best/${ranking.slug}` : null}
        />
        <RankingView ranking={ranking} />
      </>
    );
  }

  if (type === "guide") {
    const guide = await getAdminProductGuide(id);
    if (!guide) notFound();

    return (
      <>
        <PreviewBanner
          status={guide.status}
          label="Buying guide"
          liveHref={guide.status === "published" ? `/products/${guide.slug}` : null}
        />
        <ProductGuideView guide={guide} />
      </>
    );
  }

  notFound();
}

function PreviewBanner({
  status,
  label,
  liveHref,
}: {
  status: string;
  label: string;
  liveHref: string | null;
}) {
  return (
    <div className="border-b border-gold-300 bg-gold-50">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm sm:px-6 lg:px-8">
        <p className="font-semibold text-navy-900">
          Preview · {label} · {status}
        </p>
        <p className="text-xs text-ink-700">
          {liveHref
            ? "This is published — readers see this page."
            : "Not published. Only signed-in editors can see this."}
        </p>
      </div>
    </div>
  );
}
