import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BusinessForm } from "@/components/admin/BusinessForm";
import { StatusPill } from "@/components/admin/StatusPill";
import { getAdminBusiness, listAdminCategories } from "@/lib/data/admin-queries";

export const dynamic = "force-dynamic";

type PageParams = { params: Promise<{ id: string }> };

export default async function BusinessEditorPage({ params }: PageParams) {
  const { id } = await params;

  const [business, categories] = await Promise.all([
    getAdminBusiness(id),
    listAdminCategories(),
  ]);

  if (!business) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/businesses"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All businesses
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-navy-900">{business.name}</h1>
            <StatusPill status={business.status} />
          </div>
          <p className="mt-1 font-mono text-xs text-ink-400">
            /business/{business.slug}
          </p>
        </div>

        <Link
          href={`/business/${business.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-navy-900 hover:border-brand-500"
        >
          Preview
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </Link>
      </div>

      <div className="max-w-3xl">
        <BusinessForm business={business} categories={categories} />
      </div>
    </div>
  );
}
