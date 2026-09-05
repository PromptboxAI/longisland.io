import Link from "next/link";
import type { ReactNode } from "react";

export interface EmptyRailProps {
  title: string;
  children: ReactNode;
  actions?: { label: string; href: string; primary?: boolean }[];
}

/**
 * Placeholder body for a rail whose data does not exist yet.
 *
 * Rankings are editorial output: until an editor publishes one, the rails that
 * present them have nothing to show. Rather than let those sections vanish —
 * which reads as a broken page and hides the site's structure — the rail keeps
 * its heading and explains the gap.
 *
 * This is deliberately NOT filled with placeholder rankings. A fabricated list
 * about real businesses is worse than an honest empty state.
 *
 * Reuses the bordered sand panel already used by the /best and category empty
 * states, so it introduces no new visual vocabulary.
 */
export function EmptyRail({ title, children, actions = [] }: EmptyRailProps) {
  return (
    <div className="rounded-card border border-line bg-sand-50 p-8 text-center sm:p-10">
      <h3 className="text-base font-bold text-navy-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-700">
        {children}
      </p>

      {actions.length > 0 ? (
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={
                action.primary
                  ? "rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
                  : "rounded-full border border-navy-300 px-6 py-2.5 text-sm font-semibold text-navy-900 transition-colors hover:bg-white"
              }
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
