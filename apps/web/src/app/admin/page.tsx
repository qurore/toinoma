import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理者ダッシュボード - 問の間",
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [usersResult, sellersResult, setsResult, purchasesResult, subsResult] =
    await Promise.all([
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
    ]);

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

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">
        管理者ダッシュボード
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard title="総ユーザー数" value={totalUsers} />
        <StatCard title="出品者数" value={totalSellers} />
        <StatCard title="公開中の問題セット" value={publishedSets} />
        <StatCard
          title="総売上"
          value={`¥${totalRevenue.toLocaleString()}`}
        />
        <StatCard title="有料サブスク" value={paidSubs} />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
