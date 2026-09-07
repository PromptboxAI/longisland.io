import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deletePlace } from "@/app/admin/places/actions";
import { StatusPill } from "@/components/admin/StatusPill";
import { DeleteRowButton } from "@/components/admin/DeleteRowButton";
import { TaxonomyForm } from "@/components/admin/TaxonomyForm";
import { listAdminPlaces, listMediaAssets } from "@/lib/data/admin-queries";

export const dynamic = "force-dynamic";

type PageParams = { params: Promise<{ id: string }> };

export default async function PlaceEditorPage({ params }: PageParams) {
  const { id } = await params;

  const [places, library] = await Promise.all([
    listAdminPlaces(),
    listMediaAssets(),
  ]);

  const place = places.find((c) => c.id === id);
  if (!place) notFound();

  async function remove() {
    "use server";
    await deletePlace(id);
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/places"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All places
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold text-navy-900">{place.name}</h1>
          <StatusPill status={place.status} />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/place/${place.slug}`}
            className="rounded-full border border-navy-300 px-4 py-2 text-sm font-semibold text-navy-900 hover:border-navy-500 hover:bg-navy-50"
          >
            View page
          </Link>
          {/* Asks first: deleting is not undone by typing again. */}
          <DeleteRowButton
            name={place.name}
            consequence="Rankings and businesses in it lose their place."
            onDelete={remove}
          />
        </div>
      </div>

      <div className="rounded-card border border-line bg-white p-5">
        <TaxonomyForm
          kind="place"
          record={place}
          parents={places
            .filter((c) => c.id !== place.id)
            .map((c) => ({ id: c.id, name: c.name }))}
          library={library}
          heroMedia={library.find((a) => a.id === place.hero_media_id) ?? null}
        />
      </div>
    </div>
  );
}
