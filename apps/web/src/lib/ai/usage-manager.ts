// Enterprise-level AI usage cost management
// Tracks token usage per user per billing period and enforces cost budgets
// to ensure platform margin sustainability.
//
// Margin targets:
//   Basic (¥498/mo): ~40% margin → ¥300 raw AI cost budget
//   Pro (¥1,980/mo): ~25% margin → ¥1,500 raw AI cost budget
//   Annual Basic (¥4,980/yr): ¥300/mo × 12 = ¥3,600 budget → ~28% margin
//   Annual Pro (¥17,980/yr): ¥1,500/mo × 12 = ¥18,000 budget → ~0% margin (intentional)

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUBSCRIPTION_TIERS } from "@toinoma/shared/constants";
import type { SubscriptionTier } from "@/types/database";

// Gemini 2.0 Flash pricing (approximate, as of 2026)
// Input: ~$0.10 per 1M tokens, Output: ~$0.40 per 1M tokens
// Blended average: ~$0.15 per 1M tokens
const USD_PER_TOKEN = 0.00000015;

// JPY/USD rate (conservative estimate for cost calculation)
const JPY_PER_USD = 155;

export interface UsageBudget {
  tier: SubscriptionTier;
  interval: "monthly" | "annual" | null;
  /** Monthly cost budget in JPY */
  monthlyBudgetJpy: number;
  /** Total cost spent this period in JPY (estimated) */
  costSpentJpy: number;
  /** Remaining budget in JPY */
  budgetRemainingJpy: number;
  /** Whether the user is within budget */
  withinBudget: boolean;
  /** Usage percentage (0-100+) */
  usagePercent: number;
  /** Total tokens used this period */
  totalTokens: number;
}

/**
 * Get the AI cost budget status for a user.
 * This is the economic enforcement layer — separate from the grading count limit.
 * Even if a user has grading attempts remaining, they can be throttled if their
 * AI cost exceeds the budget for their tier.
 */
export async function getUsageBudget(
  userId: string
): Promise<UsageBudget> {
  const supabase = await createClient();

  // Fetch subscription
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("tier, interval, current_period_start")
    .eq("user_id", userId)
    .single();

  const tier = (sub?.tier ?? "free") as SubscriptionTier;
  const interval = (sub?.interval as "monthly" | "annual" | null) ?? null;
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const monthlyBudgetJpy = tierConfig.aiCostBudgetJpy;

  // Determine period start
  let periodStart: Date;
  if (sub?.current_period_start) {
    periodStart = new Date(sub.current_period_start);
  } else {
    periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);
  }

  // Sum token usage for this period
  const { data: usageData } = await supabase
    .from("token_usage")
    .select("tokens_used, cost_usd")
    .eq("user_id", userId)
    .gte("created_at", periodStart.toISOString());

  let totalTokens = 0;
  let totalCostUsd = 0;
  for (const row of usageData ?? []) {
    totalTokens += row.tokens_used ?? 0;
    totalCostUsd += row.cost_usd ?? 0;
  }

  // Convert to JPY
  const costSpentJpy = totalCostUsd * JPY_PER_USD;
  const budgetRemainingJpy = Math.max(0, monthlyBudgetJpy - costSpentJpy);
  const withinBudget = monthlyBudgetJpy === 0
    ? totalTokens === 0 // Free tier: no budget at all
    : costSpentJpy < monthlyBudgetJpy;
  const usagePercent = monthlyBudgetJpy > 0
    ? (costSpentJpy / monthlyBudgetJpy) * 100
    : 0;

  return {
    tier,
    interval,
    monthlyBudgetJpy,
    costSpentJpy,
    budgetRemainingJpy,
    withinBudget,
    usagePercent,
    totalTokens,
  };
}

/**
 * Record token usage after an AI call.
 * Called by the grading engine after each AI grading or assistant call.
 */
export async function recordTokenUsage(params: {
  userId: string;
  submissionId?: string;
  tokensUsed: number;
  model: string;
}): Promise<void> {
  const costUsd = params.tokensUsed * USD_PER_TOKEN;
  const supabase = createAdminClient();

  await supabase.from("token_usage").insert({
    user_id: params.userId,
    submission_id: params.submissionId ?? null,
    tokens_used: params.tokensUsed,
    cost_usd: costUsd,
    model: params.model,
  });
}

/**
 * Check if a user can afford an AI call based on their cost budget.
 * Returns true if the user is within their monthly budget.
 * Pro annual users get a generous budget (near zero margin by design).
 */
export async function canAffordAiCall(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  budget: UsageBudget;
}> {
  const budget = await getUsageBudget(userId);

  // Free tier users with zero budget are always blocked from AI
  if (budget.tier === "free" && budget.monthlyBudgetJpy === 0) {
    return {
      allowed: false,
      reason: "free_tier_no_ai_budget",
      budget,
    };
  }

  // Allow 10% overage buffer before hard-blocking
  const hardLimit = budget.monthlyBudgetJpy * 1.1;
  if (budget.costSpentJpy >= hardLimit) {
    return {
      allowed: false,
      reason: "cost_budget_exceeded",
      budget,
    };
  }

  return { allowed: true, budget };
}

/**
 * Estimate the cost of a grading request before executing it.
 * Used to pre-check whether the user can afford the call.
 */
export function estimateGradingCostJpy(params: {
  essayQuestionCount: number;
  hasImages: boolean;
}): number {
  // Average tokens per essay question grading: ~2000 input + ~500 output = 2500
  // Images add ~500 tokens per image
  const tokensPerQuestion = params.hasImages ? 3000 : 2500;
  const totalTokens = params.essayQuestionCount * tokensPerQuestion;
  const costUsd = totalTokens * USD_PER_TOKEN;
  return costUsd * JPY_PER_USD;
}
