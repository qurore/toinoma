import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { getSubscriptionState } from "@/lib/subscription";
import { getStripe } from "@/lib/stripe";
import { SUBSCRIPTION_TIERS } from "@toinoma/shared/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ManagePaymentButton } from "./manage-payment-button";
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

  // Fetch Stripe invoices for subscribed users
  let invoices: Array<{
    id: string;
    date: number;
    amount: number;
    status: string;
    url: string | null;
    description: string | null;
  }> = [];

  if (subRecord?.stripe_customer_id) {
    try {
      const stripe = getStripe();
      const stripeInvoices = await stripe.invoices.list({
        customer: subRecord.stripe_customer_id,
        limit: 12,
      });

      invoices = stripeInvoices.data.map((inv) => ({
        id: inv.id,
        date: inv.created,
        amount: inv.amount_paid ?? 0,
        status: inv.status ?? "unknown",
        url: inv.hosted_invoice_url ?? null,
        description:
          inv.lines.data[0]?.description ?? "サブスクリプション",
      }));
    } catch {
      // Non-critical: if Stripe API fails, show purchases only
      console.warn("[billing] Failed to fetch Stripe invoices");
    }
  }

  // Compute total spend
  const totalSpend = allPurchases.reduce(
    (sum, p) => sum + (p.amount_paid ?? 0),
    0
  );

  // Usage progress
  const isUnlimited = subState.gradingLimit === -1;
  const percentage = isUnlimited
    ? 0
    : subState.gradingLimit > 0
      ? Math.min(
          Math.round(
            (subState.gradingsUsedThisMonth / subState.gradingLimit) * 100
          ),
          100
        )
      : 0;

  // Compute next billing amount
  const nextBillingAmount =
    subState.tier === "free"
      ? null
      : subRecord?.interval === "annual"
        ? tierConfig.annualPrice
        : tierConfig.monthlyPrice;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "ホーム", href: "/" },
        { label: "設定", href: "/settings/profile" },
        { label: "請求情報" },
      ]} />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          請求・お支払い
        </h1>
        <p className="text-sm text-muted-foreground">
          サブスクリプション情報と購入履歴を確認できます
        </p>
      </div>

      <div className="space-y-6">
        {/* Subscription status card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-base">
                  現在のプラン
                </CardTitle>
                <CardDescription>{tierConfig.description}</CardDescription>
              </div>
              {/* Cancellation / active / past_due status */}
              {subState.tier !== "free" && (
                <span
                  className={cn(
                    "shrink-0 text-xs font-medium",
                    subState.cancelAtPeriodEnd
                      ? "text-amber-600"
                      : subState.status === "past_due"
                        ? "text-destructive"
                        : "text-success"
                  )}
                >
                  {subState.cancelAtPeriodEnd
                    ? "解約予約済み"
                    : subState.status === "past_due"
                      ? "支払い遅延"
                      : "有効"}
                </span>
              )}
            </div>

            {/* Prominent tier + price banner */}
            <div
              className={cn(
                "mt-3 flex items-center justify-between rounded-lg border p-4",
                subState.tier === "pro"
                  ? "border-primary/20 bg-primary/5"
                  : subState.tier === "basic"
                    ? "border-accent/20 bg-accent/5"
                    : "border-border bg-muted/50"
              )}
            >
              <div>
                <p className="text-lg font-bold tracking-tight">
                  {tierConfig.label}プラン
                </p>
                <p className="text-xs text-muted-foreground">
                  {subRecord?.interval === "annual" ? "年払い" : subState.tier === "free" ? "無料" : "月払い"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold tracking-tight">
                  {nextBillingAmount == null || nextBillingAmount === 0
                    ? "¥0"
                    : `¥${nextBillingAmount.toLocaleString()}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {subState.tier === "free"
                    ? ""
                    : subRecord?.interval === "annual"
                      ? "/ 年"
                      : "/ 月"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Usage bar */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">
                  AI採点の利用状況
                </span>
                {isUnlimited ? (
                  <span className="text-sm font-semibold text-primary">
                    無制限
                  </span>
                ) : (
                  <span className="font-semibold">
                    {subState.gradingsUsedThisMonth}
                    <span className="font-normal text-muted-foreground">
                      {" / "}
                      {subState.gradingLimit}回
                    </span>
                  </span>
                )}
              </div>
              {!isUnlimited ? (
                <>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-2.5 rounded-full transition-all duration-500",
                        percentage >= 100
                          ? "bg-destructive"
                          : percentage >= 80
                            ? "bg-warning"
                            : "bg-primary"
                      )}
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                      role="progressbar"
                      aria-valuenow={subState.gradingsUsedThisMonth}
                      aria-valuemin={0}
                      aria-valuemax={subState.gradingLimit}
                      aria-label="AI採点の利用状況"
                    />
                  </div>
                  <p
                    className={cn(
                      "text-xs",
                      percentage >= 100
                        ? "font-medium text-destructive"
                        : percentage >= 80
                          ? "font-medium text-amber-600"
                          : "text-muted-foreground"
                    )}
                  >
                    {percentage >= 100
                      ? "今月の利用上限に達しました。プランをアップグレードすると追加の採点が利用できます。"
                      : percentage >= 80
                        ? `残り${subState.gradingLimit - subState.gradingsUsedThisMonth}回 — 上限が近づいています`
                        : `残り${subState.gradingLimit - subState.gradingsUsedThisMonth}回 利用可能`}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  プロプランではAI採点を無制限にご利用いただけます
                </p>
              )}
            </div>

            <Separator />

            {/* Billing details grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  {subState.cancelAtPeriodEnd ? "プラン終了日" : "次の請求日"}
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {subState.currentPeriodEnd
                    ? new Date(subState.currentPeriodEnd).toLocaleDateString(
                        "ja-JP",
                        { year: "numeric", month: "long", day: "numeric" }
                      )
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  次回請求額
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {subState.cancelAtPeriodEnd
                    ? "—"
                    : nextBillingAmount == null || nextBillingAmount === 0
                      ? "¥0"
                      : `¥${nextBillingAmount.toLocaleString()}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  お支払い方法
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {subRecord?.stripe_customer_id
                    ? "Stripe経由"
                    : <span className="text-muted-foreground">未設定</span>}
                </p>
              </div>
            </div>

            {/* Manage subscription link + payment method */}
            {subState.tier !== "free" && (
              <>
                <Separator />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      プランの管理
                    </p>
                    <p className="text-xs text-muted-foreground">
                      プランの変更・解約は
                      <Link
                        href="/settings/subscription"
                        className="mx-0.5 text-primary underline-offset-4 hover:underline"
                      >
                        サブスクリプション設定
                      </Link>
                      から行えます。
                    </p>
                  </div>
                  {subRecord?.stripe_customer_id && (
                    <div className="flex flex-col items-start gap-1.5 sm:items-end">
                      <ManagePaymentButton />
                      <p className="text-[11px] leading-tight text-muted-foreground sm:text-right">
                        Stripeのポータルでカード情報の変更や
                        <br className="hidden sm:inline" />
                        領収書の確認ができます
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Invoice history (Stripe) */}
        {subState.tier !== "free" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                請求書
              </CardTitle>
              <CardDescription>
                サブスクリプションに関する請求書の一覧です
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    まだ請求書はありません
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    次の請求日に請求書が発行されます
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-3 pr-4 font-medium">日付</th>
                        <th className="pb-3 pr-4 font-medium">内容</th>
                        <th className="pb-3 pr-4 text-right font-medium">
                          金額
                        </th>
                        <th className="pb-3 text-center font-medium">
                          ステータス
                        </th>
                        <th className="pb-3 text-right font-medium" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {invoices.map((inv) => (
                        <tr
                          key={inv.id}
                          className="transition-colors hover:bg-muted/50"
                        >
                          <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                            {new Date(inv.date * 1000).toLocaleDateString(
                              "ja-JP",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </td>
                          <td className="py-3 pr-4 font-medium">
                            {inv.description}
                          </td>
                          <td className="whitespace-nowrap py-3 pr-4 text-right tabular-nums">
                            ¥{inv.amount.toLocaleString()}
                          </td>
                          <td className="py-3 text-center">
                            <span
                              className={cn(
                                "text-xs font-medium",
                                inv.status === "paid"
                                  ? "text-success"
                                  : inv.status === "open"
                                    ? "text-amber-600"
                                    : "text-destructive"
                              )}
                            >
                              {inv.status === "paid"
                                ? "支払い済み"
                                : inv.status === "open"
                                  ? "未払い"
                                  : inv.status === "void"
                                    ? "無効"
                                    : inv.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {inv.url && (
                              <a
                                href={inv.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/5 hover:underline"
                              >
                                表示
                              </a>
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
        )}

        {/* Purchase history */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  購入履歴
                </CardTitle>
                <CardDescription className="mt-1">
                  問題セットの購入履歴を確認できます
                </CardDescription>
              </div>
              {totalSpend > 0 && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">合計支払額</p>
                  <p className="text-sm font-bold tabular-nums">
                    ¥{totalSpend.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {allPurchases.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  購入履歴がありません
                </p>
                <Link
                  href="/explore"
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  問題セットを探す
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">日付</th>
                      <th className="pb-3 pr-4 font-medium">問題セット</th>
                      <th className="pb-3 text-right font-medium">金額</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {allPurchases.map((p) => (
                      <tr
                        key={p.id}
                        className="transition-colors hover:bg-muted/50"
                      >
                        <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString("ja-JP", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </td>
                        <td className="py-3 pr-4 font-medium">
                          <Link
                            href={`/problem/${p.problem_set_id}`}
                            className="transition-colors hover:text-primary hover:underline"
                          >
                            {setMap.get(p.problem_set_id) ?? "—"}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap py-3 text-right tabular-nums">
                          {p.amount_paid === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              無料
                            </span>
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
