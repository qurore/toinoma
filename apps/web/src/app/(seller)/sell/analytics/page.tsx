import Link from "next/link";
import { requireCompleteSeller } from "@/lib/auth/require-seller";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SUBJECT_LABELS } from "@toinoma/shared/constants";
import type { Subject } from "@/types/database";

export default async function SalesAnalyticsPage() {
  const { user } = await requireCompleteSeller();
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

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sell">
            <ArrowLeft className="mr-1 h-4 w-4" />
            ダッシュボード
          </Link>
        </Button>
      </div>

      <h1 className="mb-8 text-3xl font-bold tracking-tight">販売分析</h1>

      {/* Summary stats */}
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
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              手取り（プラットフォーム手数料15%控除後）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">
              ¥{netRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              総購入数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalPurchases}</p>
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
          </CardContent>
        </Card>
      </div>

      {/* Monthly revenue chart (simple bar representation) */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">月別売上推移</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {monthlyRevenue.map((m) => {
              const maxRevenue = Math.max(
                ...monthlyRevenue.map((r) => r.revenue),
                1
              );
              const widthPercent = (m.revenue / maxRevenue) * 100;

              return (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-sm text-muted-foreground">
                    {m.month}
                  </span>
                  <div className="flex-1">
                    <div
                      className="h-6 rounded bg-primary/20"
                      style={{ width: `${Math.max(widthPercent, 2)}%` }}
                    >
                      <div
                        className="h-full rounded bg-primary transition-all"
                        style={{ width: m.revenue > 0 ? "100%" : "0%" }}
                      />
                    </div>
                  </div>
                  <span className="w-28 shrink-0 text-right text-sm font-medium">
                    ¥{m.revenue.toLocaleString()} ({m.count}件)
                  </span>
                </div>
              );
            })}
          </div>
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
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4">問題セット</th>
                    <th className="pb-3 pr-4">科目</th>
                    <th className="pb-3 pr-4 text-right">価格</th>
                    <th className="pb-3 pr-4 text-right">購入数</th>
                    <th className="pb-3 pr-4 text-right">採点数</th>
                    <th className="pb-3 pr-4 text-right">売上</th>
                    <th className="pb-3 text-right">平均正答率</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {perSetStats.map((ps) => (
                    <tr key={ps.id}>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/sell/${ps.id}/edit`}
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
    </main>
  );
}
