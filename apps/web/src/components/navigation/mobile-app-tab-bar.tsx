"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, BookOpen, Store, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** When true, pathname must equal href exactly. Otherwise startsWith is used. */
  exact?: boolean;
}

const TABS: TabItem[] = [
  { href: "/", label: "ホーム", icon: Home, exact: true },
  { href: "/explore", label: "探す", icon: Search },
  { href: "/dashboard", label: "学習", icon: BookOpen },
  { href: "/sell", label: "出品", icon: Store },
  { href: "/settings", label: "マイページ", icon: User },
];

/**
 * App-level mobile bottom tab bar.
 * Visible only on mobile (md:hidden). Fixed at the bottom of the viewport.
 * 44px min-height touch targets per WCAG 2.1 AA.
 */
export function MobileAppTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 backdrop-blur-sm md:hidden"
      aria-label="モバイルナビゲーション"
    >
      <ul className="mx-auto flex h-14 max-w-lg items-stretch justify-around">
        {TABS.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <li key={tab.href} className="flex flex-1 items-stretch">
              <Link
                href={tab.href}
                className={cn(
                  "flex min-h-[44px] w-full flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1 text-[10px] font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
