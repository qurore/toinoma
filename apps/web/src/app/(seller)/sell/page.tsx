import Link from "next/link";
import {
  Check,
  Circle,
  BookOpen,
  Upload,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  PlusCircle,
  FileUp,
  Star,
  ShoppingCart,
  ClipboardList,
  Eye,
  Package,
  Wallet,
  Users,
  FileText,
  ArrowRight,
} from "lucide-react";
import { getSellerTosStatus } from "@/lib/auth/require-seller";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SellerTosGate } from "@/components/seller/seller-tos-gate";
import { ProblemSetList } from "./problem-set-list";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "出品者ダッシュボード - 問の間",
};

export default async function SellerDashboardPage() {
  const { user, sellerProfile, tosAccepted } = await getSellerTosStatus();

  // Show ToS modal if not accepted
  if (!tosAccepted) {
    return <SellerTosGate />;
  }

  const supabase = await createClient();

  // Check onboarding completion for banner
  const profileComplete =
    !!sellerProfile?.seller_display_name &&
    sellerProfile.seller_display_name !== "__pending__";
  const stripeComplete = !!sellerProfile?.stripe_account_id;
  const onboardingComplete = profileComplete && stripeComplete;

  // Fetch problem sets first (other queries depend on the IDs)
  const { data: problemSets } = await supabase
    .from("problem_sets")
    .select("id, title, subject, difficulty, price, status, created_at")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  const sets = problemSets ?? [];
  const publishedCount = sets.filter((s) => s.status === "published").length;
  const draftCount = sets.filter((s) => s.status === "draft").length;
  const publishedIds = sets
    .filter((s) => s.status === "published")
    .map((s) => s.id);

  // Calculate date ranges for trend comparison
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const pubIds = publishedIds.length > 0 ? publishedIds : ["__none__"];
  const allSetIds = sets.length > 0 ? sets.map((s) => s.id) : ["__none__"];

  // Fetch all dependent data in a single parallel batch
  const [
    { count: currentPurchaseCount },
    { count: prevPurchaseCount },
    { count: currentSubmissionCount },
    { count: prevSubmissionCount },
    { data: currentRevenue },
    { data: prevRevenue },
    { data: recentPurchases },
    { data: recentSubmissions },
    { data: recentReviews },
    { data: allPurchasers },
    { data: totalRevenueData },
    { data: dailyPurchases },
    { data: latestSubmissions },
  ] = await Promise.all([
    // Current period purchases (last 30 days)
    supabase
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .in("problem_set_id", pubIds)
      .gte("created_at", thirtyDaysAgo.toISOString()),
    // Previous period purchases (30-60 days ago)
    supabase
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .in("problem_set_id", pubIds)
      .gte("created_at", sixtyDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString()),
    // Current period submissions (last 30 days)
    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .in("problem_set_id", pubIds)
      .gte("created_at", thirtyDaysAgo.toISOString()),
    // Previous period submissions (30-60 days ago)
    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .in("problem_set_id", pubIds)
      .gte("created_at", sixtyDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString()),
    // Current period revenue (last 30 days)
    supabase
      .from("purchases")
      .select("amount_paid")
      .in("problem_set_id", pubIds)
      .gte("created_at", thirtyDaysAgo.toISOString()),
    // Previous period revenue (30-60 days ago)
    supabase
      .from("purchases")
      .select("amount_paid")
      .in("problem_set_id", pubIds)
      .gte("created_at", sixtyDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString()),
    // Recent activity: purchases
    supabase
      .from("purchases")
      .select("id, created_at, amount_paid, problem_set_id, problem_sets(title)")
      .in("problem_set_id", allSetIds)
      .order("created_at", { ascending: false })
      .limit(10),
    // Recent activity: submissions
    supabase
      .from("submissions")
      .select("id, created_at, score, max_score, problem_set_id, problem_sets(title)")
      .in("problem_set_id", allSetIds)
      .order("created_at", { ascending: false })
      .limit(10),
    // Recent activity: reviews
    supabase
      .from("reviews")
      .select("id, created_at, rating, body, problem_set_id, problem_sets(title)")
      .in("problem_set_id", allSetIds)
      .order("created_at", { ascending: false })
      .limit(10),
    // Total unique students (purchasers)
    supabase
      .from("purchases")
      .select("user_id")
      .in("problem_set_id", pubIds),
    // Total revenue across all time
    supabase
      .from("purchases")
      .select("amount_paid")
      .in("problem_set_id", pubIds),
    // Daily purchase data for the chart
    supabase
      .from("purchases")
      .select("amount_paid, created_at")
      .in("problem_set_id", pubIds)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true }),
    // Latest 5 submissions for seller's problem sets
    supabase
      .from("submissions")
      .select(
        "id, created_at, score, max_score, problem_set_id, problem_sets(title), profiles(display_name)"
      )
      .in("problem_set_id", allSetIds)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const currentRevenueTotal = (currentRevenue ?? []).reduce(
    (sum, p) => sum + p.amount_paid,
    0
  );

  const prevRevenueTotal = (prevRevenue ?? []).reduce(
    (sum, p) => sum + p.amount_paid,
    0
  );

  // Merge and sort activity
  const activities: ActivityItem[] = [];

  for (const p of recentPurchases ?? []) {
    const title = (p.problem_sets as unknown as { title: string } | null)?.title ?? "---";
    activities.push({
      id: `purchase-${p.id}`,
      type: "purchase",
      createdAt: p.created_at,
      setTitle: title,
      detail:
        p.amount_paid === 0
          ? "無料取得"
          : `¥${p.amount_paid.toLocaleString()}`,
    });
  }

  for (const s of recentSubmissions ?? []) {
    const title = (s.problem_sets as unknown as { title: string } | null)?.title ?? "---";
    activities.push({
      id: `submission-${s.id}`,
      type: "submission",
      createdAt: s.created_at,
      setTitle: title,
      detail:
        s.score !== null && s.max_score !== null
          ? `${s.score}/${s.max_score}点`
          : "採点中",
    });
  }

  for (const r of recentReviews ?? []) {
    const title = (r.problem_sets as unknown as { title: string } | null)?.title ?? "---";
    activities.push({
      id: `review-${r.id}`,
      type: "review",
      createdAt: r.created_at,
      setTitle: title,
      detail: `${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}`,
    });
  }

  activities.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const recentActivity = activities.slice(0, 10);

  const uniqueStudents = new Set(
    (allPurchasers ?? []).map((p) => p.user_id)
  ).size;

  const totalRevenue = (totalRevenueData ?? []).reduce(
    (sum, p) => sum + p.amount_paid,
    0
  );

  // Aggregate last-30-day purchases by day for the revenue chart
  const revenueByDay: Record<string, number> = {};
  for (const p of dailyPurchases ?? []) {
    const d = new Date(p.created_at);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    revenueByDay[key] = (revenueByDay[key] ?? 0) + p.amount_paid;
  }

  // Populate daily chart data
  const chartData: { date: string; revenue: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const label = `${dayStart.getMonth() + 1}/${dayStart.getDate()}`;
    chartData.push({ date: label, revenue: revenueByDay[label] ?? 0 });
  }

  const chartMax = Math.max(...chartData.map((d) => d.revenue), 1);

  return (
    <main className="container mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "出品者ダッシュボード" },
        ]}
      />

      {/* Onboarding completion banner */}
      {!onboardingComplete && (() => {
        const completedSteps = 1 + (profileComplete ? 1 : 0) + (stripeComplete ? 1 : 0);
        return (
          <div className="mb-8 overflow-hidden rounded-xl border-2 border-primary/25 bg-gradient-to-r from-primary/[0.07] via-primary/[0.03] to-transparent shadow-sm">
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Circle className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <p className="text-base font-semibold">
                    セットアップを完了して、出品を始めましょう
                  </p>
                  <Badge className="shrink-0 border-primary/20 bg-primary/10 text-xs font-semibold text-primary" variant="outline">
                    {completedSteps} / 3 完了
                  </Badge>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {!profileComplete
                    ? "プロフィールを設定すると、あなたの問題セットが購入者に表示されます"
                    : "支払い設定を完了すると、有料問題セットの販売収益を受け取れます"}
                </p>
                {/* Step progress indicators */}
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                  <span className="flex items-center gap-2 text-success">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15">
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="font-medium">利用規約</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={
                        profileComplete
                          ? "flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-success"
                          : "flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary/40 bg-card text-xs font-bold text-primary"
                      }
                    >
                      {profileComplete ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        "2"
                      )}
                    </span>
                    <span
                      className={
                        profileComplete
                          ? "font-medium text-success"
                          : "font-medium text-foreground"
                      }
                    >
                      プロフィール
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={
                        stripeComplete
                          ? "flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-success"
                          : "flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-xs font-bold text-muted-foreground"
                      }
                    >
                      {stripeComplete ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        "3"
                      )}
                    </span>
                    <span
                      className={
                        stripeComplete
                          ? "font-medium text-success"
                          : "font-medium text-muted-foreground"
                      }
                    >
                      支払い設定
                    </span>
                  </span>
                </div>
              </div>
              <Button asChild className="shrink-0">
                <Link href="/sell/onboarding">
                  <span>セットアップを続ける</span>
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 w-full bg-border/60">
              <div
                className="h-full rounded-r-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                style={{
                  width: `${(completedSteps / 3) * 100}%`,
                }}
              />
            </div>
          </div>
        );
      })()}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            出品者ダッシュボード
          </h1>
          <p className="mt-1 text-muted-foreground">
            問題セットの管理・作成
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Button asChild size="default">
          <Link href="/sell/sets/new">
            <PlusCircle className="mr-1.5 h-4 w-4" />
            新規セット作成
          </Link>
        </Button>
        <Button variant="outline" asChild size="default">
          <Link href="/sell/pool/import">
            <FileUp className="mr-1.5 h-4 w-4" />
            PDF取り込み
          </Link>
        </Button>
        <Button variant="outline" asChild size="default">
          <Link href="/sell/pool">
            <Eye className="mr-1.5 h-4 w-4" />
            問題プール
          </Link>
        </Button>
        <Button variant="outline" asChild size="default">
          <Link href="/sell/analytics">
            <BarChart3 className="mr-1.5 h-4 w-4" />
            売上分析
          </Link>
        </Button>
      </div>

      {/* Stats with trend indicators */}
      <div className="stagger-children mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="relative overflow-hidden">
          <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8">
            <Package className="h-4.5 w-4.5 text-primary/70" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              公開中 / 合計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              <span className="text-primary">{publishedCount}</span>
              <span className="text-lg text-muted-foreground"> / {sets.length}</span>
            </p>
            <div className="mt-1 flex items-center gap-1 text-xs">
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                下書き {draftCount}件
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8">
            <Wallet className="h-4.5 w-4.5 text-primary/70" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              累計売上
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">¥{totalRevenue.toLocaleString()}</p>
            <div className="mt-1 flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">
                手取り ¥{Math.round(totalRevenue * 0.85).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
        <StatCardWithTrend
          label="売上（30日）"
          value={`¥${currentRevenueTotal.toLocaleString()}`}
          current={currentRevenueTotal}
          previous={prevRevenueTotal}
          icon={<TrendingUp className="h-4.5 w-4.5 text-primary/70" />}
        />
        <StatCardWithTrend
          label="購入数（30日）"
          value={String(currentPurchaseCount ?? 0)}
          current={currentPurchaseCount ?? 0}
          previous={prevPurchaseCount ?? 0}
          subLabel={`累計 ${uniqueStudents}名`}
          icon={<Users className="h-4.5 w-4.5 text-primary/70" />}
        />
        <StatCardWithTrend
          label="解答数（30日）"
          value={String(currentSubmissionCount ?? 0)}
          current={currentSubmissionCount ?? 0}
          previous={prevSubmissionCount ?? 0}
          icon={<ClipboardList className="h-4.5 w-4.5 text-primary/70" />}
        />
      </div>

      {/* Revenue chart (30-day trend) */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">
            売上推移（直近30日間）
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            合計 ¥{currentRevenueTotal.toLocaleString()}
          </span>
        </CardHeader>
        <CardContent>
          {currentRevenueTotal === 0 && prevRevenueTotal === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <BarChart3 className="mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                この期間の売上データはありません
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                問題セットが購入されると、ここにグラフが表示されます
              </p>
            </div>
          ) : (
            <div className="flex h-40 items-end gap-[2px] overflow-x-auto">
              {chartData.map((d, i) => {
                const heightPct = (d.revenue / chartMax) * 100;
                return (
                  <div
                    key={i}
                    className="group relative flex flex-1 flex-col items-center"
                  >
                    <div
                      className={`w-full rounded-t transition-colors ${
                        d.revenue > 0
                          ? "bg-primary/70 group-hover:bg-primary"
                          : "bg-muted/50"
                      }`}
                      style={{
                        height: `${d.revenue > 0 ? Math.max(heightPct, 4) : 2}%`,
                      }}
                    />
                    {/* Tooltip on hover */}
                    {d.revenue > 0 && (
                      <div className="pointer-events-none absolute -top-10 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[10px] text-background shadow-md group-hover:block">
                        {d.date}: ¥{d.revenue.toLocaleString()}
                      </div>
                    )}
                    {/* Show every 5th label */}
                    {i % 5 === 0 && (
                      <span className="mt-1 text-[9px] text-muted-foreground">
                        {d.date}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent activity feed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              最近のアクティビティ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                まだアクティビティがありません
              </p>
            ) : (
              <ul className="space-y-3">
                {recentActivity.map((item) => (
                  <li key={item.id} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <ActivityIcon type={item.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{item.setTitle}</span>
                        <span className="ml-2 text-muted-foreground">
                          {item.detail}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(item.createdAt)}
                      </p>
                    </div>
                    <ActivityBadge type={item.type} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent submissions table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              最近の解答
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!latestSubmissions || latestSubmissions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                まだ解答がありません
              </p>
            ) : (
              <div className="-mx-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                      <th className="px-6 py-2.5 font-medium">問題セット</th>
                      <th className="px-3 py-2.5 font-medium">回答者</th>
                      <th className="px-3 py-2.5 text-right font-medium">得点</th>
                      <th className="px-6 py-2.5 text-right font-medium">日時</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {latestSubmissions.map((sub) => {

                      const setTitle =
                        (sub.problem_sets as unknown as { title: string } | null)
                          ?.title ?? "---";
                      const displayName =
                        (
                          sub.profiles as unknown as {
                            display_name: string | null;
                          } | null
                        )?.display_name ?? "匿名";
                      const scoreRatio =
                        sub.score !== null && sub.max_score !== null && sub.max_score > 0
                          ? sub.score / sub.max_score
                          : null;
                      return (
                        <tr key={sub.id} className="transition-colors hover:bg-muted/40">
                          <td className="max-w-[140px] truncate px-6 py-2.5 font-medium">
                            {setTitle}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {displayName}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {sub.score !== null && sub.max_score !== null ? (
                              <span className={
                                scoreRatio !== null && scoreRatio >= 0.8
                                  ? "font-medium text-success"
                                  : scoreRatio !== null && scoreRatio < 0.4
                                    ? "font-medium text-destructive"
                                    : "font-medium"
                              }>
                                {sub.score}/{sub.max_score}
                              </span>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                採点中
                              </Badge>
                            )}
                          </td>
                          <td className="px-6 py-2.5 text-right text-muted-foreground">
                            {formatRelativeTime(sub.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      {/* Problem Set List */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">問題セット一覧</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {sets.length > 0
              ? `${publishedCount}件公開中 / ${draftCount}件下書き`
              : "問題セットを作成して出品しましょう"}
          </p>
        </div>
        {sets.length > 0 && (
          <Button size="sm" asChild>
            <Link href="/sell/sets/new">
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              新規作成
            </Link>
          </Button>
        )}
      </div>

      {sets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">
                最初の問題セットを作成しましょう
              </h3>
              <p className="mb-8 text-sm text-muted-foreground">
                問題プールに問題を追加し、セットにまとめて公開すると、すぐに販売を開始できます
              </p>
              <div className="mb-8 grid grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium">問題を作成</span>
                  <span className="text-[10px] text-muted-foreground">
                    記述・選択・穴埋め
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium">セットに追加</span>
                  <span className="text-[10px] text-muted-foreground">
                    PDF入稿も対応
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium">販売開始</span>
                  <span className="text-[10px] text-muted-foreground">
                    売上分析も充実
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" asChild>
                  <Link href="/sell/pool/new">
                    <PlusCircle className="mr-1.5 h-4 w-4" />
                    問題を作成
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/sell/sets/new">
                    <PlusCircle className="mr-1.5 h-4 w-4" />
                    セットを作成
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ProblemSetList sets={sets} />
      )}
    </main>
  );
}

// --- Helper components ---

function StatCardWithTrend({
  label,
  value,
  current,
  previous,
  subLabel,
  icon,
}: {
  label: string;
  value: string;
  current: number;
  previous: number;
  subLabel?: string;
  icon?: React.ReactNode;
}) {
  const diff = previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);
  const isUp = diff > 0;
  const isDown = diff < 0;

  return (
    <Card className="relative overflow-hidden">
      {icon && (
        <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8">
          {icon}
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums">{value}</p>
        <div className="mt-1 flex items-center gap-1 text-xs">
          {isUp ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-success/10 px-1.5 py-0.5 text-success">
              <TrendingUp className="h-3 w-3" />
              +{diff}%
            </span>
          ) : isDown ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-destructive">
              <TrendingDown className="h-3 w-3" />
              {diff}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">
              <Minus className="h-3 w-3" />
              変動なし
            </span>
          )}
          <span className="text-muted-foreground">前月比</span>
        </div>
        {subLabel && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityIcon({ type }: { type: ActivityItem["type"] }) {
  switch (type) {
    case "purchase":
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-success/10">
          <ShoppingCart className="h-3.5 w-3.5 text-success" />
        </div>
      );
    case "submission":
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
          <ClipboardList className="h-3.5 w-3.5 text-primary" />
        </div>
      );
    case "review":
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10">
          <Star className="h-3.5 w-3.5 text-amber-500" />
        </div>
      );
  }
}

type ActivityItem = {
  id: string;
  type: "purchase" | "submission" | "review";
  createdAt: string;
  setTitle: string;
  detail: string;
};

function ActivityBadge({ type }: { type: ActivityItem["type"] }) {
  switch (type) {
    case "purchase":
      return (
        <Badge className="shrink-0 border-transparent bg-success/10 text-[10px] text-success">
          購入
        </Badge>
      );
    case "submission":
      return (
        <Badge className="shrink-0 border-transparent bg-primary/10 text-[10px] text-primary">
          解答
        </Badge>
      );
    case "review":
      return (
        <Badge className="shrink-0 border-transparent bg-amber-500/10 text-[10px] text-amber-600">
          レビュー
        </Badge>
      );
  }
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}時間前`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}日前`;

  return new Date(dateStr).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}
