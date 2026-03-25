import Link from "next/link";
import { requireSellerTos } from "@/lib/auth/require-seller";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, Download, BarChart3 } from "lucide-react";
import { SUBJECT_LABELS } from "@toinoma/shared/constants";
import type { Subject } from "@/types/database";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "分析 - 問の間",
};

export default async function SalesAnalyticsPage() {
  const { user } = await requireSellerTos();
  const supabase = await createClient();

  // Fetch seller's problem sets with purchase counts
  const { data: problemSets } = await supabase
    .from("problem_sets")
    .select("id, title, subject, price, status")
    .eq("seller_id", user.id);

  const sets = problemSets ?? [];
  const publishedSetIds = sets
    .filter((s) => s.status === "published")
    .map((s) => s.id);

  // Fetch all purchases for this seller's problem sets
  const { data: purchases } = publishedSetIds.length > 0
    ? await supabase
        .from("purchases")
        .select("id, problem_set_id, amount_paid, created_at")
        .in("problem_set_id", publishedSetIds)
    : { data: [] };

  const allPurchases = purchases ?? [];

  // Fetch submission counts for grading analytics
  const { data: submissions } = publishedSetIds.length > 0
    ? await supabase
        .from("submissions")
        .select("id, problem_set_id, score, max_score, created_at")
        .in("problem_set_id", publishedSetIds)
    : { data: [] };

  const allSubmissions = submissions ?? [];

  // Calculate aggregate stats
  const totalRevenue = allPurchases.reduce(
    (sum, p) => sum + (p.amount_paid ?? 0),
    0
  );
  const platformFee = Math.round(totalRevenue * 0.15);
  const netRevenue = totalRevenue - platformFee;
  const totalPurchases = allPurchases.length;
  const totalSubmissions = allSubmissions.length;

  // Per-problem-set breakdown
  const perSetStats = sets.map((ps) => {
    const setPurchases = allPurchases.filter(
      (p) => p.problem_set_id === ps.id
    );
    const setSubmissions = allSubmissions.filter(
      (s) => s.problem_set_id === ps.id
    );
    const setRevenue = setPurchases.reduce(
      (sum, p) => sum + (p.amount_paid ?? 0),
      0
    );
    const avgScore =
      setSubmissions.length > 0
        ? setSubmissions.reduce((sum, s) => {
            if (s.score == null || s.max_score == null || s.max_score === 0) return sum;
            return sum + (s.score / s.max_score) * 100;
          }, 0) / setSubmissions.length
        : null;

    return {
      ...ps,
      purchaseCount: setPurchases.length,
      submissionCount: setSubmissions.length,
      revenue: setRevenue,
      avgScorePercent: avgScore,
    };
  });

  // Monthly revenue for the last 6 months
  const monthlyRevenue: { month: string; revenue: number; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthLabel = `${year}/${String(month + 1).padStart(2, "0")}`;

    const monthPurchases = allPurchases.filter((p) => {
      const d = new Date(p.created_at);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    monthlyRevenue.push({
      month: monthLabel,
      revenue: monthPurchases.reduce(
        (sum, p) => sum + (p.amount_paid ?? 0),
        0
      ),
      count: monthPurchases.length,
    });
  }

  // This month vs last month calculations
  const thisMonthRevenue = monthlyRevenue.length > 0
    ? monthlyRevenue[monthlyRevenue.length - 1].revenue
    : 0;
  const lastMonthRevenue = monthlyRevenue.length > 1
    ? monthlyRevenue[monthlyRevenue.length - 2].revenue
    : 0;
  const revenueGrowth = lastMonthRevenue === 0
    ? (thisMonthRevenue > 0 ? 100 : 0)
    : Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100);

  // Sales by subject breakdown
  const subjectBreakdown: Record<string, { count: number; revenue: number }> = {};
  for (const ps of perSetStats) {
    const subject = ps.subject as Subject;
    if (!subjectBreakdown[subject]) {
      subjectBreakdown[subject] = { count: 0, revenue: 0 };
    }
    subjectBreakdown[subject].count += ps.purchaseCount;
    subjectBreakdown[subject].revenue += ps.revenue;
  }
  const sortedSubjects = Object.entries(subjectBreakdown)
    .sort(([, a], [, b]) => b.revenue - a.revenue);

  // Student performance analytics
  const gradedSubmissions = allSubmissions.filter(
    (s) => s.score != null && s.max_score != null && s.max_score > 0
  );
  const avgScorePercent = gradedSubmissions.length > 0
    ? gradedSubmissions.reduce(
        (sum, s) => sum + ((s.score ?? 0) / (s.max_score ?? 1)) * 100,
        0
      ) / gradedSubmissions.length
    : null;
  const completionRate = publishedSetIds.length > 0
    ? Math.round((allSubmissions.length / Math.max(allPurchases.length, 1)) * 100)
    : 0;

  // Top-selling sets sorted by revenue
  const topSelling = [...perSetStats]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "ホーム", href: "/" },
        { label: "出品者ダッシュボード", href: "/seller" },
        { label: "分析" },
      ]} />
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">販売分析</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            売上・購入・採点の統計データ
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-1.5 h-3.5 w-3.5" />
          データをエクスポート
        </Button>
      </div>

      {/* Revenue overview cards with growth */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              総売上
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ¥{totalRevenue.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              手取り ¥{netRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              今月の売上
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ¥{thisMonthRevenue.toLocaleString()}
            </p>
            <div className="mt-1 flex items-center gap-1 text-xs">
              {revenueGrowth > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span className="text-success">+{revenueGrowth}%</span>
                </>
              ) : revenueGrowth < 0 ? (
                <>
                  <TrendingDown className="h-3 w-3 text-destructive" />
                  <span className="text-destructive">{revenueGrowth}%</span>
                </>
              ) : (
                <>
                  <Minus className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">変動なし</span>
                </>
              )}
              <span className="text-muted-foreground">前月比</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              先月の売上
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ¥{lastMonthRevenue.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalPurchases}件の購入
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              総採点回数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalSubmissions}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              完了率 {completionRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly revenue chart (horizontal bar chart) */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">月別売上推移</CardTitle>
        </CardHeader>
        <CardContent>
          {totalRevenue === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BarChart3 className="mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                売上データがありません
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                問題セットが購入されると、ここに月別の推移が表示されます
              </p>
            </div>
          ) : (
            (() => {
              const maxRevenue = Math.max(
                ...monthlyRevenue.map((r) => r.revenue),
                1
              );
              // Calculate clean Y-axis scale ticks (4 ticks from 0 to rounded max)
              const rawStep = maxRevenue / 4;
              const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
              const step = Math.ceil(rawStep / magnitude) * magnitude;
              const scaleMax = step * 4;
              const ticks = [0, step, step * 2, step * 3, scaleMax];

              return (
                <div className="overflow-x-auto">
                  <div className="min-w-[480px] space-y-3">
                    {monthlyRevenue.map((m) => {
                      const widthPercent = (m.revenue / scaleMax) * 100;

                      return (
                        <div key={m.month} className="flex items-center gap-3">
                          <span className="w-16 shrink-0 text-sm text-muted-foreground">
                            {m.month}
                          </span>
                          <div className="flex-1">
                            <div className="h-7 w-full overflow-hidden rounded bg-muted/40">
                              <div
                                className="h-full rounded bg-primary/80 transition-all"
                                style={{
                                  width: `${m.revenue > 0 ? Math.max(widthPercent, 3) : 0}%`,
                                }}
                                title={`¥${m.revenue.toLocaleString()} (${m.count}件)`}
                              />
                            </div>
                          </div>
                          <span className="w-32 shrink-0 text-right text-sm font-medium">
                            ¥{m.revenue.toLocaleString()}
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              ({m.count}件)
                            </span>
                          </span>
                        </div>
                      );
                    })}
                    {/* Y-axis scale labels */}
                    <div className="flex items-center gap-3">
                      <span className="w-16 shrink-0" />
                      <div className="relative flex-1">
                        <div className="flex justify-between border-t border-muted pt-2">
                          {ticks.map((tick) => (
                            <span
                              key={tick}
                              className="text-[11px] text-muted-foreground"
                            >
                              ¥{tick.toLocaleString()}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="w-32 shrink-0" />
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </CardContent>
      </Card>

      {/* Subject breakdown + student performance */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Sales by subject */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">科目別売上</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedSubjects.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                データがありません
              </p>
            ) : (
              <div className="space-y-3">
                {sortedSubjects.map(([subject, data]) => {
                  const maxSubjectRevenue = Math.max(
                    ...sortedSubjects.map(([, d]) => d.revenue),
                    1
                  );
                  const widthPct = (data.revenue / maxSubjectRevenue) * 100;

                  return (
                    <div key={subject} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {SUBJECT_LABELS[subject as Subject] ?? subject}
                        </span>
                        <span className="text-muted-foreground">
                          ¥{data.revenue.toLocaleString()} ({data.count}件)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.max(widthPct, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student performance analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">学生パフォーマンス</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">平均正答率</p>
                <p className="text-2xl font-bold">
                  {avgScorePercent != null
                    ? `${Math.round(avgScorePercent)}%`
                    : "---"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">完了率</p>
                <p className="text-2xl font-bold">{completionRate}%</p>
                <p className="text-[11px] text-muted-foreground">
                  提出数 / 購入数
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">採点済み解答</p>
                <p className="text-2xl font-bold">{gradedSubmissions.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">総購入数</p>
                <p className="text-2xl font-bold">{totalPurchases}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top-selling problem sets */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">売上上位の問題セット</CardTitle>
        </CardHeader>
        <CardContent>
          {topSelling.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              データがありません
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">順位</th>
                    <th className="pb-3 pr-4 font-medium">問題セット</th>
                    <th className="pb-3 pr-4 text-right font-medium">購入数</th>
                    <th className="pb-3 pr-4 text-right font-medium">売上</th>
                    <th className="pb-3 text-right font-medium">平均正答率</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topSelling.map((ps, idx) => (
                    <tr key={ps.id} className="transition-colors hover:bg-muted/50">
                      <td className="py-3 pr-4">
                        <Badge variant={idx < 3 ? "default" : "secondary"} className="text-xs">
                          {idx + 1}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/seller/sets/${ps.id}/edit`}
                          className="font-medium hover:underline"
                        >
                          {ps.title}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-right">{ps.purchaseCount}</td>
                      <td className="py-3 pr-4 text-right font-medium">
                        ¥{ps.revenue.toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        {ps.avgScorePercent != null
                          ? `${Math.round(ps.avgScorePercent)}%`
                          : "---"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-problem-set breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">問題セット別分析</CardTitle>
        </CardHeader>
        <CardContent>
          {perSetStats.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              問題セットがありません
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">問題セット</th>
                    <th className="pb-3 pr-4 font-medium">科目</th>
                    <th className="pb-3 pr-4 text-right font-medium">価格</th>
                    <th className="pb-3 pr-4 text-right font-medium">購入数</th>
                    <th className="pb-3 pr-4 text-right font-medium">採点数</th>
                    <th className="pb-3 pr-4 text-right font-medium">売上</th>
                    <th className="pb-3 text-right font-medium">平均正答率</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {perSetStats.map((ps) => (
                    <tr key={ps.id} className="transition-colors hover:bg-muted/50">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/seller/sets/${ps.id}/edit`}
                          className="font-medium hover:underline"
                        >
                          {ps.title}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        {SUBJECT_LABELS[ps.subject as Subject]}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {ps.price === 0
                          ? "無料"
                          : `¥${ps.price.toLocaleString()}`}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {ps.purchaseCount}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {ps.submissionCount}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium">
                        ¥{ps.revenue.toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        {ps.avgScorePercent != null
                          ? `${Math.round(ps.avgScorePercent)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
