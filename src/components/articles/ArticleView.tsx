import Link from "next/link";

import { ArticleBody } from "@/components/articles/ArticleBody";
import { formatDate } from "@/components/editorial/EditorialDisclosure";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { EditorialImage } from "@/components/ui/EditorialImage";
import { resolveImage } from "@/lib/media/resolve";
import {
  breadcrumbJsonLd,
  jsonLdScriptProps,
  type BreadcrumbItem,
} from "@/lib/seo/json-ld";
import { articleKindLabel, type ArticleWithRelations } from "@/types/articles";

/**
 * The article itself, shared with the admin preview route.
 *
 * Preview renders exactly this rather than an approximation, so what an editor
 * checks before publishing is what a reader gets afterwards.
 */
export function ArticleView({ article }: { article: ArticleWithRelations }) {
  const hero = resolveImage(
    article.hero_media,
    article.hero_image_url,
    article.hero_image_alt ?? article.title,
  );

  const crumbs: BreadcrumbItem[] = [
    { name: "Home", href: "/" },
    { name: "Articles", href: "/articles" },
    ...(article.category
      ? [{ name: article.category.name, href: `/category/${article.category.slug}` }]
      : []),
    { name: article.title, href: `/articles/${article.slug}` },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(crumbs))} />

      <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={crumbs} />

        <p className="mt-4 text-xs">
          <span className="font-semibold uppercase tracking-wider text-brand-600">
            {article.category ? article.category.name : articleKindLabel(article.kind)}
          </span>
          {article.place ? (
            <>
              <span className="mx-1.5 text-ink-400">|</span>
              <Link
                href={`/place/${article.place.slug}`}
                className="text-ink-500 hover:underline"
              >
                {article.place.name}
              </Link>
            </>
          ) : null}
        </p>

        <h1 className="headline mt-2 text-3xl leading-tight text-navy-900 sm:text-[42px]">
          {article.title}
        </h1>

        {article.dek ? (
          <p className="mt-4 text-lg leading-relaxed text-ink-700">{article.dek}</p>
        ) : null}

        <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
          {article.author_name ? <span>By {article.author_name}</span> : null}
          {article.author_name && article.published_at ? (
            <span aria-hidden="true" className="text-ink-400">
              ·
            </span>
          ) : null}
          {article.published_at ? (
            <span>{formatDate(new Date(article.published_at))}</span>
          ) : null}
        </p>

        {hero ? (
          <figure className="mt-7">
            <div className="relative aspect-[16/9] overflow-hidden rounded-card border border-line">
              <EditorialImage
                src={hero.url}
                alt={hero.alt}
                seed={article.slug}
                priority
                sizes="(max-width: 768px) 100vw, 768px"
              />
            </div>
            {hero.credit ? (
              <figcaption className="mt-2 text-xs text-ink-400">{hero.credit}</figcaption>
            ) : null}
          </figure>
        ) : null}

        <div className="mt-8">
          <ArticleBody markdown={article.body} />
        </div>
      </article>
    </>
  );
}
