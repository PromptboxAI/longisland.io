import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteSection } from "@/app/admin/editorial/actions";
import { SectionForm } from "@/components/admin/SectionForm";
import {
  AddSectionItem,
  SectionItemEditor,
} from "@/components/admin/SectionItemsEditor";
import { StatusPill } from "@/components/admin/StatusPill";
import {
  getEditorialSection,
  listAdminCategories,
  listAdminPlaces,
  listTargetCandidates,
} from "@/lib/data/admin-queries";

export const dynamic = "force-dynamic";

type PageParams = { params: Promise<{ id: string }> };

export default async function EditorialSectionEditorPage({ params }: PageParams) {
  const { id } = await params;

  const [section, categories, places, candidates] = await Promise.all([
    getEditorialSection(id),
    listAdminCategories(),
    listAdminPlaces(),
    listTargetCandidates(),
  ]);

  if (!section) notFound();

  async function removeSection() {
    "use server";
    await deleteSection(id);
  }

  const liveCount = section.items.filter((i) => i.status === "published").length;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/editorial"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All sections
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-extrabold text-navy-900">
              {section.key}
            </h1>
            <StatusPill status={section.status} />
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {section.items.length} item{section.items.length === 1 ? "" : "s"} ·{" "}
            {liveCount} published · layout {section.layout}
          </p>
        </div>

        <form action={removeSection}>
          <button
            type="submit"
            className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-navy-900 hover:border-red-300 hover:text-red-600"
          >
            Delete section
          </button>
        </form>
      </div>

      {section.status !== "published" ? (
        <p className="rounded-card border border-line bg-sand-50 px-4 py-3 text-sm text-ink-700">
          This section is <strong>{section.status}</strong>. Row-level security
          hides every item from the public site until the section itself is
          published.
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section aria-labelledby="section-settings">
          <h2
            id="section-settings"
            className="mb-4 text-sm font-bold uppercase tracking-wider text-navy-900"
          >
            Settings
          </h2>
          <div className="rounded-card border border-line bg-white p-5">
            <SectionForm section={section} categories={categories} places={places} />
          </div>
        </section>

        <section aria-labelledby="section-items" className="space-y-4">
          <h2
            id="section-items"
            className="text-sm font-bold uppercase tracking-wider text-navy-900"
          >
            Items ({section.items.length})
          </h2>

          <AddSectionItem sectionId={section.id} candidates={candidates} />

          {section.items.length === 0 ? (
            <p className="rounded-card border border-line bg-white p-8 text-center text-sm text-ink-500">
              No items yet. Add one above.
            </p>
          ) : (
            <div className="space-y-4">
              {section.items.map((item, index) => (
                <SectionItemEditor
                  key={item.id}
                  item={item}
                  sectionId={section.id}
                  isFirst={index === 0}
                  isLast={index === section.items.length - 1}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
