"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./sidebar-nav";
import { cn } from "@/lib/utils";

// Mobile horizontal tab bar — shown below AppNavbar on small screens (md:hidden).
// Fixed at top-14 (below h-14 AppNavbar), height h-10, z-index below AppNavbar (z-40).
export function MobileDashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed left-0 right-0 top-14 z-40 h-10 border-b border-border bg-card md:hidden">
      <ul className="flex h-full overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex shrink-0 items-stretch">
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-3 text-xs font-medium",
                  "transition-colors duration-150",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
