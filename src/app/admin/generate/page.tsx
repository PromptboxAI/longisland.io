import { GenerateWorkbench } from "@/components/admin/GenerateWorkbench";
import { listAdminCategories, listAdminPlaces } from "@/lib/data/admin-queries";
import { isYelpConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function GenerateListPage() {
  const [categories, places] = await Promise.all([
    listAdminCategories(),
    listAdminPlaces(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy-900">Generate a list</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-500">
          Research candidates for a topic and area, pick the ones that belong, and
          turn them into a draft ranking. Selection order becomes the ranking
          order — you can reorder and write the reasoning in the editor.
        </p>
      </div>

      <GenerateWorkbench
        categories={categories}
        places={places}
        yelpConfigured={isYelpConfigured}
      />
    </div>
  );
}
