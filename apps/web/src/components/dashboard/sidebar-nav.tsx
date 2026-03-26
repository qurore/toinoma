"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { SubscriptionTier } from "@/types/database";

// Primary dashboard nav items — all under /dashboard
export const NAV_ITEMS = [
  { href: "/dashboard", label: "ダッシュボード", exact: true },
  { href: "/dashboard/history", label: "解答履歴", exact: false },
  { href: "/dashboard/favorites", label: "お気に入り", exact: false },
  { href: "/dashboard/collections", label: "コレクション", exact: false },
  { href: "/dashboard/recently-viewed", label: "最近の閲覧", exact: false },
  { href: "/dashboard/analytics", label: "学習分析", exact: false },
] as const;

// Secondary items displayed in a separate section at the bottom of the nav
export const SECONDARY_NAV_ITEMS = [
  { href: "/settings", label: "設定", exact: false },
] as const;

// Subscription tier display config
const TIER_CONFIG: Record<SubscriptionTier, { label: string; className: string }> = {
  free: {
    label: "フリー",
    className: "border-border bg-muted text-muted-foreground",
  },
  basic: {
    label: "ベーシック",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  pro: {
    label: "プロ",
    className: "border-accent/30 bg-accent/10 text-accent",
  },
};

// Grading limits by tier (matching shared constants)
const GRADING_LIMITS: Record<SubscriptionTier, number> = {
  free: 3,
  basic: 30,
  pro: -1, // unlimited
};

interface SidebarNavProps {
  subscriptionTier?: SubscriptionTier;
  gradingsUsed?: number;
}

export function SidebarNav({
  subscriptionTier = "free",
  gradingsUsed = 0,
}: SidebarNavProps) {
  const pathname = usePathname();
  const tierConfig = TIER_CONFIG[subscriptionTier];
  const gradingLimit = GRADING_LIMITS[subscriptionTier];
  const isUnlimited = gradingLimit === -1;
  const usagePercent = isUnlimited
    ? 0
    : Math.min((gradingsUsed / gradingLimit) * 100, 100);

  return (
    <div className="flex flex-1 flex-col">
      {/* Primary navigation links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="ダッシュボード">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex items-center rounded-md px-3 py-2 text-sm font-medium",
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
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Secondary navigation — separated visually */}
        <div className="mt-3 border-t border-border pt-3">
          <ul className="space-y-0.5">
            {SECONDARY_NAV_ITEMS.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative flex items-center rounded-md px-3 py-2 text-sm font-medium",
                      "transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Subscription tier badge + usage meter */}
      <div className="border-t border-border px-3 py-4">
        {/* Tier badge */}
        <div className="mb-3 flex items-center justify-between">
          <Badge className={cn("text-[10px]", tierConfig.className)}>
            {tierConfig.label}
          </Badge>
          {subscriptionTier === "free" && (
            <Link
              href="/settings/subscription"
              className="text-[11px] font-medium text-primary transition-colors hover:text-primary/80"
            >
              アップグレード
            </Link>
          )}
        </div>

        {/* Usage meter */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>AI採点</span>
            <span>
              {isUnlimited
                ? `${gradingsUsed}回（無制限）`
                : `${gradingsUsed} / ${gradingLimit}回`}
            </span>
          </div>
          {!isUnlimited && (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  usagePercent >= 90
                    ? "bg-destructive"
                    : usagePercent >= 70
                      ? "bg-warning"
                      : "bg-primary"
                )}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
