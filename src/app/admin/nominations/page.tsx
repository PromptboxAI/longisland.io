import Link from "next/link";

import {
  convertNominationToBusiness,
  setNominationStatus,
} from "@/app/admin/nominations/actions";
import { StatusPill } from "@/components/admin/StatusPill";
import { listNominations } from "@/lib/data/admin-queries";

export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "", label: "All" },
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

type PageProps = { searchParams: Promise<{ status?: string }> };

export default async function AdminNominationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const nominations = await listNominations(params.status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy-900">Nominations</h1>
        <p className="mt-1 text-sm text-ink-500">
          Reader submissions. Approving one creates a draft business to research —
          it does not publish anything.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => {
          const active = (params.status ?? "") === filter.value;
          const href = filter.value
            ? `/admin/nominations?status=${filter.value}`
            : "/admin/nominations";

          return (
            <Link
              key={filter.label}
              href={href}
              aria-current={active ? "true" : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "border-navy-900 bg-navy-900 text-white"
                  : "border-line bg-white text-navy-900 hover:border-brand-500"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {nominations.length === 0 ? (
        <div className="rounded-card border border-line bg-white p-12 text-center">
          <h2 className="text-lg font-bold text-navy-900">Nothing here</h2>
          <p className="mt-2 text-sm text-ink-500">
            Nominations submitted from the public site land in this queue.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {nominations.map((nomination) => (
            <li
              key={nomination.id}
              className="rounded-card border border-line bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-navy-900">
                    {nomination.business_name}
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {[nomination.town, nomination.category]
                      .filter(Boolean)
                      .join(" · ") || "No location or category given"}
                  </p>
                </div>
                <StatusPill status={nomination.status} />
              </div>

              {nomination.reason ? (
                <blockquote className="mt-3 border-l-2 border-line pl-3 text-sm leading-relaxed text-ink-700">
                  {nomination.reason}
                </blockquote>
              ) : null}

              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-500">
                {nomination.submitter_name ? (
                  <div>
                    <dt className="inline font-semibold">From: </dt>
                    <dd className="inline">{nomination.submitter_name}</dd>
                  </div>
                ) : null}
                {nomination.email ? (
                  <div>
                    <dt className="inline font-semibold">Email: </dt>
                    <dd className="inline">
                      <a
                        href={`mailto:${nomination.email}`}
                        className="text-brand-600 hover:underline"
                      >
                        {nomination.email}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {nomination.website ? (
                  <div>
                    <dt className="inline font-semibold">Website: </dt>
                    <dd className="inline">
                      <a
                        href={nomination.website}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="break-all text-brand-600 hover:underline"
                      >
                        {nomination.website}
                      </a>
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="inline font-semibold">Received: </dt>
                  <dd className="inline">
                    {new Date(nomination.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                <StatusButton
                  id={nomination.id}
                  status="reviewing"
                  label="Mark reviewing"
                />
                <StatusButton id={nomination.id} status="rejected" label="Reject" />

                <form
                  action={async () => {
                    "use server";
                    await convertNominationToBusiness(nomination.id);
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-full bg-navy-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
                  >
                    Approve and create business
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusButton({
  id,
  status,
  label,
}: {
  id: string;
  status: "new" | "reviewing" | "approved" | "rejected";
  label: string;
}) {
  return (
    <form
      action={async () => {
        "use server";
        await setNominationStatus(id, status);
      }}
    >
      <button
        type="submit"
        className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-navy-900 hover:border-brand-500 hover:bg-sand-50"
      >
        {label}
      </button>
    </form>
  );
}
