import Link from "next/link";
import { Plus } from "lucide-react";

import { createBlankPlace } from "@/app/admin/places/actions";
import { StatusPill } from "@/components/admin/StatusPill";
import { listAdminPlaces } from "@/lib/data/admin-queries";

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  const places = await listAdminPlaces();
  const byId = new Map(places.map((c) => [c.id, c]));

  // Parents first, each followed by its children, so the tree is readable
  // without a recursive component.
  const roots = places.filter((c) => !c.parent_id);
  const ordered = roots.flatMap((root) => [
    root,
    ...places.filter((c) => c.parent_id === root.id),
  ]);
  const orphans = places.filter(
    (c) => c.parent_id && !byId.has(c.parent_id),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">Places</h1>
          <p className="mt-1 text-sm text-ink-500">
            {places.length} total · {roots.length} top level. Geography is half of every
            ranking title.
          </p>
        </div>
        <form action={createBlankPlace}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <Plus aria-hidden="true" className="size-4" />
            New place
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-card border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-sand-50 text-left">
            <tr>
              <th className="px-5 py-3 font-semibold text-navy-900">Name</th>
              <th className="px-5 py-3 font-semibold text-navy-900">Slug</th>
              <th className="px-5 py-3 font-semibold text-navy-900">Type</th>
              <th className="px-5 py-3 font-semibold text-navy-900">Featured</th>
              <th className="px-5 py-3 font-semibold text-navy-900">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {[...ordered, ...orphans].map((place) => (
              <tr key={place.id} className="hover:bg-sand-50">
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/places/${place.id}`}
                    className={`font-semibold text-navy-900 hover:text-brand-600 hover:underline ${
                      place.parent_id ? "pl-5 font-normal" : ""
                    }`}
                  >
                    {place.name}
                  </Link>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-ink-500">
                  {place.slug}
                </td>
                <td className="px-5 py-3 text-ink-700">{place.type}</td>
                <td className="px-5 py-3 text-ink-700">
                  {place.featured ? `Yes · ${place.sort_order}` : "—"}
                </td>
                <td className="px-5 py-3">
                  <StatusPill status={place.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
