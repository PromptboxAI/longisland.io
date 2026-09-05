import { ArrowRight } from "lucide-react";
import Link from "next/link";

export interface AdvertiseCTAProps {
  variant?: "band" | "inline";
}

export function AdvertiseCTA({ variant = "band" }: AdvertiseCTAProps) {
  if (variant === "inline") {
    return (
      <aside className="rounded-card border border-navy-100 p-6">
        <h2 className="text-lg font-semibold text-navy-900">Own a business here?</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">
          Featured profiles, local guides and sponsorships put you in front of
          Long Islanders while they are deciding where to go.
        </p>
        <Link
          href="/advertise"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-800"
        >
          Get featured
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </aside>
    );
  }

  return (
    <section className="border-y border-navy-100 bg-sand-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl text-navy-900 sm:text-4xl">
            Reach Long Island.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-700">
            Partner with LongIsland.io through featured content, local guides,
            sponsorships and social video — and reach readers at the moment they
            are choosing where to eat, shop and hire.
          </p>
        </div>
        <Link
          href="/advertise"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-navy-900 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 lg:self-auto"
        >
          Advertise With Us
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </section>
  );
}
