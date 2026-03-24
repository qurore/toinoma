import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionState } from "@/lib/subscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SUBSCRIPTION_TIERS } from "@toinoma/shared/constants";
import { SubscriptionPlans } from "@/components/subscription/subscription-plans";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "サブスクリプション設定",
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

  // Compute progress bar values (only meaningful for limited tiers)
  const isUnlimited = subState.gradingLimit === -1;
  const percentage = isUnlimited
    ? 0
    : Math.min(Math.round((subState.gradingsUsedThisMonth / subState.gradingLimit) * 100), 100);

  const barColor = cn(
    "h-2 rounded-full transition-all",
    percentage >= 100
      ? "bg-destructive"
      : percentage >= 80
        ? "bg-warning"
        : "bg-primary"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">サブスクリプション</h1>
        <p className="text-sm text-muted-foreground">
          現在のプランとAI採点の利用状況を確認します
        </p>
      </div>

      {searchParams.success && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          サブスクリプションが正常に開始されました。
        </div>
      )}

      {searchParams.canceled && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
          サブスクリプションの申し込みがキャンセルされました。
        </div>
      )}

      {/* Current plan status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              現在のプラン
            </CardTitle>
            <Badge variant={subState.tier === "free" ? "secondary" : "default"}>
              {tierConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* AI grading usage */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">AI採点の利用</span>
              <span className="text-sm font-semibold">
                {subState.gradingsUsedThisMonth}
                <span className="font-normal text-muted-foreground">
                  {" "}/ {isUnlimited ? "無制限" : `${subState.gradingLimit}回`}
                </span>
              </span>
            </div>

            {/* Visual progress bar (hidden for unlimited plans) */}
            {!isUnlimited && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={barColor}
                  style={{ width: `${percentage}%` }}
                  role="progressbar"
                  aria-valuenow={subState.gradingsUsedThisMonth}
                  aria-valuemin={0}
                  aria-valuemax={subState.gradingLimit}
                />
              </div>
            )}

            {!isUnlimited && percentage >= 80 && (
              <p className="text-xs text-warning">
                {percentage >= 100
                  ? "今月のAI採点上限に達しました。プランをアップグレードしてください。"
                  : "今月のAI採点上限が近づいています。"}
              </p>
            )}
          </div>

          {/* Remaining + renewal */}
          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
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
                  {new Date(subState.currentPeriodEnd).toLocaleDateString("ja-JP")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature comparison table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            機能比較
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">機能</th>
                  <th className="pb-3 pr-4 text-center font-medium">フリー</th>
                  <th className="pb-3 pr-4 text-center font-medium">
                    ベーシック
                    <span className="block text-xs font-normal text-muted-foreground">¥500/月</span>
                  </th>
                  <th className="pb-3 text-center font-medium">
                    プロ
                    <span className="block text-xs font-normal text-muted-foreground">¥2,000/月</span>
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

// Feature comparison row helper
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
      return <span className="text-sm font-medium">{value}</span>;
    }
    return value ? (
      <Check className="mx-auto h-4 w-4 text-primary" />
    ) : (
      <X className="mx-auto h-4 w-4 text-muted-foreground/40" />
    );
  };

  return (
    <tr>
      <td className="py-3 pr-4 text-sm">{feature}</td>
      <td className="py-3 pr-4 text-center">{renderCell(free)}</td>
      <td className="py-3 pr-4 text-center">{renderCell(basic)}</td>
      <td className="py-3 text-center">{renderCell(pro)}</td>
    </tr>
  );
}
