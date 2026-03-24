"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact: boolean;
}

interface AdminDesktopNavProps {
  navItems: AdminNavItem[];
}

export function AdminDesktopNav({ navItems }: AdminDesktopNavProps) {
  const pathname = usePathname();

  return (
    <nav className="sticky top-16 px-3 py-4" aria-label="管理者ナビゲーション">
      <h2 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        管理者メニュー
      </h2>
      <ul className="space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
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
