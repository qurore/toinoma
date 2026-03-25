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

// Navigation item type
interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
}

interface NavSection {
  label: string | null;
  items: NavItem[];
}

// Navigation items grouped by section
const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [
      {
        href: "/seller",
        label: "ダッシュボード",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    label: "コンテンツ",
    items: [
      {
        href: "/seller/pool",
        label: "問題プール",
        icon: Database,
        exact: false,
      },
      {
        href: "/seller/sets",
        label: "問題セット",
        icon: Library,
        exact: false,
      },
    ],
  },
  {
    label: "収益・販売",
    items: [
      {
        href: "/seller/analytics",
        label: "分析",
        icon: BarChart3,
        exact: false,
      },
      {
        href: "/seller/transactions",
        label: "取引履歴",
        icon: Receipt,
        exact: false,
      },
      {
        href: "/seller/coupons",
        label: "クーポン",
        icon: Tag,
        exact: false,
      },
      {
        href: "/seller/payouts",
        label: "振込・収益",
        icon: Wallet,
        exact: false,
      },
    ],
  },
  {
    label: null,
    items: [
      {
        href: "/seller/settings",
        label: "設定",
        icon: Settings,
        exact: false,
      },
    ],
  },
];

// Flat list for mobile nav and external use
export const SELLER_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

// Desktop vertical sidebar — mirrors DashboardSidebar / SidebarNav pattern.
export function SellerSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {NAV_SECTIONS.map((section, sectionIndex) => (
        <div key={sectionIndex} className={cn(sectionIndex > 0 && "mt-4")}>
          {section.label && (
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {section.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                      "transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                    )}
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// Wrapper that positions the sidebar fixed on desktop
export function SellerSidebar() {
  return (
    <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-60 flex-col border-r border-border bg-card md:flex">
      <SellerSidebarNav />
    </aside>
  );
}

// Mobile horizontal tab bar — shown below AppNavbar on small screens (md:hidden).
// Text-only tabs for clean, minimal mobile nav (no icons — matches note.com/studysapuri pattern).
export function MobileSellerNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed left-0 right-0 top-16 z-40 h-10 border-b border-border bg-card md:hidden"
      aria-label="出品者ナビゲーション"
    >
      <ul className="flex h-full overflow-x-auto scrollbar-thin">
        {SELLER_NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <li key={item.href} className="flex shrink-0 items-stretch">
              <Link
                href={item.href}
                className={cn(
                  "flex items-center border-b-2 px-3 text-xs font-medium whitespace-nowrap",
                  "transition-colors duration-150",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
