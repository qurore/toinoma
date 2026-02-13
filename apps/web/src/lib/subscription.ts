// Subscription status helpers (FR-030)
import { createClient } from "@/lib/supabase/server";
import { SUBSCRIPTION_TIERS } from "@toinoma/shared/constants";
import type { SubscriptionTier } from "@/types/database";

export interface SubscriptionState {
  tier: SubscriptionTier;
  isActive: boolean;
  gradingLimit: number;
  gradingsUsedThisMonth: number;
  gradingsRemaining: number;
  canGrade: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export async function getSubscriptionState(
  userId: string
): Promise<SubscriptionState> {
  const supabase = await createClient();

  // Fetch subscription
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("tier, status, current_period_end, cancel_at_period_end")
    .eq("user_id", userId)
    .single();

  const tier: SubscriptionTier = sub?.tier ?? "free";
  const isActive = !sub || sub.status === "active" || sub.status === "trialing";
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const gradingLimit = tierConfig.gradingLimit;

  // Count gradings this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString());

  const gradingsUsedThisMonth = count ?? 0;
  const gradingsRemaining =
    gradingLimit === -1 ? Infinity : Math.max(0, gradingLimit - gradingsUsedThisMonth);
  const canGrade = gradingLimit === -1 || gradingsRemaining > 0;

  return {
    tier,
    isActive,
    gradingLimit,
    gradingsUsedThisMonth,
    gradingsRemaining,
    canGrade,
    currentPeriodEnd: sub?.current_period_end ?? null,
    cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
  };
}
