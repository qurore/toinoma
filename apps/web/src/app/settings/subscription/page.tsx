import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { getSubscriptionState } from "@/lib/subscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SUBSCRIPTION_TIERS } from "@toinoma/shared/constants";
import { SubscriptionPlans } from "@/components/subscription/subscription-plans";
import { ArrowRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "サブスクリプション設定 - 問の間",
  description: "現在のプランとAI採点の利用状況を確認します",
};

export default async function SubscriptionSettingsPage(props: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const subState = await getSubscriptionState(user.id);
  const searchParams = await props.searchParams;
  const tierConfig = SUBSCRIPTION_TIERS[subState.tier];

  // Detect manual override — surface a banner so the user understands why their
  // effective plan may differ from Stripe billing state.
  const { data: overrideRow } = await supabase
    .from("user_subscriptions")
    .select("manual_override_tier, tier")
    .eq("user_id", user.id)
    .maybeSingle();
  const hasManualOverride = overrideRow?.manual_override_tier != null;

  // Compute progress bar values (only meaningful for limited tiers)
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

  const barColor = cn(
    "h-2.5 rounded-full transition-all duration-500",
    percentage >= 100
      ? "bg-destructive"
      : percentage >= 80
        ? "bg-warning"
        : "bg-primary"
  );

  // Grace period warning
  const isInGracePeriod =
    subState.status === "past_due" && subState.gracePeriodEnd;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "ホーム", href: "/" },
        { label: "設定", href: "/settings/profile" },
        { label: "サブスクリプション" },
      ]} />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          サブスクリプション
        </h1>
        <p className="text-sm text-muted-foreground">
          現在のプランとAI採点の利用状況を確認します
        </p>
      </div>

      {/* Success / cancel banners */}
      {searchParams.success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          サブスクリプションが正常に開始されました。
        </div>
      )}

      {searchParams.canceled && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
          サブスクリプションの申し込みがキャンセルされました。
        </div>
      )}

      {/* Manual override banner */}
      {hasManualOverride && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-800 dark:bg-blue-950"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="space-y-1">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              管理者によりプランが設定されています
            </p>
            <p className="text-blue-800 dark:text-blue-200">
              請求情報と実際のプランが異なる場合があります。ご不明な点はお問い合わせください。
            </p>
            <Link
              href="/help/contact"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline dark:text-blue-300"
            >
              お問い合わせ
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Grace period warning */}
      {isInGracePeriod && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">
            お支払いに問題が発生しています
          </p>
          <p className="mt-1 text-muted-foreground">
            {new Date(subState.gracePeriodEnd!).toLocaleDateString("ja-JP")}
            までにお支払い方法を更新してください。
          </p>
          <Link
            href="/settings/billing"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            お支払い方法を更新
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Current plan status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              現在のプラン
            </CardTitle>
            <Badge
              variant={subState.tier === "free" ? "secondary" : "default"}
            >
              {tierConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* AI grading usage */}
          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">
                AI採点の利用
              </span>
              <span className="text-sm font-semibold">
                {subState.gradingsUsedThisMonth}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  / {isUnlimited ? "無制限" : `${subState.gradingLimit}回`}
                </span>
              </span>
            </div>

            {/* Visual progress bar (hidden for unlimited plans) */}
            {!isUnlimited && (
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={barColor}
                  style={{ width: `${percentage}%` }}
                  role="progressbar"
                  aria-valuenow={subState.gradingsUsedThisMonth}
                  aria-valuemin={0}
                  aria-valuemax={subState.gradingLimit}
                  aria-label="AI採点の利用状況"
                />
              </div>
            )}

            {!isUnlimited && percentage >= 80 && (
              <p
                className={cn(
                  "text-xs",
                  percentage >= 100 ? "text-destructive" : "text-warning"
                )}
              >
                {percentage >= 100
                  ? "今月のAI採点上限に達しました。プランをアップグレードしてください。"
                  : "今月のAI採点上限が近づいています。"}
              </p>
            )}
          </div>

          {/* Remaining + renewal */}
          <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">残り回数</p>
              <p className="text-base font-semibold">
                {isUnlimited ? "無制限" : `${subState.gradingsRemaining}回`}
              </p>
            </div>
            {subState.currentPeriodEnd && (
              <div>
                <p className="text-xs text-muted-foreground">次の更新日</p>
                <p className="text-base font-semibold">
                  {new Date(subState.currentPeriodEnd).toLocaleDateString(
                    "ja-JP"
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Quick link to billing */}
          {subState.tier !== "free" && (
            <div className="border-t border-border pt-4">
              <Link
                href="/settings/billing"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                請求・お支払い情報を管理
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature comparison table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            機能比較
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th scope="col" className="pb-3 pr-4 font-medium text-muted-foreground">
                    機能
                  </th>
                  <th scope="col" className="whitespace-nowrap pb-3 pr-4 text-center font-medium">
                    フリー
                    <span className="block text-xs font-normal text-muted-foreground">
                      ¥0
                    </span>
                  </th>
                  <th scope="col" className="whitespace-nowrap pb-3 pr-4 text-center font-medium">
                    ベーシック
                    <span className="block text-xs font-normal text-muted-foreground">
                      ¥498/月
                    </span>
                  </th>
                  <th scope="col" className="whitespace-nowrap pb-3 text-center font-medium">
                    プロ
                    <span className="block text-xs font-normal text-muted-foreground">
                      ¥1,980/月
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <FeatureRow
                  feature="AI採点回数"
                  free="3回/月"
                  basic="30回/月"
                  pro="無制限"
                />
                <FeatureRow
                  feature="優先採点"
                  free={false}
                  basic={true}
                  pro={true}
                />
                <FeatureRow
                  feature="AI学習アシスタント"
                  free={false}
                  basic={false}
                  pro={true}
                />
                <FeatureRow
                  feature="学習分析"
                  free={false}
                  basic={false}
                  pro={true}
                />
                <FeatureRow
                  feature="コレクション"
                  free="3個"
                  basic="20個"
                  pro="無制限"
                />
                <FeatureRow
                  feature="問題の閲覧・購入"
                  free={true}
                  basic={true}
                  pro={true}
                />
                <FeatureRow
                  feature="優先サポート"
                  free={false}
                  basic={true}
                  pro={true}
                />
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Plan selection */}
      <SubscriptionPlans
        currentTier={subState.tier}
        cancelAtPeriodEnd={subState.cancelAtPeriodEnd}
        currentPeriodEnd={subState.currentPeriodEnd}
        isLoggedIn={true}
      />
    </div>
  );
}

// ── Feature comparison row helper ────────────────────────────────────

function FeatureRow({
  feature,
  free,
  basic,
  pro,
}: {
  feature: string;
  free: boolean | string;
  basic: boolean | string;
  pro: boolean | string;
}) {
  const renderCell = (value: boolean | string) => {
    if (typeof value === "string") {
      return <span className="whitespace-nowrap text-sm font-medium">{value}</span>;
    }
    return value ? (
      <span className="text-sm text-primary" aria-label="対応">&#10003;</span>
    ) : (
      <span className="text-sm text-muted-foreground/40" aria-label="非対応">&mdash;</span>
    );
  };

  return (
    <tr>
      <th scope="row" className="py-3 pr-4 text-sm font-normal text-left">{feature}</th>
      <td className="py-3 pr-4 text-center">{renderCell(free)}</td>
      <td className="py-3 pr-4 text-center">{renderCell(basic)}</td>
      <td className="py-3 text-center">{renderCell(pro)}</td>
    </tr>
  );
}
