import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";

import { openPlacement } from "@/app/admin/editorial/actions";
import { ScopedPlacementPicker } from "@/components/admin/ScopedPlacementPicker";
import { StatusPill } from "@/components/admin/StatusPill";
import { listAdminCategories, listEditorialSections } from "@/lib/data/admin-queries";
import {
  emptyStateClause,
  placementsByLocation,
  type Placement,
} from "@/lib/editorial/placements";
import { resolveImageUrl } from "@/lib/media/resolve";

export const dynamic = "force-dynamic";

/**
 * Editorial, as a placement manager rather than a schema builder.
 *
 * The slots are fixed — the homepage asks for `homepage_primary` by name in its
 * own code — so an editor's job is choosing what goes in them, not inventing
 * them. This screen therefore lists the slots the site actually has, shows what
 * is currently in each one, and opens it. The row is created on first open.
 *
 * Custom sections remain possible for anything genuinely ad hoc, but they are
 * not the front door any more, because for eight of the nine slots creating one
 * by hand was a way to get the key wrong.
 */
export default async function EditorialPage() {
  const [sections, categories] = await Promise.all([
    listEditorialSections(),
    listAdminCategories(),
  ]);

  // Global placements match on key alone; scoped ones can have many rows, one
  // per category or place, so they are counted rather than shown singly.
  const byKey = new Map<string, typeof sections>();
  for (const section of sections) {
    const list = byKey.get(section.key) ?? [];
    list.push(section);
    byKey.set(section.key, list);
  }

  const known = new Set(placementsByLocation().flatMap((g) => g.placements.map((p) => p.key)));
  const custom = sections.filter((section) => !known.has(section.key));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-navy-900">Editorial</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-500">
          What appears where. Choose a placement, pick the ranking, article,
          guide or product that belongs in it, and publish. Everything a
          placement shows — image, headline, dek — comes from whatever you
          select, unless you override it.
        </p>
      </div>

      {/*
        The one thing an editor could not check before publishing. A ranking has
        its own preview URL; "what does the front page look like with this in
        the feature slot" did not, short of publishing and looking.
      */}
      <Link
        href="/preview/homepage"
        target="_blank"
        className="inline-flex items-center gap-2 rounded-full border border-navy-300 px-4 py-2 text-sm font-semibold text-navy-900 transition-colors hover:border-navy-500 hover:bg-navy-50"
      >
        Preview the homepage with drafts
        <ExternalLink aria-hidden="true" className="size-3.5" />
      </Link>

      {placementsByLocation().map((group) => (
        <section key={group.location}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
            {group.location}
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.placements.map((placement) => (
              <PlacementCard
                key={placement.key}
                placement={placement}
                rows={byKey.get(placement.key) ?? []}
                categories={categories}
              />
            ))}
          </div>
        </section>
      ))}

      {custom.length > 0 ? (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
            Custom sections
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Sections whose key is not one the site asks for. These render only
            if something has been written to read them.
          </p>
          <ul className="mt-4 divide-y divide-line rounded-card border border-line bg-white">
            {custom.map((section) => (
              <li key={section.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/editorial/${section.id}`}
                    className="font-semibold text-navy-900 hover:text-brand-600 hover:underline"
                  >
                    {section.title ?? section.key}
                  </Link>
                  <p className="font-mono text-xs text-ink-400">{section.key}</p>
                </div>
                <StatusPill status={section.status} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function PlacementCard({
  placement,
  rows,
  categories,
}: {
  placement: Placement;
  rows: Awaited<ReturnType<typeof listEditorialSections>>;
  categories: { id: string; name: string }[];
}) {
  const section = placement.scope === "global" ? rows[0] : null;

  const lead = section?.items?.[0] ?? null;
  const leadImage = lead
    ? (resolveImageUrl(lead.image_media, lead.image_url) ??
      resolveImageUrl(lead.inheritedMedia, lead.inheritedImageUrl))
    : null;

  async function open() {
    "use server";
    await openPlacement(placement.key);
  }

  return (
    <div className="flex flex-col rounded-card border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-navy-900">{placement.name}</h3>
          <p className="text-xs text-ink-400">{placement.location}</p>
        </div>
        {section ? <StatusPill status={section.status} /> : null}
      </div>

      <p className="mt-2 text-xs leading-relaxed text-ink-500">{placement.purpose}</p>

      {/* What is actually in the slot right now. */}
      <div className="mt-3 flex-1">
        {placement.scope !== "global" ? (
          /*
            A category placement exists once per category, so "Set up" needs to
            know which one. It used to pass none, the database rejected the row,
            and the editor was redirected back with nothing created and nothing
            said — which meant these could not be configured from admin at all.
          */
          <ScopedPlacementPicker
            placementKey={placement.key}
            placementName={placement.name}
            categories={categories}
            configured={rows
              .filter((row) => row.category_id)
              .map((row) => ({
                sectionId: row.id,
                categoryId: row.category_id as string,
                categoryName:
                  categories.find((category) => category.id === row.category_id)
                    ?.name ?? "Unknown category",
              }))}
          />
        ) : !section ? (
          <p className="text-xs text-ink-700">
            {/*
              This promised an automatic fallback for every placement, which is
              the opposite of the mistake the detail screen made and just as
              misleading: the Primary Feature, Top Rail and Trending show
              nothing at all when empty. An editor reading this would leave the
              lead story blank believing the site would fill it.
            */}
            Nothing here yet — {emptyStateClause(placement, placement.location.toLowerCase())}
          </p>
        ) : section.itemCount === 0 ? (
          <p className="text-xs text-ink-700">Configured, but empty.</p>
        ) : (
          <div className="flex items-center gap-2.5">
            {leadImage ? (
              <span className="relative size-11 shrink-0 overflow-hidden rounded border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={leadImage} alt="" className="size-full object-cover" />
              </span>
            ) : null}
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-navy-900">
                {lead?.displayHeadline ?? "Untitled"}
              </span>
              <span className="block text-xs text-ink-400">
                {section.itemCount} item{section.itemCount === 1 ? "" : "s"}
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        {section ? (
          <Link
            href={`/admin/editorial/${section.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
          >
            Manage
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        ) : (
          <form action={open}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full border border-navy-300 px-4 py-1.5 text-xs font-semibold text-navy-900 hover:border-navy-500 hover:bg-navy-50"
            >
              Set up
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </button>
          </form>
        )}

        {placement.previewPath ? (
          <Link
            href={placement.previewPath}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
          >
            View page
            <ExternalLink aria-hidden="true" className="size-3" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
