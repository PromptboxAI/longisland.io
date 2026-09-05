import { ChevronRight } from "lucide-react";
import Link from "next/link";

import type { BreadcrumbItem } from "@/lib/seo/json-ld";

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

/** The last item is the current page and is not a link. */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-ink-500">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.href} className="flex items-center gap-1">
              {isLast ? (
                <span aria-current="page" className="text-ink-500">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link href={item.href} className="text-brand-600 hover:underline">
                    {item.name}
                  </Link>
                  <ChevronRight aria-hidden="true" className="size-3 text-ink-400" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
