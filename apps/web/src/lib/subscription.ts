// Subscription status helpers (FR-030)
import { createClient } from "@/lib/supabase/server";
import { SUBSCRIPTION_TIERS } from "@toinoma/shared/constants";
import { getResolvedTier } from "@toinoma/shared";
import { canAffordAiCall, type UsageBudget } from "@/lib/ai/usage-manager";
import type { SubscriptionTier } from "@/types/database";

// ── Tier Feature Matrix ──────────────────────────────────────────────
// Canonical source of truth for what each tier enables.
// SUBSCRIPTION_TIERS in @toinoma/shared/constants provides pricing + limits.
// This module extends that with runtime-resolvable feature checks.

export interface TierFeatures {
  gradingLimit: number; // -1 = unlimited
  collectionsLimit: number; // -1 = unlimited
  priorityGrading: boolean;
  aiAssistant: boolean;
  studyAnalytics: boolean;
  prioritySupport: boolean;
}

export const TIER_FEATURE_MATRIX: Record<SubscriptionTier, TierFeatures> = {
  free: {
    gradingLimit: SUBSCRIPTION_TIERS.free.gradingLimit,
    collectionsLimit: SUBSCRIPTION_TIERS.free.collectionsLimit,
    priorityGrading: false,
    aiAssistant: false,
    studyAnalytics: false,
    prioritySupport: false,
  },
  basic: {
    gradingLimit: SUBSCRIPTION_TIERS.basic.gradingLimit,
    collectionsLimit: SUBSCRIPTION_TIERS.basic.collectionsLimit,
    priorityGrading: true,
    aiAssistant: false,
    studyAnalytics: false,
    prioritySupport: true,
  },
  pro: {
    gradingLimit: SUBSCRIPTION_TIERS.pro.gradingLimit,
    collectionsLimit: SUBSCRIPTION_TIERS.pro.collectionsLimit,
    priorityGrading: true,
    aiAssistant: true,
    studyAnalytics: true,
    prioritySupport: true,
  },
} as const;

// ── State Types ──────────────────────────────────────────────────────

export interface SubscriptionState {
  tier: SubscriptionTier;
  isActive: boolean;
  gradingLimit: number;
  /** @deprecated Use gradingsUsedThisPeriod — kept for backward compatibility */
  gradingsUsedThisMonth: number;
  gradingsUsedThisPeriod: number;
  gradingsRemaining: number;
  canGrade: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  status: string;
  interval: "monthly" | "annual" | null;
  features: TierFeatures;
  gracePeriodEnd: string | null;
}

export interface GradingAllowance {
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
  tier: SubscriptionTier;
  upgradeRequired: boolean;
}

// ── Core Functions ───────────────────────────────────────────────────

/**
 * Get the complete subscription state for a user.
 * Resolves tier, usage this period, active status, and feature matrix.
 */
export async function getSubscriptionState(
  userId: string
): Promise<SubscriptionState> {
  const supabase = await createClient();

  // Fetch subscription record
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select(
      "tier, manual_override_tier, status, interval, current_period_start, current_period_end, cancel_at_period_end, grace_period_end"
    )
    .eq("user_id", userId)
    .single();

  const now = new Date();
  const tier: SubscriptionTier = sub
    ? getResolvedTier({
        tier: sub.tier,
        manual_override_tier: sub.manual_override_tier,
      })
    : "free";
  const status = sub?.status ?? "active";

  // Grace period: user retains paid-tier access during a 3-day window after payment failure.
  // If the grace period has expired but the webhook hasn't fired yet to cancel the subscription,
  // we treat the user as inactive to prevent unauthorized access during the race window.
  const gracePeriodEnd = sub?.grace_period_end ?? null;
  const isInGracePeriod =
    status === "past_due" &&
    gracePeriodEnd != null &&
    new Date(gracePeriodEnd) > now;
  const isGracePeriodExpired =
    status === "past_due" &&
    gracePeriodEnd != null &&
    new Date(gracePeriodEnd) <= now;

  // Active means: no subscription record (free), active, trialing, or within grace period.
  // Expired grace period = NOT active, even if webhook hasn't fired yet.
  const isActive =
    !sub ||
    status === "active" ||
    status === "trialing" ||
    isInGracePeriod;

  // If grace period expired, treat as free tier for feature access
  const effectiveTier: SubscriptionTier = isGracePeriodExpired ? "free" : tier;
  const features = TIER_FEATURE_MATRIX[effectiveTier];
  const gradingLimit = features.gradingLimit;

  // Determine the billing period boundaries for usage counting.
  // For subscribed users, use the Stripe period. For free users, use calendar month.
  let periodStart: Date;
  if (sub?.current_period_start) {
    periodStart = new Date(sub.current_period_start);
  } else {
    periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);
  }

  // Count grading submissions this period
  const { count } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", periodStart.toISOString());

  const gradingsUsed = count ?? 0;
  const gradingsRemaining =
    gradingLimit === -1
      ? Infinity
      : Math.max(0, gradingLimit - gradingsUsed);

  // canGrade requires both: within count limit AND subscription is active
  const canGrade = isActive && (gradingLimit === -1 || gradingsRemaining > 0);

  return {
    tier: effectiveTier,
    isActive,
    gradingLimit,
    gradingsUsedThisMonth: gradingsUsed,
    gradingsUsedThisPeriod: gradingsUsed,
    gradingsRemaining,
    canGrade,
    currentPeriodStart: sub?.current_period_start ?? null,
    currentPeriodEnd: sub?.current_period_end ?? null,
    cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
    status,
    interval: (sub?.interval as "monthly" | "annual" | null) ?? null,
    features,
    gracePeriodEnd,
  };
}

/**
 * Check whether a user is allowed to submit an answer for AI grading.
 * Returns structured result with remaining count and upgrade flag.
 */
export async function checkGradingAllowance(
  userId: string
): Promise<GradingAllowance> {
  const state = await getSubscriptionState(userId);

  return {
    allowed: state.canGrade && state.isActive,
    remaining:
      state.gradingLimit === -1
        ? Infinity
        : Math.max(0, state.gradingLimit - state.gradingsUsedThisPeriod),
    limit: state.gradingLimit,
    used: state.gradingsUsedThisPeriod,
    tier: state.tier,
    upgradeRequired: !state.canGrade && state.tier !== "pro",
  };
}

// ── Combined Enforcement ────────────────────────────────────────────

export interface GradingWithBudgetResult {
  allowed: boolean;
  /** The reason grading was denied, if applicable */
  denialReason:
    | "count_limit_reached"
    | "subscription_inactive"
    | "free_tier_no_ai_budget"
    | "cost_budget_exceeded"
    | null;
  countAllowance: GradingAllowance;
  budget: UsageBudget;
}

/**
 * Combined gate that checks BOTH grading count limit AND AI cost budget.
 * A user must pass both checks to be allowed to grade.
 * This is the single source of truth for "can this user submit for grading?"
 */
export async function canGradeWithBudget(
  userId: string
): Promise<GradingWithBudgetResult> {
  // Run both checks in parallel for performance
  const [countAllowance, budgetResult] = await Promise.all([
    checkGradingAllowance(userId),
    canAffordAiCall(userId),
  ]);

  // Check count limit first (more actionable for the user)
  if (!countAllowance.allowed) {
    return {
      allowed: false,
      denialReason: countAllowance.upgradeRequired
        ? "count_limit_reached"
        : "subscription_inactive",
      countAllowance,
      budget: budgetResult.budget,
    };
  }

  // Check cost budget
  if (!budgetResult.allowed) {
    return {
      allowed: false,
      denialReason:
        budgetResult.reason === "free_tier_no_ai_budget"
          ? "free_tier_no_ai_budget"
          : "cost_budget_exceeded",
      countAllowance,
      budget: budgetResult.budget,
    };
  }

  return {
    allowed: true,
    denialReason: null,
    countAllowance,
    budget: budgetResult.budget,
  };
}
