import Link from "next/link";
import { requireSellerTos } from "@/lib/auth/require-seller";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, CreditCard } from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "振込・収益 - 問の間",
};

export default async function PayoutsPage() {
  const { user, sellerProfile } = await requireSellerTos();
  const supabase = await createClient();

  // Fetch seller's total revenue
  const { data: problemSets } = await supabase
    .from("problem_sets")
    .select("id, price")
    .eq("seller_id", user.id);

  const sets = problemSets ?? [];
  const setIds = sets.map((s) => s.id);

  const { data: purchases } = setIds.length > 0
    ? await supabase
        .from("purchases")
        .select("id, amount_paid, created_at")
        .in("problem_set_id", setIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const allPurchases = purchases ?? [];
  const totalRevenue = allPurchases.reduce(
    (sum, p) => sum + (p.amount_paid ?? 0),
    0
  );
  const platformFee = Math.round(totalRevenue * 0.15);
  const sellerEarnings = totalRevenue - platformFee;

  const hasStripe = !!sellerProfile?.stripe_account_id;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={[
        { label: "ホーム", href: "/" },
        { label: "出品者ダッシュボード", href: "/seller" },
        { label: "振込・収益" },
      ]} />
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">振込・収益</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          売上の確認と振込設定の管理
        </p>
      </div>

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
            <p className="text-2xl font-bold text-muted-foreground">
              -¥{platformFee.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              出品者受取額
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              ¥{sellerEarnings.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {hasStripe ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">振込設定</CardTitle>
              <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                接続済み
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              振込はStripe Connectを通じて自動的に処理されます。
              振込スケジュールや口座情報の変更は、Stripeダッシュボードから行えます。
            </p>
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://connect.stripe.com/express_login"
                target="_blank"
                rel="noopener noreferrer"
              >
                Stripeダッシュボードを開く
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <CreditCard className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <h3 className="mb-1 text-base font-semibold">
              Stripe Connectの設定が必要です
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              有料問題セットの販売収益を受け取るには、Stripeアカウントの連携が必要です
            </p>
            <Button asChild>
              <Link href="/seller/onboarding?step=3">
                支払い設定を完了する
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent sales */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">直近の売上</CardTitle>
        </CardHeader>
        <CardContent>
          {allPurchases.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                まだ売上がありません
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                問題セットが購入されると、ここに売上履歴が表示されます
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">日付</th>
                    <th className="pb-3 pr-4 text-right font-medium">売上</th>
                    <th className="pb-3 text-right font-medium">手取り</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allPurchases.slice(0, 20).map((p) => (
                    <tr
                      key={p.id}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        ¥{p.amount_paid.toLocaleString()}
                      </td>
                      <td className="py-3 text-right font-medium text-primary">
                        ¥{Math.round(p.amount_paid * 0.85).toLocaleString()}
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
