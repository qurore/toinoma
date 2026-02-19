"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  History,
  Heart,
  FolderOpen,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "ダッシュボード",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/dashboard/history",
    label: "解答履歴",
    icon: History,
    exact: false,
  },
  {
    href: "/dashboard/favorites",
    label: "お気に入り",
    icon: Heart,
    exact: false,
  },
  {
    href: "/dashboard/collections",
    label: "コレクション",
    icon: FolderOpen,
    exact: false,
  },
  {
    href: "/settings",
    label: "設定",
    icon: Settings,
    exact: false,
  },
] as const;

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-0.5">
        {NAV_ITEMS.map((item) => {
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
