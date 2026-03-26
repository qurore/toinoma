"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

// ──────────────────────────────────────────────
// Navigation item type
// ──────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
  variant?: "default" | "destructive";
}

// ──────────────────────────────────────────────
// Settings navigation items
// ──────────────────────────────────────────────

const BASE_NAV_ITEMS: NavItem[] = [
  { href: "/settings/profile", label: "プロフィール", exact: false },
  { href: "/settings/notifications", label: "通知設定", exact: false },
  { href: "/settings/subscription", label: "サブスクリプション", exact: false },
  { href: "/settings/billing", label: "請求情報", exact: false },
  { href: "/settings/sessions", label: "セッション", exact: false },
];

const SELLER_NAV_ITEM: NavItem = {
  href: "/settings/seller",
  label: "出品者設定",
  exact: false,
};

const DELETE_NAV_ITEM: NavItem = {
  href: "/settings/delete-account",
  label: "アカウント削除",
  exact: false,
  variant: "destructive",
};

// ──────────────────────────────────────────────
// Sidebar component
// ──────────────────────────────────────────────

interface SettingsSidebarProps {
  isSeller: boolean;
  /** When true, renders as a horizontal scrollable tab bar for mobile viewports. */
  horizontal?: boolean;
}

export function SettingsSidebar({
  isSeller,
  horizontal = false,
}: SettingsSidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    ...BASE_NAV_ITEMS,
    ...(isSeller ? [SELLER_NAV_ITEM] : []),
    DELETE_NAV_ITEM,
  ];

  // Horizontal tab bar for mobile
  if (horizontal) {
    return (
      <nav
        aria-label="設定ナビゲーション"
        className="overflow-x-auto scrollbar-thin"
      >
        <ul className="flex gap-1 pb-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const isDestructive = item.variant === "destructive";

            return (
              <li key={`${item.href}-${item.label}`} className="flex shrink-0 items-stretch">
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center border-b-2 px-3 text-xs font-medium whitespace-nowrap",
                    "transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "border-primary text-primary"
                      : isDestructive
                        ? "border-transparent text-destructive hover:text-destructive"
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

  // Desktop sidebar
  return (
    <nav aria-label="設定ナビゲーション">
      <ul className="space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const isDestructive = item.variant === "destructive";

          return (
            <li key={`${item.href}-${item.label}`}>
              {isDestructive && <Separator className="my-2" />}
              <Link
                href={item.href}
                className={cn(
                  "relative flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : isDestructive
                      ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                )}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
