import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import type { Metadata } from "next";
import {
  NotificationList,
  NotificationListSkeleton,
  type TypeFilter,
  type NotificationRow,
} from "./notification-list";
import type { NotificationType } from "@/types/database";

export const metadata: Metadata = {
  title: "通知 - 問の間",
  description: "お知らせ、購入、採点結果などの通知を確認できます。",
};

const PAGE_SIZE = 20;

const VALID_TYPES: Set<string> = new Set([
  "purchase",
  "grading",
  "review",
  "announcement",
  "subscription",
  "system",
]);

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NotificationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const navbarData = await getNavbarData();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Parse search params
  const rawType = typeof params.type === "string" ? params.type : "all";
  const filter: TypeFilter = VALID_TYPES.has(rawType)
    ? (rawType as NotificationType)
    : "all";
  const rawPage =
    typeof params.page === "string" ? parseInt(params.page, 10) : 1;
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const offset = (page - 1) * PAGE_SIZE;

  // Build query with optional type filter
  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (filter !== "all") {
    query = query.eq("type", filter);
  }

  const { data: notifications, count } = await query;

  const allNotifs = (notifications ?? []) as NotificationRow[];
  const totalCount = count ?? 0;

  // Count unread (across all types, not just filtered)
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return (
    <>
      <AppNavbar {...navbarData} />
      <main className="container mx-auto max-w-2xl px-4 py-8 pt-16">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">通知</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            お知らせ、購入、採点結果などの通知を確認できます
          </p>
        </div>

        <Suspense fallback={<NotificationListSkeleton />}>
          <NotificationList
            notifications={allNotifs}
            filter={filter}
            page={page}
            totalCount={totalCount}
            unreadCount={unreadCount ?? 0}
            pageSize={PAGE_SIZE}
          />
        </Suspense>
      </main>
    </>
  );
}
