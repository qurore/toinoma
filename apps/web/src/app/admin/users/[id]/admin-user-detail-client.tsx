"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  Loader2,
  Plus,
  Minus,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDateShort, formatRelativeTime } from "@toinoma/shared";
import {
  setSubscriptionOverride,
  creditAiUsage,
  deductAiUsage,
  resetAiUsage,
} from "./actions";
import type { Database, SubscriptionTier } from "@/types/database";

type Subscription =
  Database["public"]["Tables"]["user_subscriptions"]["Row"];
type Profile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  | "id"
  | "display_name"
  | "avatar_url"
  | "created_at"
  | "banned_at"
  | "suspended_until"
  | "ban_reason"
>;
type SellerProfile = Pick<
  Database["public"]["Tables"]["seller_profiles"]["Row"],
  | "id"
  | "seller_display_name"
  | "university"
  | "circle_name"
  | "tos_accepted_at"
  | "stripe_account_id"
  | "created_at"
>;

type PurchaseRow = {
  id: string;
  problem_set_id: string;
  amount_paid: number;
  created_at: string;
  problem_sets: { title: string | null } | null;
};

type SubmissionRow = {
  id: string;
  problem_set_id: string;
  score: number | null;
  max_score: number | null;
  created_at: string;
};

type HistoryRow =
  Database["public"]["Tables"]["admin_audit_logs"]["Row"];

interface Props {
  profile: Profile;
  sellerProfile: SellerProfile | null;
  subscription: Subscription | null;
  resolvedTier: SubscriptionTier;
  overrideMismatch: boolean;
  currentBalanceTokens: number;
  organicConsumedTokens: number;
  purchases: PurchaseRow[];
  submissions: SubmissionRow[];
  history: HistoryRow[];
  adminNameMap: Record<string, string | null>;
}

const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: "フリー",
  basic: "ベーシック",
  pro: "プロ",
};

const ACTION_LABELS: Record<string, string> = {
  user_banned: "BAN",
  user_unbanned: "BAN解除",
  user_warned: "警告",
  user_suspended: "一時停止",
  subscription_tier_overridden: "プランオーバーライド",
  ai_usage_credited: "トークン付与",
  ai_usage_deducted: "トークン減算",
  ai_usage_reset: "使用量リセット",
};

const ACTION_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  user_banned: "destructive",
  user_unbanned: "secondary",
  user_warned: "default",
  user_suspended: "destructive",
  subscription_tier_overridden: "default",
  ai_usage_credited: "secondary",
  ai_usage_deducted: "destructive",
  ai_usage_reset: "outline",
};

const REASON_QUICK_FILLS = [
  "VIP対応",
  "決済不具合の補填",
  "サポート補填",
  "キャンペーン特典",
  "テスト用",
];

type AdjustMode = "credit" | "deduct" | "reset";

export function AdminUserDetailClient({
  profile,
  sellerProfile,
  subscription,
  resolvedTier,
  overrideMismatch,
  currentBalanceTokens,
  organicConsumedTokens,
  purchases,
  submissions,
  history,
  adminNameMap,
}: Props) {
  const router = useRouter();

  // Override dialog state
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [overrideTier, setOverrideTier] = useState<SubscriptionTier | "clear">(
    resolvedTier
  );
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideNotify, setOverrideNotify] = useState(true);
  const [overridePending, setOverridePending] = useState(false);
  const [overrideConflict, setOverrideConflict] = useState<string | null>(null);

  // Adjust dialog state
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustMode, setAdjustMode] = useState<AdjustMode>("credit");
  const [adjustTokens, setAdjustTokens] = useState("1000");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustNotify, setAdjustNotify] = useState(false);
  const [adjustPending, setAdjustPending] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  function openOverrideDialog() {
    setOverrideTier(resolvedTier);
    setOverrideReason("");
    setOverrideNotify(true);
    setOverrideConflict(null);
    setOverrideDialogOpen(true);
  }

  function openAdjustDialog(mode: AdjustMode) {
    setAdjustMode(mode);
    setAdjustTokens(mode === "reset" ? "0" : "1000");
    setAdjustReason("");
    setAdjustNotify(false);
    setAdjustError(null);
    setAdjustDialogOpen(true);
  }

  async function submitOverride() {
    if (!subscription) return;
    if (overrideReason.trim().length < 10) {
      toast.error("理由は10文字以上で入力してください");
      return;
    }
    setOverridePending(true);
    setOverrideConflict(null);
    const result = await setSubscriptionOverride({
      userId: profile.id,
      tier: overrideTier === "clear" ? null : overrideTier,
      reason: overrideReason,
      expectedVersion: subscription.version,
      notifyUser: overrideNotify,
    });
    setOverridePending(false);

    if ("success" in result) {
      toast.success("プランのオーバーライドを適用しました");
      setOverrideDialogOpen(false);
      router.refresh();
      return;
    }

    if (result.error === "CONFLICT") {
      setOverrideConflict(result.message);
      router.refresh();
      return;
    }

    if (result.error === "RATE_LIMITED") {
      toast.error(result.message);
      return;
    }

    toast.error(result.message);
  }

  async function submitAdjust() {
    if (adjustReason.trim().length < 10) {
      toast.error("理由は10文字以上で入力してください");
      return;
    }
    setAdjustPending(true);
    setAdjustError(null);

    const tokens = parseInt(adjustTokens, 10) || 0;
    let result;
    if (adjustMode === "credit") {
      result = await creditAiUsage({
        userId: profile.id,
        tokens,
        reason: adjustReason,
        notifyUser: adjustNotify,
      });
    } else if (adjustMode === "deduct") {
      result = await deductAiUsage({
        userId: profile.id,
        tokens,
        reason: adjustReason,
        notifyUser: adjustNotify,
      });
    } else {
      result = await resetAiUsage({
        userId: profile.id,
        reason: adjustReason,
        notifyUser: adjustNotify,
      });
    }
    setAdjustPending(false);

    if ("success" in result) {
      const verbs = {
        credit: "付与",
        deduct: "減算",
        reset: "リセット",
      } as const;
      toast.success(`使用量を${verbs[adjustMode]}しました`);
      setAdjustDialogOpen(false);
      router.refresh();
      return;
    }

    if (result.error === "INSUFFICIENT_BALANCE") {
      setAdjustError(result.message);
      return;
    }

    if (result.error === "RATE_LIMITED") {
      toast.error(result.message);
      return;
    }

    toast.error(result.message);
  }

  const initials = (profile.display_name ?? "?").slice(0, 2).toUpperCase();
  const userStatus = profile.banned_at
    ? { label: "BAN", variant: "destructive" as const }
    : profile.suspended_until && new Date(profile.suspended_until) > new Date()
      ? { label: "停止中", variant: "default" as const }
      : { label: "有効", variant: "secondary" as const };

  return (
    <TooltipProvider>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">ユーザー詳細</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ユーザーIDで管理操作を実行・履歴を確認します
        </p>
      </div>

      {/* Override warning banner (admin variant) */}
      {subscription?.manual_override_tier && (
        <Card
          role="alert"
          className="mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/30"
        >
          <CardContent className="flex items-start gap-3 py-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-amber-900 dark:text-amber-100">
                手動オーバーライドが有効です
              </p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                {overrideMismatch
                  ? `Stripeでは${TIER_LABELS[subscription.tier]}プランが請求中ですが、現在は${TIER_LABELS[subscription.manual_override_tier]}に上書きされています。`
                  : `現在${TIER_LABELS[subscription.manual_override_tier]}に上書きされています。`}
              </p>
              {subscription.manual_override_at && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                  {formatRelativeTime(subscription.manual_override_at)}に設定
                </p>
              )}
              {subscription.manual_override_reason && (
                <p className="mt-1 line-clamp-2 text-xs text-amber-700 dark:text-amber-300">
                  理由: {subscription.manual_override_reason}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN — Profile + Seller */}
        <div className="space-y-6">
          {/* Profile section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">プロフィール</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profile.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {profile.display_name ?? "—"}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {profile.id}
                  </p>
                </div>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">ステータス</dt>
                  <dd>
                    <Badge variant={userStatus.variant}>{userStatus.label}</Badge>
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">登録日</dt>
                  <dd>{formatDateShort(profile.created_at)}</dd>
                </div>
                {profile.ban_reason && (
                  <div>
                    <dt className="text-muted-foreground">制裁理由</dt>
                    <dd className="mt-1 text-xs">{profile.ban_reason}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Seller profile (if seller) */}
          {sellerProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">出品者プロフィール</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">出品者名</dt>
                    <dd>{sellerProfile.seller_display_name ?? "—"}</dd>
                  </div>
                  {sellerProfile.university && (
                    <div>
                      <dt className="text-muted-foreground">大学</dt>
                      <dd>{sellerProfile.university}</dd>
                    </div>
                  )}
                  {sellerProfile.circle_name && (
                    <div>
                      <dt className="text-muted-foreground">サークル</dt>
                      <dd>{sellerProfile.circle_name}</dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">ToS同意</dt>
                    <dd>
                      {sellerProfile.tos_accepted_at ? (
                        <Badge variant="secondary">承諾済み</Badge>
                      ) : (
                        <Badge variant="outline">未承諾</Badge>
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Stripe Connect</dt>
                    <dd>
                      {sellerProfile.stripe_account_id ? (
                        <Badge variant="secondary">連携済み</Badge>
                      ) : (
                        <Badge variant="outline">未連携</Badge>
                      )}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}
        </div>

        {/* MIDDLE + RIGHT COLUMNS — Subscription, AI Usage, History */}
        <div className="space-y-6 lg:col-span-2">
          {/* Subscription */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">サブスクリプション</CardTitle>
                <CardDescription>
                  Stripeと手動オーバーライドの状態
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={openOverrideDialog}
                disabled={!subscription}
              >
                プランを変更
              </Button>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">効果的なプラン</dt>
                  <dd className="mt-1">
                    <Badge
                      variant={
                        resolvedTier === "pro"
                          ? "default"
                          : resolvedTier === "basic"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-sm"
                    >
                      {TIER_LABELS[resolvedTier]}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Stripeプラン</dt>
                  <dd className="mt-1">
                    <Badge variant="outline" className="text-sm">
                      {TIER_LABELS[subscription?.tier ?? "free"]}
                    </Badge>
                  </dd>
                </div>
                {subscription?.interval && (
                  <div>
                    <dt className="text-muted-foreground">請求間隔</dt>
                    <dd className="mt-1">
                      {subscription.interval === "monthly" ? "月額" : "年額"}
                    </dd>
                  </div>
                )}
                {subscription?.status && (
                  <div>
                    <dt className="text-muted-foreground">ステータス</dt>
                    <dd className="mt-1">{subscription.status}</dd>
                  </div>
                )}
                {subscription?.current_period_end && (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">現在の請求期間</dt>
                    <dd className="mt-1 text-xs">
                      {subscription.current_period_start &&
                        formatDateShort(subscription.current_period_start)}{" "}
                      〜 {formatDateShort(subscription.current_period_end)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground">バージョン</dt>
                  <dd className="mt-1 font-mono text-xs">
                    v{subscription?.version ?? 1}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* AI Usage */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">AI 使用量</CardTitle>
                <CardDescription>今月の使用量と調整</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAdjustDialog("credit")}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  付与
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAdjustDialog("deduct")}
                >
                  <Minus className="mr-1 h-3 w-3" />
                  減算
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAdjustDialog("reset")}
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  リセット
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">現在の残高</dt>
                  <dd className="mt-1 text-2xl font-bold">
                    {currentBalanceTokens.toLocaleString()}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      tokens
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">期間内の純消費量</dt>
                  <dd className="mt-1 text-2xl font-bold">
                    {organicConsumedTokens.toLocaleString()}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      tokens
                    </span>
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-muted-foreground">
                純消費量はオペレーター調整を除いた値です。残高は調整後の現在値です。
              </p>
            </CardContent>
          </Card>

          {/* Recent purchases */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">購入履歴</CardTitle>
              <CardDescription>最新10件</CardDescription>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  購入履歴がありません
                </p>
              ) : (
                <ul className="divide-y text-sm">
                  {purchases.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between py-2"
                    >
                      <span className="truncate">
                        {p.problem_sets?.title ?? "—"}
                      </span>
                      <span className="ml-4 shrink-0 text-muted-foreground">
                        ¥{p.amount_paid.toLocaleString()} ·{" "}
                        {formatDateShort(p.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Recent submissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">提出履歴</CardTitle>
              <CardDescription>最新10件</CardDescription>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  提出履歴がありません
                </p>
              ) : (
                <ul className="divide-y text-sm">
                  {submissions.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between py-2"
                    >
                      <span className="font-mono text-xs">
                        {s.problem_set_id.slice(0, 8)}
                      </span>
                      <span className="ml-4 shrink-0 text-muted-foreground">
                        {s.score ?? 0}/{s.max_score ?? 0} ·{" "}
                        {formatDateShort(s.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Admin actions history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">管理操作履歴</CardTitle>
              <CardDescription>このユーザーへの操作 (最新20件)</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Info className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    管理操作の履歴はありません
                  </p>
                  <p className="text-xs text-muted-foreground">
                    クリーンな履歴です
                  </p>
                </div>
              ) : (
                <ul className="space-y-3 text-sm">
                  {history.map((h) => {
                    const details =
                      h.details && typeof h.details === "object"
                        ? (h.details as Record<string, unknown>)
                        : null;
                    const reason =
                      details && typeof details.reason === "string"
                        ? details.reason
                        : null;

                    return (
                      <li
                        key={h.id}
                        className="rounded-md border p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={ACTION_VARIANTS[h.action] ?? "outline"}
                          >
                            {ACTION_LABELS[h.action] ?? h.action}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(h.created_at)}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-muted-foreground">
                                · {adminNameMap[h.admin_id] ?? "不明な管理者"}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <span className="font-mono text-xs">
                                {h.admin_id}
                              </span>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        {reason && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {reason}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Override dialog */}
      <Dialog
        open={overrideDialogOpen}
        onOpenChange={setOverrideDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>プランをオーバーライドしますか?</DialogTitle>
            <DialogDescription>
              このユーザーの効果的なプランを手動で設定します。Stripeの請求は
              変更されません。
            </DialogDescription>
          </DialogHeader>

          {overrideConflict && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-50 p-3 text-sm dark:bg-amber-950/30"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span className="text-amber-900 dark:text-amber-200">
                {overrideConflict}
              </span>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="override-tier">プラン</Label>
              <Select
                value={overrideTier}
                onValueChange={(v) =>
                  setOverrideTier(v as SubscriptionTier | "clear")
                }
              >
                <SelectTrigger id="override-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">フリー</SelectItem>
                  <SelectItem value="basic">ベーシック</SelectItem>
                  <SelectItem value="pro">プロ</SelectItem>
                  <SelectItem value="clear">オーバーライドを解除</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="override-reason">
                理由 ({overrideReason.length}/500字)
              </Label>
              <Textarea
                id="override-reason"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="操作の理由を入力してください (10文字以上)"
                rows={3}
                aria-invalid={
                  overrideReason.length > 0 && overrideReason.trim().length < 10
                }
              />
              <div className="flex flex-wrap gap-1">
                {REASON_QUICK_FILLS.map((q) => (
                  <Button
                    key={q}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setOverrideReason(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="override-notify"
                type="checkbox"
                checked={overrideNotify}
                onChange={(e) => setOverrideNotify(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <Label
                htmlFor="override-notify"
                className="text-sm font-normal"
              >
                ユーザーに通知する
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOverrideDialogOpen(false)}
              disabled={overridePending}
            >
              キャンセル
            </Button>
            <Button
              onClick={submitOverride}
              disabled={
                overridePending ||
                overrideReason.trim().length < 10 ||
                overrideReason.length > 500
              }
            >
              {overridePending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldAlert className="mr-2 h-4 w-4" />
              )}
              オーバーライドを適用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustMode === "credit" && "トークンを付与する"}
              {adjustMode === "deduct" && "トークンを差し引く"}
              {adjustMode === "reset" && "使用量をリセットする"}
            </DialogTitle>
            <DialogDescription>
              {adjustMode === "credit" &&
                "ユーザーの今月のトークン使用量から指定数を差し引きます (実質的に付与)。"}
              {adjustMode === "deduct" &&
                "ユーザーの今月のトークン使用量に指定数を加算します (ペナルティ)。"}
              {adjustMode === "reset" &&
                `現在の純消費量 ${organicConsumedTokens.toLocaleString()} トークンを 0 にリセットします。`}
            </DialogDescription>
          </DialogHeader>

          {adjustError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span>{adjustError}</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            {adjustMode !== "reset" && (
              <div className="space-y-1.5">
                <Label htmlFor="adjust-tokens">
                  トークン数 (1〜10,000,000)
                </Label>
                <Input
                  id="adjust-tokens"
                  type="number"
                  min={1}
                  max={10_000_000}
                  step={1}
                  value={adjustTokens}
                  onChange={(e) => setAdjustTokens(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="adjust-reason">
                理由 ({adjustReason.length}/500字)
              </Label>
              <Textarea
                id="adjust-reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="操作の理由を入力してください (10文字以上)"
                rows={3}
                aria-invalid={
                  adjustReason.length > 0 && adjustReason.trim().length < 10
                }
              />
              <div className="flex flex-wrap gap-1">
                {REASON_QUICK_FILLS.map((q) => (
                  <Button
                    key={q}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setAdjustReason(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="adjust-notify"
                type="checkbox"
                checked={adjustNotify}
                onChange={(e) => setAdjustNotify(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="adjust-notify" className="text-sm font-normal">
                ユーザーに通知する
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAdjustDialogOpen(false)}
              disabled={adjustPending}
            >
              キャンセル
            </Button>
            <Button
              variant={adjustMode === "reset" ? "destructive" : "default"}
              onClick={submitAdjust}
              disabled={
                adjustPending ||
                adjustReason.trim().length < 10 ||
                adjustReason.length > 500
              }
            >
              {adjustPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : adjustMode === "credit" ? (
                <Plus className="mr-2 h-4 w-4" />
              ) : adjustMode === "deduct" ? (
                <Minus className="mr-2 h-4 w-4" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              {adjustMode === "credit" && "付与する"}
              {adjustMode === "deduct" && "減算する"}
              {adjustMode === "reset" && "リセットする"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
