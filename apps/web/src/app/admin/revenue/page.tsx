import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUBJECT_LABELS } from "@toinoma/shared/constants";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Users,
} from "lucide-react";
import { RevenueFilters } from "./revenue-filters";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "売上レポート - 問の間",
};

// Type for serialized revenue data passed to client
export interface RevenueBySellerRow {
  seller_id: string;
  seller_name: string;
  total_revenue: number;
  transaction_count: number;
}

export interface RevenueBySubjectRow {
  subject: string;
  label: string;
  total_revenue: number;
  transaction_count: number;
}

export interface MonthlyDataRow {
  period: string;
  revenue: number;
  count: number;
}

function formatJpy(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export default async function AdminRevenuePage(props: {
  searchParams: Promise<{
    start?: string;
    end?: string;
    view?: string;
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
  const startDate = searchParams.start ?? "";
  const endDate = searchParams.end ?? "";
  const viewMode = searchParams.view === "daily" ? "daily" : "monthly";

  const admin = createAdminClient();

  // Build purchase query with date filters
  let purchaseQuery = admin
    .from("purchases")
    .select("id, amount_paid, created_at, problem_set_id")
    .order("created_at", { ascending: false });

  if (startDate) {
    purchaseQuery = purchaseQuery.gte("created_at", `${startDate}T00:00:00`);
  }
  if (endDate) {
    purchaseQuery = purchaseQuery.lte("created_at", `${endDate}T23:59:59`);
  }

  const { data: purchases } = await purchaseQuery;
  const allPurchases = purchases ?? [];

  // Summary calculations
  const totalRevenue = allPurchases.reduce(
    (sum, p) => sum + (p.amount_paid ?? 0),
    0
  );
  const platformFees = Math.round(totalRevenue * 0.15);

  // FIX: Stripe fee calculated per-transaction, not as running sum
  const stripeFees = allPurchases
    .filter((p) => p.amount_paid > 0)
    .reduce(
      (sum, p) => sum + Math.round(p.amount_paid * 0.036 + 40),
      0
    );

  // Fetch problem set details for breakdowns
  const setIds = [
    ...new Set(allPurchases.map((p) => p.problem_set_id)),
  ];
  const { data: problemSets } =
    setIds.length > 0
      ? await admin
          .from("problem_sets")
          .select("id, title, seller_id, subject")
          .in("id", setIds)
      : { data: [] };

  const psMap = new Map(
    (problemSets ?? []).map((ps) => [ps.id, ps])
  );

  // Revenue by seller
  const sellerRevenues = new Map<
    string,
    { total: number; count: number }
  >();
  for (const p of allPurchases) {
    const ps = psMap.get(p.problem_set_id);
    if (!ps) continue;
    const existing = sellerRevenues.get(ps.seller_id) ?? {
      total: 0,
      count: 0,
    };
    existing.total += p.amount_paid ?? 0;
    existing.count += 1;
    sellerRevenues.set(ps.seller_id, existing);
  }

  // Fetch seller names
  const sellerIds = [...sellerRevenues.keys()];
  const { data: sellers } =
    sellerIds.length > 0
      ? await admin
          .from("seller_profiles")
          .select("id, seller_display_name")
          .in("id", sellerIds)
      : { data: [] };
  const sellerNameMap = new Map(
    (sellers ?? []).map((s) => [s.id, s.seller_display_name])
  );

  const revenueBySellerRows: RevenueBySellerRow[] = [...sellerRevenues]
    .map(([sid, data]) => ({
      seller_id: sid,
      seller_name: sellerNameMap.get(sid) ?? "不明",
      total_revenue: data.total,
      transaction_count: data.count,
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue);

  // Revenue by subject
  const subjectRevenues = new Map<
    string,
    { total: number; count: number }
  >();
  for (const p of allPurchases) {
    const ps = psMap.get(p.problem_set_id);
    if (!ps) continue;
    const existing = subjectRevenues.get(ps.subject) ?? {
      total: 0,
      count: 0,
    };
    existing.total += p.amount_paid ?? 0;
    existing.count += 1;
    subjectRevenues.set(ps.subject, existing);
  }

  const revenueBySubjectRows: RevenueBySubjectRow[] = [
    ...subjectRevenues,
  ]
    .map(([subject, data]) => ({
      subject,
      label:
        (SUBJECT_LABELS as Record<string, string>)[subject] ?? subject,
      total_revenue: data.total,
      transaction_count: data.count,
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue);

  // Time series breakdown (monthly or daily)
  const timeSeriesData: Record<
    string,
    { revenue: number; count: number }
  > = {};
  for (const p of allPurchases) {
    const d = new Date(p.created_at);
    const key =
      viewMode === "daily"
        ? `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
        : `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!timeSeriesData[key]) {
      timeSeriesData[key] = { revenue: 0, count: 0 };
    }
    timeSeriesData[key].revenue += p.amount_paid ?? 0;
    timeSeriesData[key].count += 1;
  }

  const timeSeriesRows: MonthlyDataRow[] = Object.entries(timeSeriesData)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, viewMode === "daily" ? 60 : 12)
    .map(([period, data]) => ({
      period,
      revenue: data.revenue,
      count: data.count,
    }));

  // CSV data for export
  const csvRows = [
    ["日付", "問題セットID", "金額"],
    ...allPurchases.map((p) => [
      new Date(p.created_at).toLocaleDateString("ja-JP"),
      p.problem_set_id,
      String(p.amount_paid),
    ]),
  ];
  const csvContent = csvRows.map((row) => row.join(",")).join("\n");

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            売上レポート
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {allPurchases.length}件の取引
          </p>
        </div>
      </div>

      {/* Filters + CSV export */}
      <RevenueFilters
        startDate={startDate}
        endDate={endDate}
        viewMode={viewMode}
        csvContent={csvContent}
      />

      {/* Summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              総売上
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatJpy(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              プラットフォーム手数料 (15%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {formatJpy(platformFees)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5" />
              Stripe手数料 (3.6% + 40円)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">
              {formatJpy(stripeFees)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              総取引数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{allPurchases.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue by subject */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">科目別売上</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueBySubjectRows.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                データなし
              </p>
            ) : (
              <div className="space-y-3">
                {revenueBySubjectRows.map((row) => {
                  const maxRev = Math.max(
                    ...revenueBySubjectRows.map((r) => r.total_revenue),
                    1
                  );
                  const pct = (row.total_revenue / maxRev) * 100;

                  return (
                    <div key={row.subject}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{row.label}</span>
                        <span className="text-muted-foreground">
                          {formatJpy(row.total_revenue)} ({row.transaction_count}
                          件)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary transition-all"
                          style={{
                            width: `${Math.max(pct, 2)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue by seller */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">出品者別売上</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueBySellerRows.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                データなし
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">出品者</th>
                      <th className="pb-2 pr-3 text-right font-medium">
                        売上
                      </th>
                      <th className="pb-2 text-right font-medium">
                        取引数
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {revenueBySellerRows.slice(0, 20).map((row) => (
                      <tr key={row.seller_id} className="hover:bg-muted/50">
                        <td className="py-2.5 pr-3 font-medium">
                          {row.seller_name}
                        </td>
                        <td className="py-2.5 pr-3 text-right">
                          {formatJpy(row.total_revenue)}
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground">
                          {row.transaction_count}件
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

      {/* Time series chart */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {viewMode === "daily" ? "日別" : "月別"}売上推移
            </CardTitle>
            {timeSeriesRows.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                直近{timeSeriesRows.length}
                {viewMode === "daily" ? "日" : "ヶ月"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {timeSeriesRows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              売上データがありません
            </p>
          ) : (
            <div className="space-y-2">
              {timeSeriesRows.map((row) => {
                const maxRevenue = Math.max(
                  ...timeSeriesRows.map((r) => r.revenue),
                  1
                );
                const widthPercent = (row.revenue / maxRevenue) * 100;

                return (
                  <div key={row.period} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-sm text-muted-foreground">
                      {row.period}
                    </span>
                    <div className="flex-1">
                      <div
                        className="h-6 rounded bg-primary transition-all"
                        style={{
                          width: `${Math.max(widthPercent, 2)}%`,
                        }}
                      />
                    </div>
                    <span className="w-40 shrink-0 text-right text-sm font-medium">
                      {formatJpy(row.revenue)} ({row.count}件)
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
