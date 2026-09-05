import type { Metadata } from "next";

import { CategoryCard } from "@/components/cards/CategoryCard";
import { NominationCTA } from "@/components/cta/NominationCTA";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { RuleHeading } from "@/components/ui/RuleHeading";
import { listCategories } from "@/lib/data/queries";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "All Categories",
  description:
    "Every category LongIsland.io covers — food and drink, things to do, home services, family, health and beauty, and shopping.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = await listCategories();
  const topLevel = categories.filter((c) => !c.parent_id);

  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Categories", href: "/categories" },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(crumbs))} />

      <div className="border-b border-line bg-sand-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-3 text-3xl font-extrabold uppercase tracking-tight text-navy-900 sm:text-4xl">
            All Categories
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-700">
            Everything we cover on Long Island, grouped the way people actually
            look for it.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        {topLevel.map((parent) => {
          const children = categories.filter((c) => c.parent_id === parent.id);

          return (
            <section key={parent.id} aria-labelledby={`all-${parent.slug}`}>
              <RuleHeading
                id={`all-${parent.slug}`}
                title={parent.name}
                description={parent.description ?? undefined}
                href={`/category/${parent.slug}`}
                linkLabel={`Browse ${parent.name}`}
                uppercase
              />
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {children.map((child) => (
                  <CategoryCard key={child.id} category={child} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <NominationCTA />
    </>
  );
}
