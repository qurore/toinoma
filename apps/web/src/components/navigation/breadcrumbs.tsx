import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

/**
 * Reusable breadcrumb navigation component.
 *
 * The first item renders a Home icon. The last item is the current page (bold, no link).
 * Middle items are truncated on mobile when there are 4+ items.
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  const lastIndex = items.length - 1;

  return (
    <nav aria-label="パンくずリスト" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
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
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
                  aria-hidden="true"
                />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1 truncate transition-colors hover:text-foreground"
                >
                  {isFirst && (
                    <Home className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  )}
                  <span className={isFirst ? "sr-only sm:not-sr-only" : ""}>
                    {item.label}
                  </span>
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
