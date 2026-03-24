"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Check, Infinity, AlertTriangle, X } from "lucide-react";
import { SUBSCRIPTION_TIERS } from "@toinoma/shared/constants";
import type { SubscriptionTier } from "@/types/database";

interface SubscriptionPlansProps {
  currentTier: SubscriptionTier;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  isLoggedIn: boolean;
}

export function SubscriptionPlans({
  currentTier,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  isLoggedIn,
}: SubscriptionPlansProps) {
  const router = useRouter();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [error, setError] = useState<string | null>(null);
  const [downgradeTarget, setDowngradeTarget] = useState<"basic" | "pro" | null>(null);

  // Tier ordering for downgrade detection
  const TIER_ORDER: Record<string, number> = { free: 0, basic: 1, pro: 2 };

  const isDowngrade = (targetTier: string): boolean => {
    return (TIER_ORDER[targetTier] ?? 0) < (TIER_ORDER[currentTier] ?? 0);
  };

  // Compute features the user will lose on downgrade
  const getLostFeatures = (targetTier: "basic" | "pro"): string[] => {
    const lost: string[] = [];
    const current = SUBSCRIPTION_TIERS[currentTier];
    const target = SUBSCRIPTION_TIERS[targetTier];

    if (current.gradingLimit === -1 && target.gradingLimit !== -1) {
      lost.push(`AI採点が無制限から月${target.gradingLimit}回に制限されます`);
    } else if (
      current.gradingLimit !== -1 &&
      target.gradingLimit !== -1 &&
      current.gradingLimit > target.gradingLimit
    ) {
      lost.push(
        `AI採点が月${current.gradingLimit}回から月${target.gradingLimit}回に減少します`
      );
    }

    if (current.collectionsLimit === -1 && target.collectionsLimit !== -1) {
      lost.push(
        `コレクションが無制限から${target.collectionsLimit}件に制限されます`
      );
    } else if (
      current.collectionsLimit !== -1 &&
      target.collectionsLimit !== -1 &&
      current.collectionsLimit > target.collectionsLimit
    ) {
      lost.push(
        `コレクションが${current.collectionsLimit}件から${target.collectionsLimit}件に減少します`
      );
    }

    if (currentTier === "pro" && targetTier === "basic") {
      lost.push("AI学習アシスタントが利用できなくなります");
      lost.push("優先サポートの対応レベルが変更されます");
    }

    return lost;
  };

  const handleSubscribe = async (tier: "basic" | "pro") => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setLoadingTier(tier);
    setError(null);

    const res = await fetch("/api/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier, interval }),
    });

    const data = await res.json();
    setLoadingTier(null);

    if (data.url) {
      window.location.assign(data.url);
    } else {
      setError(data.error ?? "サブスクリプションの作成に失敗しました");
    }
  };

  const handleCancel = async () => {
    if (!confirm("サブスクリプションをキャンセルしますか？現在の期間終了まで利用可能です。")) {
      return;
    }
    setLoadingTier("cancel");
    setError(null);

    const res = await fetch("/api/subscription", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });

    const data = await res.json();
    setLoadingTier(null);

    if (data.success) {
      router.refresh();
    } else {
      setError(data.error ?? "キャンセルに失敗しました");
    }
  };

  const handleResume = async () => {
    setLoadingTier("resume");
    setError(null);

    const res = await fetch("/api/subscription", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resume" }),
    });

    const data = await res.json();
    setLoadingTier(null);

    if (data.success) {
      router.refresh();
    } else {
      setError(data.error ?? "再開に失敗しました");
    }
  };

  const tiers = Object.entries(SUBSCRIPTION_TIERS) as [
    string,
    (typeof SUBSCRIPTION_TIERS)[keyof typeof SUBSCRIPTION_TIERS],
  ][];

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Interval toggle */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant={interval === "monthly" ? "default" : "outline"}
          size="sm"
          onClick={() => setInterval("monthly")}
        >
          月額
        </Button>
        <Button
          variant={interval === "annual" ? "default" : "outline"}
          size="sm"
          onClick={() => setInterval("annual")}
        >
          年額（2ヶ月分お得）
        </Button>
      </div>

      {/* Cancellation banner */}
      {cancelAtPeriodEnd && currentPeriodEnd && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-200">
          <p>
            サブスクリプションは{" "}
            <strong>
              {new Date(currentPeriodEnd).toLocaleDateString("ja-JP")}
            </strong>{" "}
            にキャンセルされます。
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={handleResume}
            disabled={loadingTier === "resume"}
          >
            {loadingTier === "resume" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            キャンセルを取り消す
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {tiers.map(([key, tier]) => {
          const isCurrent = key === currentTier;
          const price =
            interval === "annual" ? tier.annualPrice : tier.monthlyPrice;

          return (
            <Card
              key={key}
              className={
                isCurrent
                  ? "border-primary shadow-md"
                  : key === "pro"
                    ? "border-accent"
                    : ""
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{tier.label}</CardTitle>
                  {isCurrent && <Badge>現在のプラン</Badge>}
                  {key === "pro" && !isCurrent && (
                    <Badge variant="secondary">おすすめ</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-3xl font-bold">
                    {price === 0
                      ? "¥0"
                      : `¥${price.toLocaleString()}`}
                  </span>
                  {price > 0 && (
                    <span className="text-sm text-muted-foreground">
                      /{interval === "annual" ? "年" : "月"}
                    </span>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  {tier.description}
                </p>

                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    問題の閲覧・購入
                  </li>
                  <li className="flex items-center gap-2">
                    {tier.gradingLimit === -1 ? (
                      <Infinity className="h-4 w-4 text-primary" />
                    ) : (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                    AI採点{" "}
                    {tier.gradingLimit === -1
                      ? "無制限"
                      : `月${tier.gradingLimit}回`}
                  </li>
                  {key !== "free" && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      優先サポート
                    </li>
                  )}
                </ul>

                {key === "free" ? (
                  <Button variant="outline" disabled className="w-full">
                    {isCurrent ? "現在のプラン" : "デフォルト"}
                  </Button>
                ) : isCurrent ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleCancel}
                    disabled={
                      loadingTier === "cancel" || cancelAtPeriodEnd
                    }
                  >
                    {loadingTier === "cancel" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {cancelAtPeriodEnd
                      ? "キャンセル済み"
                      : "プランをキャンセル"}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => {
                      const targetTier = key as "basic" | "pro";
                      if (isDowngrade(targetTier)) {
                        setDowngradeTarget(targetTier);
                      } else {
                        handleSubscribe(targetTier);
                      }
                    }}
                    disabled={loadingTier !== null}
                  >
                    {loadingTier === key ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {currentTier !== "free"
                      ? isDowngrade(key)
                        ? "ダウングレード"
                        : "アップグレード"
                      : "申し込む"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Downgrade confirmation dialog */}
      <Dialog
        open={!!downgradeTarget}
        onOpenChange={(open) => !open && setDowngradeTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              プランのダウングレード
            </DialogTitle>
            <DialogDescription>
              {downgradeTarget &&
                `${SUBSCRIPTION_TIERS[currentTier].label}プランから${SUBSCRIPTION_TIERS[downgradeTarget].label}プランへダウングレードします。`}
            </DialogDescription>
          </DialogHeader>

          {downgradeTarget && (
            <div className="space-y-3">
              <div className="rounded-md border border-warning/30 bg-warning/5 p-4">
                <p className="mb-2 text-sm font-medium">
                  以下の機能が制限されます:
                </p>
                <ul className="space-y-1.5">
                  {getLostFeatures(downgradeTarget).map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-muted-foreground">
                ダウングレードは現在の請求期間の終了時に適用されます。期間終了まで現在のプランの機能をご利用いただけます。
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDowngradeTarget(null)}
              disabled={loadingTier !== null}
            >
              キャンセル
            </Button>
            <Button
              variant="default"
              onClick={() => {
                if (downgradeTarget) {
                  handleSubscribe(downgradeTarget);
                  setDowngradeTarget(null);
                }
              }}
              disabled={loadingTier !== null}
            >
              {loadingTier ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              ダウングレードする
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
