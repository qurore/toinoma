"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Infinity,
  AlertTriangle,
  X,
  Sparkles,
  BookOpen,
  BarChart3,
  Headphones,
  Zap,
  FolderOpen,
} from "lucide-react";
import { SUBSCRIPTION_TIERS } from "@toinoma/shared/constants";
import { cn } from "@/lib/utils";
import type { SubscriptionTier } from "@/types/database";

interface SubscriptionPlansProps {
  currentTier: SubscriptionTier;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  isLoggedIn: boolean;
}

// Tier ordering for upgrade/downgrade detection
const TIER_ORDER: Record<string, number> = { free: 0, basic: 1, pro: 2 };

// Per-tier feature lists with icons
const TIER_FEATURES: Record<
  string,
  Array<{ icon: React.ReactNode; label: string }>
> = {
  free: [
    {
      icon: <BookOpen className="h-4 w-4 text-primary" />,
      label: "問題の閲覧・購入",
    },
    {
      icon: <Zap className="h-4 w-4 text-primary" />,
      label: "AI採点 月3回",
    },
    {
      icon: <FolderOpen className="h-4 w-4 text-primary" />,
      label: "コレクション 3個",
    },
  ],
  basic: [
    {
      icon: <BookOpen className="h-4 w-4 text-primary" />,
      label: "問題の閲覧・購入",
    },
    {
      icon: <Zap className="h-4 w-4 text-primary" />,
      label: "AI採点 月30回",
    },
    {
      icon: <Sparkles className="h-4 w-4 text-primary" />,
      label: "優先採点",
    },
    {
      icon: <FolderOpen className="h-4 w-4 text-primary" />,
      label: "コレクション 20個",
    },
    {
      icon: <Headphones className="h-4 w-4 text-primary" />,
      label: "優先サポート",
    },
  ],
  pro: [
    {
      icon: <BookOpen className="h-4 w-4 text-primary" />,
      label: "問題の閲覧・購入",
    },
    {
      icon: <Infinity className="h-4 w-4 text-primary" />,
      label: "AI採点 無制限",
    },
    {
      icon: <Sparkles className="h-4 w-4 text-primary" />,
      label: "優先採点",
    },
    {
      icon: <BarChart3 className="h-4 w-4 text-primary" />,
      label: "AI学習アシスタント",
    },
    {
      icon: <BarChart3 className="h-4 w-4 text-primary" />,
      label: "学習分析",
    },
    {
      icon: <FolderOpen className="h-4 w-4 text-primary" />,
      label: "コレクション 無制限",
    },
    {
      icon: <Headphones className="h-4 w-4 text-primary" />,
      label: "優先サポート",
    },
  ],
};

export function SubscriptionPlans({
  currentTier,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  isLoggedIn,
}: SubscriptionPlansProps) {
  const router = useRouter();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downgradeTarget, setDowngradeTarget] = useState<
    "basic" | "pro" | null
  >(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const interval = isAnnual ? "annual" : "monthly";

  const isDowngrade = (targetTier: string): boolean => {
    return (TIER_ORDER[targetTier] ?? 0) < (TIER_ORDER[currentTier] ?? 0);
  };

  // Compute features the user will lose on downgrade
  const getLostFeatures = (targetTier: "basic" | "pro"): string[] => {
    const lost: string[] = [];
    const current = SUBSCRIPTION_TIERS[currentTier];
    const target = SUBSCRIPTION_TIERS[targetTier];

    if (current.gradingLimit === -1 && target.gradingLimit !== -1) {
      lost.push(
        `AI採点が無制限から月${target.gradingLimit}回に制限されます`
      );
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
      lost.push("学習分析が利用できなくなります");
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

    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, interval }),
      });

      const data = await res.json();
      setLoadingTier(null);

      if (data.url) {
        window.location.assign(data.url);
      } else if (data.success) {
        router.refresh();
      } else {
        setError(data.error ?? "サブスクリプションの作成に失敗しました");
      }
    } catch {
      setLoadingTier(null);
      setError("エラーが発生しました。もう一度お試しください。");
    }
  };

  const handleCancel = async () => {
    setLoadingTier("cancel");
    setError(null);
    setCancelDialogOpen(false);

    try {
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
    } catch {
      setLoadingTier(null);
      setError("エラーが発生しました。もう一度お試しください。");
    }
  };

  const handleResume = async () => {
    setLoadingTier("resume");
    setError(null);

    try {
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
    } catch {
      setLoadingTier(null);
      setError("エラーが発生しました。もう一度お試しください。");
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
      <div className="flex items-center justify-center gap-3">
        <Label
          htmlFor="billing-toggle"
          className={cn(
            "text-sm transition-colors",
            !isAnnual ? "font-semibold text-foreground" : "text-muted-foreground"
          )}
        >
          月額
        </Label>
        <Switch
          id="billing-toggle"
          checked={isAnnual}
          onCheckedChange={setIsAnnual}
        />
        <Label
          htmlFor="billing-toggle"
          className={cn(
            "text-sm transition-colors",
            isAnnual ? "font-semibold text-foreground" : "text-muted-foreground"
          )}
        >
          年額
          <Badge variant="secondary" className="ml-1.5 text-[10px]">
            お得
          </Badge>
        </Label>
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
          const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
          const features = TIER_FEATURES[key] ?? [];

          return (
            <Card
              key={key}
              className={cn(
                "relative flex flex-col",
                isCurrent
                  ? "border-primary shadow-md"
                  : key === "basic"
                    ? "border-accent"
                    : ""
              )}
            >
              {/* "Most popular" badge */}
              {key === "basic" && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground shadow-sm">
                    一番人気
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{tier.label}</CardTitle>
                  {isCurrent && (
                    <Badge variant="outline">現在のプラン</Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col space-y-4">
                {/* Price */}
                <div>
                  <span className="text-3xl font-bold">
                    {price === 0
                      ? "¥0"
                      : `¥${price.toLocaleString()}`}
                  </span>
                  {price > 0 && (
                    <span className="text-sm text-muted-foreground">
                      /{isAnnual ? "年" : "月"}
                    </span>
                  )}
                  {isAnnual && key !== "free" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      月あたり ¥
                      {Math.round(price / 12).toLocaleString()}
                    </p>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  {tier.description}
                </p>

                {/* Feature list */}
                <ul className="flex-1 space-y-2.5 text-sm">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      {feature.icon}
                      {feature.label}
                    </li>
                  ))}
                </ul>

                {/* Action button — text never changes based on loading state */}
                <div className="pt-2">
                  {key === "free" ? (
                    <Button variant="outline" disabled className="w-full">
                      {isCurrent ? "現在のプラン" : "デフォルト"}
                    </Button>
                  ) : isCurrent ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setCancelDialogOpen(true)}
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
                      className={cn(
                        "w-full",
                        key === "basic" && !isCurrent && "shadow-sm"
                      )}
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
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cancel confirmation dialog (with retention offer) */}
      <Dialog
        open={cancelDialogOpen}
        onOpenChange={(open) => !open && setCancelDialogOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              サブスクリプションのキャンセル
            </DialogTitle>
            <DialogDescription>
              キャンセルすると、現在の請求期間の終了後にフリープランに戻ります。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* What the user will lose */}
            <div className="rounded-md border border-warning/30 bg-warning/5 p-4">
              <p className="mb-2 text-sm font-medium">
                キャンセルにより失われる機能:
              </p>
              <ul className="space-y-1.5">
                {currentTier !== "free" &&
                  getLostFeatures("free" as "basic" | "pro").length === 0 ? (
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                      現在のプランの全機能が利用できなくなります
                    </li>
                  ) : null}
                {currentTier === "basic" && (
                  <>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                      AI採点が月30回から月3回に制限されます
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                      コレクションが20個から3個に制限されます
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                      優先サポートが利用できなくなります
                    </li>
                  </>
                )}
                {currentTier === "pro" && (
                  <>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                      AI採点が無制限から月3回に制限されます
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                      AI学習アシスタントが利用できなくなります
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                      学習分析が利用できなくなります
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                      コレクションが無制限から3個に制限されます
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Retention offer: suggest downgrade instead */}
            {currentTier === "pro" && (
              <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                <p className="mb-2 text-sm font-medium text-primary">
                  ベーシックプランへのダウングレードはいかがですか？
                </p>
                <p className="text-xs text-muted-foreground">
                  月¥500で、AI採点月30回・優先サポートを引き続きご利用いただけます。
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setCancelDialogOpen(false);
                    setDowngradeTarget("basic");
                  }}
                >
                  ベーシックにダウングレード
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {currentPeriodEnd
                ? `キャンセルしても ${new Date(currentPeriodEnd).toLocaleDateString("ja-JP")} まで現在のプランをご利用いただけます。`
                : "キャンセルは現在の請求期間の終了時に適用されます。"}
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={loadingTier !== null}
            >
              戻る
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={loadingTier !== null}
            >
              {loadingTier === "cancel" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              キャンセルする
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
