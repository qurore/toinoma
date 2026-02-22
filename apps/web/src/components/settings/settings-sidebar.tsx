"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  CreditCard,
  ShoppingBag,
  History,
  Heart,
  Store,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  variant?: "default" | "destructive";
  external?: boolean;
}

const BASE_NAV_ITEMS: NavItem[] = [
  { href: "/settings/profile", label: "プロフィール", icon: User, exact: false },
  { href: "/settings/subscription", label: "サブスクリプション", icon: CreditCard, exact: false },
  { href: "/dashboard", label: "購入済み問題", icon: ShoppingBag, exact: true, external: true },
  { href: "/dashboard/history", label: "解答履歴", icon: History, exact: false, external: true },
  { href: "/dashboard/favorites", label: "お気に入り", icon: Heart, exact: false, external: true },
];

const SELLER_NAV_ITEM: NavItem = {
  href: "/settings/seller",
  label: "出品者情報",
  icon: Store,
  exact: false,
};

const DELETE_NAV_ITEM: NavItem = {
  href: "/settings/delete-account",
  label: "退会",
  icon: Trash2,
  exact: false,
  variant: "destructive",
};

interface SettingsSidebarProps {
  isSeller: boolean;
  /** When true, renders as a horizontal scrollable tab bar for mobile viewports. */
  horizontal?: boolean;
}

export function SettingsSidebar({ isSeller, horizontal = false }: SettingsSidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    ...BASE_NAV_ITEMS,
    ...(isSeller ? [SELLER_NAV_ITEM] : []),
    DELETE_NAV_ITEM,
  ];

  if (horizontal) {
    return (
      <nav aria-label="設定ナビゲーション" className="overflow-x-auto">
        <ul className="flex gap-1 pb-1">
          {navItems.map((item) => {
            const isActive = !item.external && (
              item.exact ? pathname === item.href : pathname.startsWith(item.href)
            );
            const isDestructive = item.variant === "destructive";

            return (
              <li key={`${item.href}-${item.label}`} className="shrink-0">
                <Link
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-foreground"
                      : isDestructive
                        ? "text-destructive hover:bg-destructive/10"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
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

  return (
    <nav aria-label="設定ナビゲーション">
      <ul className="space-y-0.5">
        {navItems.map((item) => {
          const isActive = !item.external && (
            item.exact ? pathname === item.href : pathname.startsWith(item.href)
          );
          const Icon = item.icon;
          const isDestructive = item.variant === "destructive";

          return (
            <li key={`${item.href}-${item.label}`}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-foreground"
                    : isDestructive
                      ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
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
