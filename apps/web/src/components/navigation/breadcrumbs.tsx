import Link from "next/link";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Reusable breadcrumb navigation component.
 *
 * The last item is the current page (bold, no link).
 * Middle items are truncated on mobile when there are 4+ items.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  const lastIndex = items.length - 1;

  return (
    <nav aria-label="パンくずリスト" className={cn("mb-4", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {items.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === lastIndex;

          // On mobile, hide middle items when there are 4+ breadcrumbs
          const isMiddle = !isFirst && !isLast;
          const hideOnMobile = isMiddle && items.length >= 4;

          return (
            <li
              key={`${item.href ?? item.label}-${index}`}
              className={`flex items-center gap-1${hideOnMobile ? " hidden md:flex" : ""}`}
            >
              {index > 0 && (
                <span className="text-muted-foreground/40" aria-hidden="true">/</span>
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="truncate transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="truncate font-medium text-foreground"
                  aria-current="page"
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
