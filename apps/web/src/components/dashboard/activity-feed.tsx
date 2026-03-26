"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
// Activity type labels (text-only, no icons)
// ──────────────────────────────────────────────

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  purchase: "購入",
  submission: "解答",
  review: "レビュー",
  collection_add: "コレクション",
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">アクティビティ</CardTitle>
          {totalCount > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {totalCount}件
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <p className="text-sm text-muted-foreground">
              まだアクティビティがありません
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              問題を購入したり解答すると、ここに表示されます
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border/60">
              {activities.map((activity) => (
                <li key={activity.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={activity.href}
                    className="group block"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug group-hover:text-primary">
                          {activity.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {activity.description}
                        </p>
                      </div>
                      {activity.meta && (
                        <span className="shrink-0 text-xs font-medium tabular-nums text-foreground">
                          {activity.meta}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{ACTIVITY_TYPE_LABELS[activity.type]}</span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={activity.timestamp}>
                        {formatDistanceToNow(
                          new Date(activity.timestamp),
                          { addSuffix: true, locale: ja }
                        )}
                      </time>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Load more */}
            {hasMore && onLoadMore && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading && (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
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
