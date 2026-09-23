"use client";

import Link from "next/link";

import {
  BulkCheckbox,
  BulkDeleteBar,
  BulkSelectAll,
  useBulkSelect,
} from "@/components/admin/BulkDelete";
import { StatusPill } from "@/components/admin/StatusPill";
import { deleteBusinesses } from "@/app/admin/businesses/actions";

export interface BulkBusinessRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  county: string | null;
  categoryName: string | null;
  featured: boolean;
  claimed: boolean;
  status: string;
}

/**
 * The businesses table, with unpublished rows selectable for deletion.
 *
 * A business is a shared record, so the interesting guard is not its own
 * status — it is whether a ranking points at it. That check has to happen on
 * the server against live data (a list can gain an entry between this page
 * rendering and the click), so the refusal arrives as a message naming the
 * ranking rather than as a checkbox that was never offered.
 */
export function BusinessBulkList({
  businesses,
}: {
  businesses: BulkBusinessRow[];
}) {
  const bulk = useBulkSelect(
    businesses.map((b) => ({
      id: b.id,
      title: b.name,
      deletable: b.status !== "published",
    })),
  );

  return (
    <div className="space-y-3">
      <BulkDeleteBar
        chosen={bulk.chosen}
        noun="business"
        keptNote="Anything still on a ranking will be refused, with the list named — deleting it would leave a gap there."
        error={bulk.error}
        onConfirm={(ids) => deleteBusinesses(ids)}
        onError={bulk.setError}
        onDone={bulk.clear}
      />

      <div className="overflow-x-auto rounded-card border border-line bg-white">
        <table className="w-full min-w-3xl text-sm">
          <thead className="border-b border-line bg-sand-50 text-left">
            <tr>
              <th scope="col" className="w-10 px-5 py-3">
                <BulkSelectAll
                  any={bulk.deletable.length > 0}
                  allChosen={bulk.allChosen}
                  onToggle={bulk.toggleAll}
                />
              </th>
              {["Name", "Town", "Category", "Flags", "Status"].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-400"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {businesses.map((business) => {
              const chosen = bulk.selected.has(business.id);
              return (
                <tr
                  key={business.id}
                  className={chosen ? "bg-amber-50" : "hover:bg-sand-50"}
                >
                  <td className="px-5 py-3">
                    <BulkCheckbox
                      id={business.id}
                      title={business.name}
                      checked={chosen}
                      deletable={business.status !== "published"}
                      onToggle={() => bulk.toggle(business.id)}
                      blockedReason="Published — unpublish before deleting"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/businesses/${business.id}`}
                      className="font-semibold text-navy-900 hover:text-brand-600 hover:underline"
                    >
                      {business.name}
                    </Link>
                    <span className="mt-0.5 block font-mono text-xs text-ink-400">
                      /{business.slug}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-700">
                    {business.city ?? "—"}
                    {business.county ? (
                      <span className="block text-xs text-ink-400">
                        {business.county}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-ink-700">
                    {business.categoryName ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span className="flex flex-wrap gap-1.5">
                      {business.featured ? (
                        <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-800">
                          Featured
                        </span>
                      ) : null}
                      {business.claimed ? (
                        <span className="rounded-full border border-line bg-sand-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-ink-700">
                          Claimed
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill status={business.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
