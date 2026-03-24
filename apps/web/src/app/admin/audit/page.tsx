import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Shield,
} from "lucide-react";
import { AuditFilters } from "./audit-filters";
import type { Metadata } from "next";
import type { Database, AdminActionType } from "@/types/database";

type AuditLogRow = Database["public"]["Tables"]["admin_audit_logs"]["Row"];

export const metadata: Metadata = {
  title: "監査ログ - 問の間",
};

const ACTION_LABELS: Record<string, string> = {
  user_banned: "ユーザーBAN",
  user_suspended: "ユーザー一時停止",
  user_warned: "ユーザー警告",
  content_removed: "コンテンツ削除",
  report_reviewed: "報告レビュー",
  report_dismissed: "報告却下",
  announcement_created: "お知らせ作成",
  seller_verified: "出品者承認",
};

const ACTION_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  user_banned: "destructive",
  user_suspended: "destructive",
  user_warned: "default",
  content_removed: "destructive",
  report_reviewed: "secondary",
  report_dismissed: "outline",
  announcement_created: "secondary",
  seller_verified: "default",
};

export default async function AdminAuditPage(props: {
  searchParams: Promise<{
    action?: string;
    page?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Admin guard
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  const searchParams = await props.searchParams;
  const actionFilter = searchParams.action ?? "all";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const perPage = 30;

  const admin = createAdminClient();

  // Build query
  let countQuery = admin
    .from("admin_audit_logs")
    .select("id", { count: "exact", head: true });

  let dataQuery = admin
    .from("admin_audit_logs")
    .select("id, admin_id, action, target_type, target_id, details, created_at")
    .order("created_at", { ascending: false });

  if (actionFilter !== "all") {
    countQuery = countQuery.eq("action", actionFilter as AdminActionType);
    dataQuery = dataQuery.eq("action", actionFilter as AdminActionType);
  }

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  dataQuery = dataQuery.range(from, to);

  const [countResult, dataResult] = await Promise.all([
    countQuery,
    dataQuery,
  ]);

  const totalCount = countResult.count ?? 0;
  const logs = (dataResult.data ?? []) as AuditLogRow[];
  const totalPages = Math.ceil(totalCount / perPage);

  // Fetch admin names
  const adminIds = [...new Set(logs.map((l) => l.admin_id))];
  const { data: adminProfiles } =
    adminIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, display_name")
          .in("id", adminIds)
      : { data: [] };

  const adminNameMap = new Map(
    (adminProfiles ?? []).map((p) => [p.id, p.display_name])
  );

  // Build pagination URL
  function buildPageUrl(p: number): string {
    const params = new URLSearchParams();
    if (actionFilter !== "all") params.set("action", actionFilter);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/audit${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">監査ログ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理者の操作履歴を確認できます（読み取り専用）
        </p>
      </div>

      {/* Filter */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <AuditFilters
            currentAction={actionFilter}
            actionLabels={ACTION_LABELS}
          />
        </CardContent>
      </Card>

      {/* Stats */}
      {totalCount > 0 && (
        <p className="mb-4 text-sm text-muted-foreground">
          {totalCount.toLocaleString()} 件の操作ログ
        </p>
      )}

      {/* Empty state */}
      {logs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <ClipboardList className="h-6 w-6 text-foreground/60" />
            </div>
            <p className="mb-2 text-lg font-medium">
              監査ログがありません
            </p>
            <p className="text-sm text-muted-foreground">
              {actionFilter !== "all"
                ? "選択されたアクションタイプのログはありません"
                : "管理者の操作が記録されるとここに表示されます"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Log entries */}
      {logs.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3">日時</th>
                    <th className="px-4 py-3">管理者</th>
                    <th className="px-4 py-3">アクション</th>
                    <th className="px-4 py-3">対象</th>
                    <th className="px-4 py-3">詳細</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => {
                    const details =
                      log.details && typeof log.details === "object"
                        ? (log.details as Record<string, unknown>)
                        : null;

                    return (
                      <tr
                        key={log.id}
                        className="transition-colors hover:bg-muted/50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {new Date(log.created_at).toLocaleString("ja-JP", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                            {adminNameMap.get(log.admin_id) ?? "不明"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              ACTION_VARIANTS[log.action] ?? "outline"
                            }
                          >
                            {ACTION_LABELS[log.action] ?? log.action}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <span className="font-mono text-xs">
                            {log.target_type}:{log.target_id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="max-w-[300px] truncate px-4 py-3 text-xs text-muted-foreground">
                          {details
                            ? Object.entries(details)
                                .map(
                                  ([k, v]) =>
                                    `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`
                                )
                                .join(", ")
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {totalCount.toLocaleString()} 件中{" "}
                {((page - 1) * perPage + 1).toLocaleString()}-
                {Math.min(page * perPage, totalCount).toLocaleString()}{" "}
                件を表示
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={page <= 1}
                >
                  <Link
                    href={buildPageUrl(page - 1)}
                    aria-disabled={page <= 1}
                    className={
                      page <= 1
                        ? "pointer-events-none opacity-50"
                        : undefined
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <span className="px-3 text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={page >= totalPages}
                >
                  <Link
                    href={buildPageUrl(page + 1)}
                    aria-disabled={page >= totalPages}
                    className={
                      page >= totalPages
                        ? "pointer-events-none opacity-50"
                        : undefined
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
