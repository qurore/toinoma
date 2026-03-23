import Link from "next/link";
import { requireSellerTos } from "@/lib/auth/require-seller";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "振込履歴 - 問の間",
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
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sell">
            <ArrowLeft className="mr-1 h-4 w-4" />
            ダッシュボード
          </Link>
        </Button>
      </div>

      <h1 className="mb-6 text-2xl font-bold tracking-tight">振込・収益</h1>

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
            <p className="text-2xl font-bold text-success">
              ¥{sellerEarnings.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {hasStripe ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">振込設定</CardTitle>
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
        <Card>
          <CardContent className="py-8 text-center">
            <p className="mb-4 text-muted-foreground">
              振込を受け取るには、Stripe Connectの設定が必要です
            </p>
            <Button asChild>
              <Link href="/sell/onboarding">支払い設定を完了する</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent sales */}
      {allPurchases.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">直近の売上</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4">日付</th>
                    <th className="pb-3 pr-4 text-right">売上</th>
                    <th className="pb-3 text-right">手取り</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allPurchases.slice(0, 20).map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        ¥{p.amount_paid.toLocaleString()}
                      </td>
                      <td className="py-3 text-right font-medium text-success">
                        ¥{Math.round(p.amount_paid * 0.85).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
