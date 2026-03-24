"use client";

import { useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import {
  ShoppingCart,
  ClipboardCheck,
  Star,
  Megaphone,
  CreditCard,
  Settings,
  Trash2,
  CheckCheck,
  Bell,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { markAsRead, markAllAsRead, deleteNotification } from "./actions";
import type { NotificationType } from "@/types/database";

export interface NotificationRow {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

// Type filter values -- "all" plus every NotificationType
export type TypeFilter = "all" | NotificationType;

const TYPE_LABELS: Record<NotificationType, string> = {
  purchase: "購入",
  grading: "採点",
  review: "レビュー",
  announcement: "お知らせ",
  subscription: "サブスク",
  system: "システム",
};

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  purchase: ShoppingCart,
  grading: ClipboardCheck,
  review: Star,
  announcement: Megaphone,
  subscription: CreditCard,
  system: Settings,
};

const TYPE_COLORS: Record<NotificationType, string> = {
  purchase: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
  grading: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
  review: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  announcement: "text-purple-600 bg-purple-50 dark:bg-purple-950/30",
  subscription: "text-rose-600 bg-rose-50 dark:bg-rose-950/30",
  system: "text-slate-600 bg-slate-50 dark:bg-slate-950/30",
};

const FILTER_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: "all", label: "すべて" },
  { value: "purchase", label: "購入" },
  { value: "grading", label: "採点" },
  { value: "review", label: "レビュー" },
  { value: "announcement", label: "お知らせ" },
  { value: "subscription", label: "サブスク" },
  { value: "system", label: "システム" },
];

interface NotificationListProps {
  notifications: NotificationRow[];
  filter: TypeFilter;
  page: number;
  totalCount: number;
  unreadCount: number;
  pageSize: number;
}

export function NotificationList({
  notifications,
  filter,
  page,
  totalCount,
  unreadCount,
  pageSize,
}: NotificationListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Scroll to top when page changes
  useEffect(() => {
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  function buildUrl(newFilter?: TypeFilter, newPage?: number) {
    const params = new URLSearchParams();
    const f = newFilter ?? filter;
    const p = newPage ?? page;
    if (f !== "all") params.set("type", f);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/notifications?${qs}` : "/notifications";
  }

  function handleFilterChange(newFilter: TypeFilter) {
    startTransition(() => {
      router.push(buildUrl(newFilter, 1));
    });
  }

  function handleMarkAllAsRead() {
    startTransition(async () => {
      await markAllAsRead();
      router.refresh();
    });
  }

  function handleDelete(notificationId: string) {
    startTransition(async () => {
      await deleteNotification(notificationId);
      router.refresh();
    });
  }

  function handleNotificationClick(notification: NotificationRow) {
    if (!notification.read_at) {
      startTransition(async () => {
        await markAsRead(notification.id);
      });
    }
  }

  return (
    <div className="space-y-4" ref={listRef}>
      {/* Header actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0
            ? `${unreadCount}件の未読通知`
            : "未読通知はありません"}
        </p>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleMarkAllAsRead}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            すべて既読にする
          </Button>
        )}
      </div>

      {/* Type filter tabs */}
      <div
        className="flex flex-wrap gap-1.5"
        role="tablist"
        aria-label="通知の種類"
      >
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            role="tab"
            aria-selected={filter === option.value}
            onClick={() => handleFilterChange(option.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === option.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {isPending ? (
        <NotificationListSkeleton />
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="rounded-full bg-muted p-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {filter === "all"
                  ? "通知はまだありません"
                  : `${FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? ""}の通知はありません`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                問題の購入や採点完了時に通知が届きます。
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2" role="list" aria-label="通知一覧">
          {notifications.map((n) => {
            const Icon = TYPE_ICONS[n.type];
            const colorClass = TYPE_COLORS[n.type];
            const isUnread = !n.read_at;

            const content = (
              <Card
                className={`group transition-colors ${
                  isUnread
                    ? "border-primary/20 bg-primary/[0.02]"
                    : "opacity-75 hover:opacity-100"
                }`}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  {/* Type icon */}
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${colorClass}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {isUnread && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-primary"
                          aria-label="未読"
                        />
                      )}
                      <p className="truncate text-sm font-medium">
                        {n.title}
                      </p>
                      <Badge
                        variant="outline"
                        className="shrink-0 text-xs"
                      >
                        {TYPE_LABELS[n.type]}
                      </Badge>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {n.body}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                        locale: ja,
                      })}
                    </p>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(n.id);
                    }}
                    className="mt-0.5 shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus:opacity-100"
                    aria-label="通知を削除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            );

            if (n.link) {
              return (
                <Link
                  key={n.id}
                  href={n.link}
                  onClick={() => handleNotificationClick(n)}
                  className="block"
                  role="listitem"
                >
                  {content}
                </Link>
              );
            }

            return (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className="cursor-default"
                role="listitem"
              >
                {content}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isPending}
            onClick={() =>
              startTransition(() => {
                router.push(buildUrl(undefined, page - 1));
              })
            }
          >
            前へ
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isPending}
            onClick={() =>
              startTransition(() => {
                router.push(buildUrl(undefined, page + 1));
              })
            }
          >
            次へ
          </Button>
        </div>
      )}
    </div>
  );
}

export function NotificationListSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="通知を読み込み中">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-start gap-3 p-4">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
