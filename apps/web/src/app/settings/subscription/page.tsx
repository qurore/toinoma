import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionState } from "@/lib/subscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { SUBSCRIPTION_TIERS } from "@toinoma/shared/constants";
import { SubscriptionPlans } from "@/components/subscription/subscription-plans";

export default async function SubscriptionPage(props: {
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

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <ArrowLeft className="mr-1 h-4 w-4" />
            アカウント設定
          </Link>
        </Button>
      </div>

      <h1 className="mb-6 text-2xl font-bold tracking-tight">
        サブスクリプション管理
      </h1>

      {searchParams.success && (
        <div className="mb-6 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800 dark:border-green-700 dark:bg-green-950 dark:text-green-200">
          サブスクリプションが正常に開始されました。
        </div>
      )}

      {searchParams.canceled && (
        <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-200">
          サブスクリプションの申し込みがキャンセルされました。
        </div>
      )}

      <div className="space-y-6">
        {/* Current plan card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">現在のプラン</CardTitle>
              <Badge>{tierConfig.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">AI採点の利用</p>
                <p className="text-lg font-semibold">
                  {subState.gradingsUsedThisMonth}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    /{" "}
                    {subState.gradingLimit === -1
                      ? "無制限"
                      : `${subState.gradingLimit}回`}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">残り回数</p>
                <p className="text-lg font-semibold">
                  {subState.gradingLimit === -1
                    ? "無制限"
                    : `${subState.gradingsRemaining}回`}
                </p>
              </div>
              {subState.currentPeriodEnd && (
                <div>
                  <p className="text-sm text-muted-foreground">次の更新日</p>
                  <p className="text-lg font-semibold">
                    {new Date(subState.currentPeriodEnd).toLocaleDateString(
                      "ja-JP"
                    )}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plan selection */}
        <SubscriptionPlans
          currentTier={subState.tier}
          cancelAtPeriodEnd={subState.cancelAtPeriodEnd}
          currentPeriodEnd={subState.currentPeriodEnd}
          isLoggedIn={true}
        />
      </div>
    </main>
  );
}
