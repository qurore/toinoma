"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  FileCheck,
  Star,
  FolderPlus,
  Loader2,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type ActivityType = "purchase" | "submission" | "review" | "collection_add";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  href: string;
  timestamp: string;
  /** Optional metadata like score percentage */
  meta?: string | null;
}

interface ActivityFeedProps {
  /** Initial set of activities (max 20, pre-fetched server-side) */
  initialActivities: ActivityItem[];
  /** Total activity count to know if "load more" should show */
  totalCount: number;
  /** Async callback to fetch the next page of activities */
  onLoadMore?: (offset: number) => Promise<ActivityItem[]>;
}

// ──────────────────────────────────────────────
// Activity type configuration
// ──────────────────────────────────────────────

const ACTIVITY_CONFIG: Record<
  ActivityType,
  {
    icon: typeof ShoppingCart;
    color: string;
    bgColor: string;
  }
> = {
  purchase: {
    icon: ShoppingCart,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  submission: {
    icon: FileCheck,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  review: {
    icon: Star,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  collection_add: {
    icon: FolderPlus,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
  },
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function ActivityFeed({
  initialActivities,
  totalCount,
  onLoadMore,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState(initialActivities);
  const [loading, setLoading] = useState(false);
  const hasMore = activities.length < totalCount;

  const handleLoadMore = useCallback(async () => {
    if (!onLoadMore || loading || !hasMore) return;
    setLoading(true);
    try {
      const nextPage = await onLoadMore(activities.length);
      setActivities((prev) => [...prev, ...nextPage]);
    } catch {
      // Silently fail — user can retry
    } finally {
      setLoading(false);
    }
  }, [onLoadMore, loading, hasMore, activities.length]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">アクティビティ</CardTitle>
          {totalCount > 0 && (
            <span className="text-sm text-muted-foreground">
              ({totalCount})
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Activity className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">
              まだアクティビティがありません
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              問題を購入したり解答すると、ここに表示されます
            </p>
          </div>
        ) : (
          <>
            <div className="relative space-y-0">
              {activities.map((activity, idx) => {
                const config = ACTIVITY_CONFIG[activity.type];
                const Icon = config.icon;
                const isLast = idx === activities.length - 1;

                return (
                  <div key={activity.id} className="relative flex gap-3 pb-4">
                    {/* Timeline line */}
                    {!isLast && (
                      <div className="absolute left-[17px] top-9 h-[calc(100%-20px)] w-px bg-border" />
                    )}

                    {/* Icon */}
                    <div
                      className={cn(
                        "z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        config.bgColor
                      )}
                    >
                      <Icon className={cn("h-4 w-4", config.color)} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 pt-0.5">
                      <Link
                        href={activity.href}
                        className="group block"
                      >
                        <p className="text-sm font-medium leading-snug group-hover:text-primary">
                          {activity.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {activity.description}
                        </p>
                      </Link>
                      <div className="mt-1 flex items-center gap-2">
                        <time
                          dateTime={activity.timestamp}
                          className="text-[11px] text-muted-foreground"
                        >
                          {formatDistanceToNow(
                            new Date(activity.timestamp),
                            { addSuffix: true, locale: ja }
                          )}
                        </time>
                        {activity.meta && (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                            {activity.meta}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {hasMore && onLoadMore && (
              <div className="mt-2 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Activity className="h-4 w-4" />
                  )}
                  もっと読み込む
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
