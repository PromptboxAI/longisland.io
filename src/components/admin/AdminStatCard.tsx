import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export interface AdminStatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  href?: string;
  /** Draws attention when a queue has items waiting. */
  highlight?: boolean;
}

export function AdminStatCard({
  label,
  value,
  icon: Icon,
  href,
  highlight = false,
}: AdminStatCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
          {label}
        </span>
        <Icon
          aria-hidden="true"
          className={`size-4 shrink-0 ${highlight ? "text-brand-600" : "text-ink-400"}`}
        />
      </div>
      <p
        className={`mt-2 text-2xl font-extrabold tabular-nums ${
          highlight ? "text-brand-600" : "text-navy-900"
        }`}
      >
        {value}
      </p>
    </>
  );

  const className = `block rounded-card border bg-white p-4 transition-colors ${
    highlight ? "border-brand-300" : "border-line"
  } ${href ? "hover:border-brand-500" : ""}`;

  if (!href) return <div className={className}>{content}</div>;

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
