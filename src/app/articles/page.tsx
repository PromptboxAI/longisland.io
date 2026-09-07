import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { EditorialEmpty } from "@/components/ui/EditorialEmpty";
import { EditorialImage } from "@/components/ui/EditorialImage";
import { RuleHeading } from "@/components/ui/RuleHeading";
import { formatDate } from "@/components/editorial/EditorialDisclosure";
import { listArticles } from "@/lib/data/article-queries";
import { resolveImage } from "@/lib/media/resolve";
import { ARTICLE_KINDS, articleKindLabel, type ArticleSummary } from "@/types/articles";
import type { BreadcrumbItem } from "@/lib/seo/json-ld";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Guides & Features",
  description:
    "Seasonal guides, weekend plans, event roundups and features about Long Island.",
  alternates: { canonical: "/articles" },
};

type PageProps = { searchParams: Promise<{ kind?: string }> };

export default async function ArticlesIndexPage({ searchParams }: PageProps) {
  const { kind } = await searchParams;
  const articles = await listArticles({ kind });

  const crumbs: BreadcrumbItem[] = [
    { name: "Home", href: "/" },
    { name: "Articles", href: "/articles" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={crumbs} />

      <h1 className="mt-3 text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl">
        Guides &amp; Features
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-700">
        Seasonal guides, weekend plans, event roundups and the occasional piece
        about why things here are the way they are.
      </p>

      {/* Kind filters, rendered as links so they work without JavaScript and
          stay shareable. */}
      <nav aria-label="Filter by kind" className="mt-6 flex flex-wrap gap-2">
        <FilterLink href="/articles" label="Everything" active={!kind} />
        {ARTICLE_KINDS.map((option) => (
          <FilterLink
            key={option.value}
            href={`/articles?kind=${option.value}`}
            label={option.label}
            active={kind === option.value}
          />
        ))}
      </nav>

      <div className="mt-8">
        {articles.length === 0 ? (
          <div className="rounded-card border border-line bg-sand-50 p-10 text-center">
            <p className="text-base font-semibold text-navy-900">
              Nothing here yet.
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-700">
              Guides and features land here as we publish them.
            </p>
            <div className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <EditorialEmpty key={n} variant="card" index={n} />
              ))}
            </div>
          </div>
        ) : (
          <>
            <RuleHeading id="all-articles" title="Latest" uppercase />
            <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FilterLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-navy-900 bg-navy-900 text-white"
          : "border-line text-ink-700 hover:border-navy-500 hover:text-navy-900"
      }`}
    >
      {label}
    </Link>
  );
}

/**
 * Index card for an article.
 *
 * Shaped after the ranking and guide cards — same dateline, same headline face,
 * same stretched link — so /articles reads as the same publication rather than
 * as a blog bolted on.
 */
function ArticleCard({ article }: { article: ArticleSummary }) {
  const image = resolveImage(article.hero_media, article.hero_image_url, article.title);
  const href = `/articles/${article.slug}`;

  return (
    <article className="group relative">
      <div className="relative aspect-[16/10] overflow-hidden rounded-card border border-line">
        <EditorialImage
          src={image?.url ?? null}
          alt=""
          seed={article.slug}
          objectPosition={image?.objectPosition}
          fallbackLabel={article.category?.name ?? articleKindLabel(article.kind)}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>

      <div className="pt-3">
        <p className="mb-1.5 text-xs leading-[25px]">
          {article.published_at ? (
            <span className="text-ink-400">
              {formatDate(new Date(article.published_at))}
            </span>
          ) : null}
          {article.published_at ? (
            <span className="mx-1.5 text-ink-400">|</span>
          ) : null}
          <span className="font-semibold uppercase text-brand-600">
            {article.category?.name ?? articleKindLabel(article.kind)}
          </span>
        </p>

        <h3 className="headline text-base text-navy-900">
          <Link href={href} className="after:absolute after:inset-0 hover:text-brand-600">
            {article.title}
          </Link>
        </h3>

        {article.dek ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-700">
            {article.dek}
          </p>
        ) : null}
      </div>
    </article>
  );
}
