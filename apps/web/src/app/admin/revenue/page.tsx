import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "売上レポート - 問の間",
};

export default async function AdminRevenuePage() {
  const supabase = await createClient();

  const { data: purchases } = await supabase
    .from("purchases")
    .select("id, amount_paid, created_at, problem_set_id")
    .order("created_at", { ascending: false });

  const allPurchases = purchases ?? [];

  const totalRevenue = allPurchases.reduce(
    (sum, p) => sum + (p.amount_paid ?? 0),
    0
  );
  const platformFees = Math.round(totalRevenue * 0.15);
  const stripeFees = allPurchases
    .filter((p) => p.amount_paid > 0)
    .reduce((sum) => sum + Math.round(sum * 0.036 + 40), 0);

  // Monthly breakdown
  const monthlyData: Record<string, { revenue: number; count: number }> = {};
  for (const p of allPurchases) {
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyData[key]) {
      monthlyData[key] = { revenue: 0, count: 0 };
    }
    monthlyData[key].revenue += p.amount_paid ?? 0;
    monthlyData[key].count += 1;
  }

  const months = Object.entries(monthlyData)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 12);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">売上レポート</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              総売上
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ¥{totalRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              プラットフォーム手数料 (15%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">
              ¥{platformFees.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              総取引数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{allPurchases.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">月別売上</CardTitle>
        </CardHeader>
        <CardContent>
          {months.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              売上データがありません
            </p>
          ) : (
            <div className="space-y-3">
              {months.map(([month, data]) => {
                const maxRevenue = Math.max(
                  ...months.map(([, d]) => d.revenue),
                  1
                );
                const widthPercent = (data.revenue / maxRevenue) * 100;

                return (
                  <div key={month} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-sm text-muted-foreground">
                      {month}
                    </span>
                    <div className="flex-1">
                      <div
                        className="h-6 rounded bg-primary transition-all"
                        style={{ width: `${Math.max(widthPercent, 2)}%` }}
                      />
                    </div>
                    <span className="w-32 shrink-0 text-right text-sm font-medium">
                      ¥{data.revenue.toLocaleString()} ({data.count}件)
                    </span>
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
