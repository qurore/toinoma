import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Users,
  Activity,
  ShoppingCart,
  Flag,
  UserCog,
  Shield,
  Store,
} from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "管理者ダッシュボード - 問の間",
};

// ──────────────────────────────────────────────
// SVG chart helpers
// ──────────────────────────────────────────────

interface WeeklyDataPoint {
  week: string; // Label for the week (e.g. "3/10")
  value: number;
}

function WeeklyBarChart({
  data,
  height = 160,
  barColor = "var(--color-primary)",
  label,
}: {
  data: WeeklyDataPoint[];
  height?: number;
  barColor?: string;
  label: string;
}) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        データがありません
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.max(16, Math.floor(320 / data.length) - 8);
  const chartWidth = data.length * (barWidth + 8) + 16;
  const chartHeight = height - 28; // Reserve space for labels

  return (
    <div className="overflow-x-auto">
      <svg
        width={Math.max(chartWidth, 320)}
        height={height}
        viewBox={`0 0 ${Math.max(chartWidth, 320)} ${height}`}
        role="img"
        aria-label={label}
        className="w-full"
      >
        {data.map((point, idx) => {
          const barHeight = (point.value / maxValue) * (chartHeight - 8);
          const x = 8 + idx * (barWidth + 8);
          const y = chartHeight - barHeight;

          return (
            <g key={idx}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 2)}
                rx={3}
                fill={barColor}
                opacity={0.85}
              />
              {/* Value on top */}
              {point.value > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  className="fill-foreground text-[10px] font-medium"
                >
                  {point.value.toLocaleString()}
                </text>
              )}
              {/* Week label */}
              <text
                x={x + barWidth / 2}
                y={height - 4}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {point.week}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ──────────────────────────────────────────────
// Week bucketing utility
// ──────────────────────────────────────────────

function bucketByWeek(
  rows: { created_at: string }[],
  weeksBack: number
): WeeklyDataPoint[] {
  const now = new Date();
  const buckets: WeeklyDataPoint[] = [];

  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - i * 7);
    weekStart.setHours(0, 0, 0, 0);
    // Set to Monday of that week
    const dayOfWeek = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - ((dayOfWeek + 6) % 7));

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const count = rows.filter((r) => {
      const d = new Date(r.created_at);
      return d >= weekStart && d < weekEnd;
    }).length;

    const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
    buckets.push({ week: label, value: count });
  }

  return buckets;
}

function bucketRevenueByWeek(
  rows: { created_at: string; amount_paid: number }[],
  weeksBack: number
): WeeklyDataPoint[] {
  const now = new Date();
  const buckets: WeeklyDataPoint[] = [];

  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - i * 7);
    weekStart.setHours(0, 0, 0, 0);
    const dayOfWeek = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - ((dayOfWeek + 6) % 7));

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const total = rows
      .filter((r) => {
        const d = new Date(r.created_at);
        return d >= weekStart && d < weekEnd;
      })
      .reduce((sum, r) => sum + (r.amount_paid ?? 0), 0);

    const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
    buckets.push({ week: label, value: total });
  }

  return buckets;
}

// ──────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Date threshold for "active users" (7 days) and weekly charts (12 weeks)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

  const [
    usersResult,
    sellersResult,
    setsResult,
    purchasesResult,
    subsResult,
    recentUsersResult,
    recentPurchasesResult,
    activeSubmitters,
    recentReportsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("seller_profiles")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("problem_sets")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase.from("purchases").select("id, amount_paid"),
    supabase.from("user_subscriptions").select("tier"),
    // Registrations in last 12 weeks for growth chart
    supabase
      .from("profiles")
      .select("id, created_at")
      .gte("created_at", twelveWeeksAgo.toISOString()),
    // Purchases in last 12 weeks for revenue chart
    supabase
      .from("purchases")
      .select("id, amount_paid, created_at")
      .gte("created_at", twelveWeeksAgo.toISOString()),
    // Active users: users with submissions in last 7 days
    supabase
      .from("submissions")
      .select("user_id")
      .gte("created_at", sevenDaysAgo.toISOString()),
    // Recent reports (most recent 5)
    supabase
      .from("reports")
      .select("id, reason, status, created_at, problem_set_id, problem_sets(title)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Type the reports data safely since the table may not be in generated types
  interface ReportRow {
    id: string;
    reason: string;
    status: string;
    created_at: string;
    problem_set_id: string;
    problem_sets: { title: string } | null;
  }
  const recentReports = (recentReportsResult.data ?? []) as unknown as ReportRow[];

  const totalUsers = usersResult.count ?? 0;
  const totalSellers = sellersResult.count ?? 0;
  const publishedSets = setsResult.count ?? 0;
  const purchases = purchasesResult.data ?? [];
  const totalRevenue = purchases.reduce(
    (sum, p) => sum + (p.amount_paid ?? 0),
    0
  );

  const subscriptions = subsResult.data ?? [];
  const paidSubs = subscriptions.filter(
    (s) => s.tier === "basic" || s.tier === "pro"
  ).length;

  // Active users (unique submitters in last 7 days)
  const activeUserIds = new Set(
    (activeSubmitters.data ?? []).map((s) => s.user_id)
  );
  const activeUserCount = activeUserIds.size;

  // Conversion rate: purchasers / total users
  const conversionRate =
    totalUsers > 0
      ? ((purchases.length / Math.max(totalUsers, 1)) * 100).toFixed(1)
      : "0.0";

  // Weekly charts
  const userGrowthData = bucketByWeek(
    (recentUsersResult.data ?? []).map((u) => ({
      created_at: u.created_at,
    })),
    12
  );

  const revenueGrowthData = bucketRevenueByWeek(
    (recentPurchasesResult.data ?? []).map((p) => ({
      created_at: p.created_at,
      amount_paid: p.amount_paid ?? 0,
    })),
    12
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">
        管理者ダッシュボード
      </h1>

      {/* Summary stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard title="総ユーザー数" value={totalUsers} icon={Users} />
        <StatCard title="出品者数" value={totalSellers} icon={Users} />
        <StatCard title="公開中の問題セット" value={publishedSets} icon={ShoppingCart} />
        <StatCard
          title="総売上"
          value={`¥${totalRevenue.toLocaleString()}`}
          icon={TrendingUp}
        />
        <StatCard title="有料サブスク" value={paidSubs} icon={Activity} />
      </div>

      {/* Enhanced metrics row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Activity className="h-4 w-4" />
              アクティブユーザー（直近7日間）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeUserCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              直近7日間に解答を提出したユニークユーザー数
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              コンバージョン率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{conversionRate}%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              購入件数 / 総ユーザー数
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="mb-8 flex flex-wrap gap-2">
        <Button size="sm" asChild>
          <Link href="/admin/users">
            <UserCog className="mr-1.5 h-3.5 w-3.5" />
            ユーザー管理
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/reports">
            <Flag className="mr-1.5 h-3.5 w-3.5" />
            報告管理
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/sellers">
            <Store className="mr-1.5 h-3.5 w-3.5" />
            出品者管理
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/announcements">
            <Shield className="mr-1.5 h-3.5 w-3.5" />
            お知らせ管理
          </Link>
        </Button>
      </div>

      {/* Charts */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              ユーザー登録数（週次・直近12週間）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyBarChart
              data={userGrowthData}
              barColor="hsl(var(--primary))"
              label="週次ユーザー登録数"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              売上推移（週次・直近12週間）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyBarChart
              data={revenueGrowthData}
              barColor="hsl(160, 84%, 39%)"
              label="週次売上推移"
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent reports queue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="h-4 w-4 text-amber-600" />
            最近の報告
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/reports">すべて表示</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentReports.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              未対応の報告はありません
            </p>
          ) : (
            <div className="space-y-3">
              {recentReports.map((report) => {
                const setTitle =
                  (report.problem_sets as unknown as { title: string } | null)
                    ?.title ?? "---";
                return (
                  <div
                    key={report.id}
                    className="flex items-center justify-between rounded-md border border-border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{setTitle}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {report.reason}
                      </p>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <Badge
                        variant={
                          report.status === "pending"
                            ? "default"
                            : report.status === "resolved"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {report.status === "pending"
                          ? "未対応"
                          : report.status === "resolved"
                            ? "解決済み"
                            : report.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(report.created_at).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────
// Stat card component
// ──────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon?: typeof Users;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {Icon && <Icon className="h-4 w-4" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
