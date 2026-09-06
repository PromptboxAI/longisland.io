import Link from "next/link";

import { SectionForm } from "@/components/admin/SectionForm";
import { StatusPill } from "@/components/admin/StatusPill";
import {
  listAdminCategories,
  listAdminPlaces,
  listEditorialSections,
} from "@/lib/data/admin-queries";

export const dynamic = "force-dynamic";

export default async function EditorialSectionsPage() {
  const [sections, categories, places] = await Promise.all([
    listEditorialSections(),
    listAdminCategories(),
    listAdminPlaces(),
  ]);

  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const placeName = new Map(places.map((p) => [p.id, p.name]));

  function scopeLabel(section: (typeof sections)[number]): string {
    if (section.scope_type === "category" && section.category_id) {
      return `Category · ${categoryName.get(section.category_id) ?? "unknown"}`;
    }
    if (section.scope_type === "place" && section.place_id) {
      return `Place · ${placeName.get(section.place_id) ?? "unknown"}`;
    }
    return "Global";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-navy-900">Editorial sections</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-500">
          Curated placements. A section is a named slot the site asks for by key;
          its items are what an editor put there, in order. Nothing here derives
          from a feed — if a slot is empty, it is empty on purpose.
        </p>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-card border border-line bg-white p-10 text-center">
          <h2 className="text-lg font-bold text-navy-900">No sections yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
            Create one below. Until a section exists and is published, the site
            falls back to whatever its components do without curated data.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full min-w-3xl text-sm">
            <thead className="border-b border-line bg-sand-50 text-left">
              <tr>
                {["Key", "Scope", "Layout", "Items", "Status"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sections.map((section) => (
                <tr key={section.id} className="hover:bg-sand-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/editorial/${section.id}`}
                      className="font-mono font-semibold text-navy-900 hover:text-brand-600 hover:underline"
                    >
                      {section.key}
                    </Link>
                    {section.title ? (
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {section.title}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-ink-700">{scopeLabel(section)}</td>
                  <td className="px-5 py-3 text-ink-700">{section.layout}</td>
                  <td className="px-5 py-3 tabular-nums text-ink-700">
                    {section.item_count}
                    {section.max_items ? (
                      <span className="text-ink-400"> / {section.max_items}</span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill status={section.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section aria-labelledby="new-section">
        <h2
          id="new-section"
          className="mb-4 text-sm font-bold uppercase tracking-wider text-navy-900"
        >
          New section
        </h2>
        <div className="max-w-3xl rounded-card border border-line bg-white p-5">
          <SectionForm categories={categories} places={places} />
        </div>
      </section>
    </div>
  );
}
