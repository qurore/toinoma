"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Database,
  Tag,
  Receipt,
  BarChart3,
  Wallet,
  Settings,
  Library,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const SELLER_NAV_ITEMS = [
  {
    href: "/sell",
    label: "ダッシュボード",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/sell/pool",
    label: "問題プール",
    icon: Database,
    exact: false,
  },
  {
    href: "/sell/sets",
    label: "問題セット",
    icon: Library,
    exact: false,
  },
  {
    href: "/sell/analytics",
    label: "分析",
    icon: BarChart3,
    exact: false,
  },
  {
    href: "/sell/transactions",
    label: "取引",
    icon: Receipt,
    exact: false,
  },
  {
    href: "/sell/coupons",
    label: "クーポン",
    icon: Tag,
    exact: false,
  },
  {
    href: "/sell/payouts",
    label: "収益",
    icon: Wallet,
    exact: false,
  },
  {
    href: "/sell/settings",
    label: "設定",
    icon: Settings,
    exact: false,
  },
] as const;

// Desktop vertical sidebar — mirrors DashboardSidebar / SidebarNav pattern.
export function SellerSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-0.5">
        {SELLER_NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  "transition-colors duration-150",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Wrapper that positions the sidebar fixed on desktop
export function SellerSidebar() {
  return (
    <aside className="fixed bottom-0 left-0 top-14 z-40 hidden w-60 flex-col border-r border-border bg-card md:flex">
      <SellerSidebarNav />
    </aside>
  );
}

// Mobile horizontal tab bar — shown below AppNavbar on small screens (md:hidden).
export function MobileSellerNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed left-0 right-0 top-14 z-40 h-10 border-b border-border bg-card md:hidden">
      <ul className="flex h-full overflow-x-auto">
        {SELLER_NAV_ITEMS.map((item) => {
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
