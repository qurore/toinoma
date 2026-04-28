"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";
import {
  tierOverrideMetadataSchema,
  aiUsageAdjustmentMetadataSchema,
  type TierOverrideMetadata,
  type AiUsageAdjustmentMetadata,
} from "@toinoma/shared";
import type {
  Database,
  SubscriptionTier,
} from "@/types/database";

// --- Constants ---

const ADMIN_RATE_LIMIT_MAX = 50;
const ADMIN_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const TOKEN_AMOUNT_MIN = 1;
const TOKEN_AMOUNT_MAX = 10_000_000;

// --- Result types ---

type ActionError =
  | { error: "UNAUTHORIZED"; message: string }
  | { error: "RATE_LIMITED"; message: string; retryAfterSec: number }
  | { error: "INVALID_INPUT"; message: string }
  | { error: "NOT_FOUND"; message: string }
  | { error: "CONFLICT"; message: string; currentVersion: number }
  | { error: "INSUFFICIENT_BALANCE"; message: string; currentBalance: number };

export type SetSubscriptionOverrideResult =
  | { success: true; newVersion: number }
  | ActionError;

export type AiUsageAdjustResult =
  | { success: true; balanceAfter: number; offsetTokens?: number }
  | ActionError;

// --- Helpers ---

async function requireAdmin(): Promise<{ adminId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { error: "管理者権限が必要です" };
  return { adminId: user.id };
}

async function checkAdminRateLimit(adminId: string) {
  return checkRateLimit(
    `admin_action:${adminId}`,
    ADMIN_RATE_LIMIT_MAX,
    ADMIN_RATE_LIMIT_WINDOW_MS
  );
}

function unauthorized(message = "認証が必要です"): ActionError {
  return { error: "UNAUTHORIZED", message };
}

function rateLimited(retryAfterSec: number): ActionError {
  return {
    error: "RATE_LIMITED",
    message: `操作が多すぎます。${retryAfterSec}秒後に再試行してください`,
    retryAfterSec,
  };
}

function derivePeriod(sub: {
  current_period_start: string | null;
  current_period_end: string | null;
}): { periodStart: string; periodEnd: string } {
  if (sub.current_period_start && sub.current_period_end) {
    return {
      periodStart: sub.current_period_start,
      periodEnd: sub.current_period_end,
    };
  }
  // Free-tier fallback: month boundary (UTC)
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
  };
}

async function sumPeriodTokens(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  periodStart: string,
  periodEnd: string
): Promise<number> {
  const { data } = await admin
    .from("token_usage")
    .select("tokens_used, adjustment_type")
    .eq("user_id", userId)
    .gte("created_at", periodStart)
    .lt("created_at", periodEnd);

  let total = 0;
  for (const row of data ?? []) {
    total += row.tokens_used ?? 0;
  }
  return total;
}

async function sumOrganicConsumption(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  periodStart: string,
  periodEnd: string
): Promise<number> {
  const { data } = await admin
    .from("token_usage_consumption")
    .select("tokens_used")
    .eq("user_id", userId)
    .gte("created_at", periodStart)
    .lt("created_at", periodEnd);

  let total = 0;
  for (const row of data ?? []) {
    total += row.tokens_used ?? 0;
  }
  return total;
}

// --- setSubscriptionOverride (REQ-7) ---

export async function setSubscriptionOverride(params: {
  userId: string;
  tier: SubscriptionTier | null;
  reason: string;
  expectedVersion: number;
  notifyUser?: boolean;
}): Promise<SetSubscriptionOverrideResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return unauthorized(auth.error);

  const rl = await checkAdminRateLimit(auth.adminId);
  if (!rl.allowed) {
    return rateLimited(Math.max(0, Math.floor((rl.resetAt - Date.now()) / 1000)));
  }

  // Validate inputs
  if (params.tier !== null && !["free", "basic", "pro"].includes(params.tier)) {
    return { error: "INVALID_INPUT", message: "無効なプラン値です" };
  }
  // For setting an override, reason must be 10-500 chars.
  // For clearing (tier === null), reason is still recorded as audit context.
  const reasonTrimmed = params.reason.trim();
  if (reasonTrimmed.length < 10 || reasonTrimmed.length > 500) {
    return {
      error: "INVALID_INPUT",
      message: "理由は10文字以上500文字以下で入力してください",
    };
  }

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("user_subscriptions")
    .select("tier, manual_override_tier, manual_override_at, version")
    .eq("user_id", params.userId)
    .single();

  if (!sub) {
    return { error: "NOT_FOUND", message: "サブスクリプションが見つかりません" };
  }

  if (sub.version !== params.expectedVersion) {
    return {
      error: "CONFLICT",
      message: "ユーザーの状態が変更されました。最新の状態を読み込みます",
      currentVersion: sub.version,
    };
  }

  const newVersion = sub.version + 1;
  const nowIso = new Date().toISOString();
  const notify = params.notifyUser ?? false;

  const metadata: TierOverrideMetadata = {
    from_tier: sub.tier,
    to_tier: params.tier,
    reason: reasonTrimmed,
    prior_override_tier: sub.manual_override_tier,
    prior_override_at: sub.manual_override_at,
    expected_version: params.expectedVersion,
    new_version: newVersion,
    notify_user: notify,
  };
  tierOverrideMetadataSchema.parse(metadata);

  // Audit-log first (append-only); then conditional UPDATE.
  await admin.from("admin_audit_logs").insert({
    admin_id: auth.adminId,
    action: "subscription_tier_overridden",
    target_type: "user",
    target_id: params.userId,
    details: metadata as unknown as Database["public"]["Tables"]["admin_audit_logs"]["Insert"]["details"],
  });

  const updatePayload =
    params.tier === null
      ? {
          manual_override_tier: null,
          manual_override_reason: null,
          manual_override_at: null,
          version: newVersion,
        }
      : {
          manual_override_tier: params.tier,
          manual_override_reason: reasonTrimmed,
          manual_override_at: nowIso,
          version: newVersion,
        };

  const { data: updated, error: updateErr } = await admin
    .from("user_subscriptions")
    .update(updatePayload)
    .eq("user_id", params.userId)
    .eq("version", params.expectedVersion)
    .select("version")
    .maybeSingle();

  if (updateErr || !updated) {
    // Conflict — another writer bumped version between our read and update.
    // Note: the audit log entry above remains, but the state did not change.
    // We refetch the latest version to inform the caller.
    const { data: latest } = await admin
      .from("user_subscriptions")
      .select("version")
      .eq("user_id", params.userId)
      .single();
    return {
      error: "CONFLICT",
      message: "ユーザーの状態が変更されました。最新の状態を読み込みます",
      currentVersion: latest?.version ?? sub.version,
    };
  }

  if (notify) {
    const tierLabel =
      params.tier === "pro"
        ? "プロ"
        : params.tier === "basic"
          ? "ベーシック"
          : params.tier === "free"
            ? "フリー"
            : null;
    await createNotification(
      params.userId,
      "subscription",
      "プランが変更されました",
      tierLabel
        ? `管理者により${tierLabel}プランに設定されました。`
        : "管理者によりプランの手動設定が解除されました。",
      "/settings/subscription"
    );
  }

  revalidatePath(`/admin/users/${params.userId}`);
  revalidatePath("/admin/users");
  return { success: true, newVersion };
}

// --- creditAiUsage (REQ-8) ---

export async function creditAiUsage(params: {
  userId: string;
  tokens: number;
  reason: string;
  notifyUser?: boolean;
}): Promise<AiUsageAdjustResult> {
  return adjustAiUsage({ ...params, operation: "credit" });
}

// --- deductAiUsage (REQ-9) ---

export async function deductAiUsage(params: {
  userId: string;
  tokens: number;
  reason: string;
  notifyUser?: boolean;
}): Promise<AiUsageAdjustResult> {
  return adjustAiUsage({ ...params, operation: "deduct" });
}

// --- resetAiUsage (REQ-10) ---

export async function resetAiUsage(params: {
  userId: string;
  reason: string;
  notifyUser?: boolean;
}): Promise<AiUsageAdjustResult> {
  return adjustAiUsage({ ...params, operation: "reset", tokens: 0 });
}

// --- Shared adjustment implementation ---

async function adjustAiUsage(params: {
  userId: string;
  tokens: number;
  reason: string;
  notifyUser?: boolean;
  operation: "credit" | "deduct" | "reset";
}): Promise<AiUsageAdjustResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return unauthorized(auth.error);

  const rl = await checkAdminRateLimit(auth.adminId);
  if (!rl.allowed) {
    return rateLimited(Math.max(0, Math.floor((rl.resetAt - Date.now()) / 1000)));
  }

  const reasonTrimmed = params.reason.trim();
  if (reasonTrimmed.length < 10 || reasonTrimmed.length > 500) {
    return {
      error: "INVALID_INPUT",
      message: "理由は10文字以上500文字以下で入力してください",
    };
  }

  if (
    params.operation !== "reset" &&
    (!Number.isInteger(params.tokens) ||
      params.tokens < TOKEN_AMOUNT_MIN ||
      params.tokens > TOKEN_AMOUNT_MAX)
  ) {
    return {
      error: "INVALID_INPUT",
      message: `トークン数は${TOKEN_AMOUNT_MIN}〜${TOKEN_AMOUNT_MAX.toLocaleString()}の整数で入力してください`,
    };
  }

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("user_subscriptions")
    .select("current_period_start, current_period_end")
    .eq("user_id", params.userId)
    .single();

  // current_period may be null (free tier or no subscription record); use month-boundary fallback
  const { periodStart, periodEnd } = derivePeriod(
    sub ?? { current_period_start: null, current_period_end: null }
  );

  const balanceBefore = await sumPeriodTokens(
    admin,
    params.userId,
    periodStart,
    periodEnd
  );

  let tokensUsedRow: number;
  let balanceAfter: number;
  let offsetTokens: number | undefined;

  if (params.operation === "credit") {
    tokensUsedRow = -params.tokens;
    balanceAfter = balanceBefore + tokensUsedRow;
  } else if (params.operation === "deduct") {
    // Refuse if the deduction exceeds what the user has consumed in this period.
    // (Cannot deduct more than what is "available" to deduct from.)
    if (params.tokens > balanceBefore) {
      return {
        error: "INSUFFICIENT_BALANCE",
        message: `${params.tokens}トークンを減算できません。現在の残高は${balanceBefore}トークンです`,
        currentBalance: balanceBefore,
      };
    }
    tokensUsedRow = params.tokens;
    balanceAfter = balanceBefore + tokensUsedRow;
  } else {
    // reset
    const organicSum = await sumOrganicConsumption(
      admin,
      params.userId,
      periodStart,
      periodEnd
    );
    tokensUsedRow = -organicSum;
    balanceAfter = balanceBefore + tokensUsedRow;
    offsetTokens = organicSum;
  }

  const adjustmentType =
    params.operation === "credit"
      ? "credit"
      : params.operation === "deduct"
        ? "deduct"
        : "reset";

  const auditAction =
    params.operation === "credit"
      ? "ai_usage_credited"
      : params.operation === "deduct"
        ? "ai_usage_deducted"
        : "ai_usage_reset";

  const notify = params.notifyUser ?? false;
  const metadata: AiUsageAdjustmentMetadata = {
    operation: params.operation,
    tokens: tokensUsedRow,
    reason: reasonTrimmed,
    period_start: periodStart,
    period_end: periodEnd,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    notify_user: notify,
  };
  aiUsageAdjustmentMetadataSchema.parse(metadata);

  // Audit log first
  await admin.from("admin_audit_logs").insert({
    admin_id: auth.adminId,
    action: auditAction,
    target_type: "user",
    target_id: params.userId,
    details: metadata as unknown as Database["public"]["Tables"]["admin_audit_logs"]["Insert"]["details"],
  });

  // Insert adjustment row
  const modelLabel =
    params.operation === "reset"
      ? "admin_reset"
      : params.operation === "credit"
        ? "admin_credit"
        : "admin_deduct";

  const { error: insertErr } = await admin.from("token_usage").insert({
    user_id: params.userId,
    submission_id: null,
    tokens_used: tokensUsedRow,
    cost_usd: 0,
    model: modelLabel,
    adjustment_type: adjustmentType,
  });

  if (insertErr) {
    return {
      error: "INVALID_INPUT",
      message: `トークン使用量の調整に失敗しました: ${insertErr.message}`,
    };
  }

  if (notify) {
    const titles = {
      credit: "トークンが付与されました",
      deduct: "トークンが減算されました",
      reset: "使用量がリセットされました",
    } as const;
    const bodies = {
      credit: `${params.tokens.toLocaleString()}トークンを付与しました。`,
      deduct: `${params.tokens.toLocaleString()}トークンを減算しました。`,
      reset: "今月の使用量を 0 にリセットしました。",
    } as const;
    await createNotification(
      params.userId,
      "subscription",
      titles[params.operation],
      bodies[params.operation],
      "/settings/subscription"
    );
  }

  revalidatePath(`/admin/users/${params.userId}`);
  return {
    success: true,
    balanceAfter,
    offsetTokens,
  };
}
