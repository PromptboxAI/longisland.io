import Link from "next/link";

import { setLeadStatus } from "@/app/admin/nominations/actions";
import { StatusPill } from "@/components/admin/StatusPill";
import { listLeads } from "@/lib/data/admin-queries";

export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
];

const NEXT_STATUSES = [
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archive" },
] as const;

type PageProps = { searchParams: Promise<{ status?: string }> };

export default async function AdminLeadsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const leads = await listLeads(params.status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy-900">Leads</h1>
        <p className="mt-1 text-sm text-ink-500">
          Inbound advertiser and partnership enquiries.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => {
          const active = (params.status ?? "") === filter.value;
          const href = filter.value
            ? `/admin/leads?status=${filter.value}`
            : "/admin/leads";

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

      {leads.length === 0 ? (
        <div className="rounded-card border border-line bg-white p-12 text-center">
          <h2 className="text-lg font-bold text-navy-900">No leads yet</h2>
          <p className="mt-2 text-sm text-ink-500">
            Submissions from the advertise page appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {leads.map((lead) => (
            <li key={lead.id} className="rounded-card border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-navy-900">
                    {lead.business_name ?? "Unnamed business"}
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {[lead.name, lead.category].filter(Boolean).join(" · ") ||
                      "No contact name"}
                  </p>
                </div>
                <StatusPill status={lead.status} />
              </div>

              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-500">
                {lead.email ? (
                  <div>
                    <dt className="inline font-semibold">Email: </dt>
                    <dd className="inline">
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-brand-600 hover:underline"
                      >
                        {lead.email}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {lead.phone ? (
                  <div>
                    <dt className="inline font-semibold">Phone: </dt>
                    <dd className="inline">{lead.phone}</dd>
                  </div>
                ) : null}
                {lead.interest ? (
                  <div>
                    <dt className="inline font-semibold">Interest: </dt>
                    <dd className="inline">{lead.interest}</dd>
                  </div>
                ) : null}
                {lead.budget ? (
                  <div>
                    <dt className="inline font-semibold">Budget: </dt>
                    <dd className="inline">{lead.budget}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="inline font-semibold">Received: </dt>
                  <dd className="inline">
                    {new Date(lead.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </dd>
                </div>
              </dl>

              {lead.message ? (
                <blockquote className="mt-3 border-l-2 border-line pl-3 text-sm leading-relaxed text-ink-700">
                  {lead.message}
                </blockquote>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {NEXT_STATUSES.map((option) => (
                  <form
                    key={option.value}
                    action={async () => {
                      "use server";
                      await setLeadStatus(lead.id, option.value);
                    }}
                  >
                    <button
                      type="submit"
                      disabled={lead.status === option.value}
                      className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-navy-900 hover:border-brand-500 hover:bg-sand-50 disabled:opacity-40"
                    >
                      {option.label}
                    </button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
