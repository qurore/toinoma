import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionState } from "@/lib/subscription";
import { SUBSCRIPTION_TIERS } from "@toinoma/shared/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Receipt,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "請求・お支払い - 問の間",
};

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch subscription state, purchases, and subscription record in parallel
  const [subState, purchasesResult, subRecordResult] = await Promise.all([
    getSubscriptionState(user.id),
    supabase
      .from("purchases")
      .select("id, amount_paid, created_at, problem_set_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_subscriptions")
      .select(
        "tier, interval, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end, status"
      )
      .eq("user_id", user.id)
      .single(),
  ]);

  const allPurchases = purchasesResult.data ?? [];
  const subRecord = subRecordResult.data;
  const tierConfig = SUBSCRIPTION_TIERS[subState.tier];

  // Fetch problem set titles for purchases
  const setIds = [...new Set(allPurchases.map((p) => p.problem_set_id))];
  const { data: sets } =
    setIds.length > 0
      ? await supabase
          .from("problem_sets")
          .select("id, title")
          .in("id", setIds)
      : { data: [] };

  const setMap = new Map((sets ?? []).map((s) => [s.id, s.title]));

  // Compute total spend
  const totalSpend = allPurchases.reduce(
    (sum, p) => sum + (p.amount_paid ?? 0),
    0
  );

  // Usage progress
  const isUnlimited = subState.gradingLimit === -1;
  const percentage = isUnlimited
    ? 0
    : Math.min(
        Math.round(
          (subState.gradingsUsedThisMonth / subState.gradingLimit) * 100
        ),
        100
      );

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">
        請求・お支払い
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        サブスクリプション情報と購入履歴を確認できます
      </p>

      <div className="space-y-6">
        {/* Subscription status card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                サブスクリプション
              </CardTitle>
              <Badge
                variant={subState.tier === "free" ? "secondary" : "default"}
              >
                {tierConfig.label}プラン
              </Badge>
            </div>
            <CardDescription>{tierConfig.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Usage bar */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">
                  AI採点の利用状況
                </span>
                <span className="font-semibold">
                  {subState.gradingsUsedThisMonth}
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    /{" "}
                    {isUnlimited
                      ? "無制限"
                      : `${subState.gradingLimit}回`}
                  </span>
                </span>
              </div>
              {!isUnlimited && (
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all",
                      percentage >= 100
                        ? "bg-destructive"
                        : percentage >= 80
                          ? "bg-warning"
                          : "bg-primary"
                    )}
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={subState.gradingsUsedThisMonth}
                    aria-valuemin={0}
                    aria-valuemax={subState.gradingLimit}
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Billing details grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  次の請求日
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {subState.currentPeriodEnd
                    ? new Date(
                        subState.currentPeriodEnd
                      ).toLocaleDateString("ja-JP")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  月額料金
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {tierConfig.monthlyPrice === 0
                    ? "無料"
                    : `¥${tierConfig.monthlyPrice.toLocaleString()}`}
                  {subRecord?.interval === "annual" && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      (年払い)
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ステータス</p>
                <p className="mt-1 text-sm font-semibold">
                  {subState.cancelAtPeriodEnd ? (
                    <Badge variant="outline" className="text-xs">
                      解約予約済み
                    </Badge>
                  ) : subState.tier === "free" ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      有効
                    </Badge>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">お支払い方法</p>
                <p className="mt-1 text-sm font-semibold">
                  {subRecord?.stripe_customer_id ? (
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                      Stripe経由
                    </span>
                  ) : (
                    <span className="text-muted-foreground">未設定</span>
                  )}
                </p>
              </div>
            </div>

            {/* Manage subscription link */}
            {subState.tier !== "free" && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  プランの変更・解約は
                  <a
                    href="/settings/subscription"
                    className="ml-1 text-primary underline-offset-4 hover:underline"
                  >
                    サブスクリプション設定
                  </a>
                  から行えます。
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Purchase history */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                購入履歴
              </CardTitle>
              {totalSpend > 0 && (
                <span className="text-sm text-muted-foreground">
                  合計: ¥{totalSpend.toLocaleString()}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {allPurchases.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                購入履歴がありません
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">日付</th>
                      <th className="pb-3 pr-4 font-medium">問題セット</th>
                      <th className="pb-3 text-right font-medium">金額</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {allPurchases.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/50">
                        <td className="py-3 pr-4 text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString(
                            "ja-JP"
                          )}
                        </td>
                        <td className="py-3 pr-4 font-medium">
                          {setMap.get(p.problem_set_id) ?? "—"}
                        </td>
                        <td className="py-3 text-right">
                          {p.amount_paid === 0 ? (
                            <Badge
                              variant="secondary"
                              className="text-xs"
                            >
                              無料
                            </Badge>
                          ) : (
                            `¥${p.amount_paid.toLocaleString()}`
                          )}
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
    </div>
  );
}
