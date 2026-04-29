import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import { getResolvedTier, hasOverrideMismatch } from "@toinoma/shared";
import { Button } from "@/components/ui/button";
import { AdminUserDetailClient } from "./admin-user-detail-client";
import type { Metadata } from "next";

const ACTION_FILTER = [
  "user_banned",
  "user_unbanned",
  "user_warned",
  "user_suspended",
  "subscription_tier_overridden",
  "ai_usage_credited",
  "ai_usage_deducted",
  "ai_usage_reset",
] as const;

const HISTORY_PAGE_SIZE = 20;

export const metadata: Metadata = {
  title: "ユーザー詳細 - 問の間",
};

export default async function AdminUserDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await props.params;
  const admin = createAdminClient();

  // Fetch the target user's profile first (404 if not found)
  const { data: profile } = await admin
    .from("profiles")
    .select(
      "id, display_name, avatar_url, created_at, banned_at, suspended_until, ban_reason"
    )
    .eq("id", id)
    .single();

  if (!profile) notFound();

  // Fetch related data in parallel
  const [
    sellerResult,
    subscriptionResult,
    purchasesResult,
    submissionsResult,
    historyResult,
  ] = await Promise.all([
    admin
      .from("seller_profiles")
      .select(
        "id, seller_display_name, university, circle_name, tos_accepted_at, stripe_account_id, created_at"
      )
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("user_subscriptions")
      .select(
        "id, tier, interval, stripe_subscription_id, stripe_customer_id, current_period_start, current_period_end, cancel_at_period_end, status, grace_period_end, manual_override_tier, manual_override_reason, manual_override_at, version, created_at, updated_at"
      )
      .eq("user_id", id)
      .maybeSingle(),
    admin
      .from("purchases")
      .select(
        "id, problem_set_id, amount_paid, created_at, problem_sets(title)"
      )
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("submissions")
      .select("id, problem_set_id, score, max_score, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("admin_audit_logs")
      .select("id, admin_id, action, target_type, target_id, details, created_at")
      .eq("target_type", "user")
      .eq("target_id", id)
      .in("action", [...ACTION_FILTER])
      .order("created_at", { ascending: false })
      .limit(HISTORY_PAGE_SIZE),
  ]);

  const subscription = subscriptionResult.data;
  const sellerProfile = sellerResult.data;
  const purchases = purchasesResult.data ?? [];
  const submissions = submissionsResult.data ?? [];
  const history = historyResult.data ?? [];

  // Resolve admin display names for history rows
  const adminIds = [...new Set(history.map((h) => h.admin_id))];
  const { data: adminProfiles } =
    adminIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, display_name")
          .in("id", adminIds)
      : { data: [] };
  const adminNameMap = new Map(
    (adminProfiles ?? []).map((p) => [p.id, p.display_name])
  );

  // Compute current-period token consumption (for budget summary)
  const periodStart = subscription?.current_period_start ?? null;
  const periodEnd = subscription?.current_period_end ?? null;

  let currentBalanceTokens = 0;
  let organicConsumedTokens = 0;
  if (periodStart && periodEnd) {
    const [{ data: rawRows }, { data: organicRows }] = await Promise.all([
      admin
        .from("token_usage")
        .select("tokens_used")
        .eq("user_id", id)
        .gte("created_at", periodStart)
        .lt("created_at", periodEnd),
      admin
        .from("token_usage_consumption")
        .select("tokens_used")
        .eq("user_id", id)
        .gte("created_at", periodStart)
        .lt("created_at", periodEnd),
    ]);
    currentBalanceTokens = (rawRows ?? []).reduce(
      (sum, r) => sum + (r.tokens_used ?? 0),
      0
    );
    organicConsumedTokens = (organicRows ?? []).reduce(
      (sum, r) => sum + (r.tokens_used ?? 0),
      0
    );
  }

  const resolvedTier = subscription
    ? getResolvedTier({
        tier: subscription.tier,
        manual_override_tier: subscription.manual_override_tier,
      })
    : "free";
  const overrideMismatch = subscription
    ? hasOverrideMismatch({
        tier: subscription.tier,
        manual_override_tier: subscription.manual_override_tier,
      })
    : false;

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/users" className="text-muted-foreground">
            <ChevronLeft className="mr-1 h-4 w-4" />
            ユーザー管理に戻る
          </Link>
        </Button>
      </div>

      <AdminUserDetailClient
        profile={profile}
        sellerProfile={sellerProfile ?? null}
        subscription={subscription ?? null}
        resolvedTier={resolvedTier}
        overrideMismatch={overrideMismatch}
        currentBalanceTokens={currentBalanceTokens}
        organicConsumedTokens={organicConsumedTokens}
        purchases={purchases}
        submissions={submissions}
        history={history}
        adminNameMap={Object.fromEntries(adminNameMap)}
      />
    </div>
  );
}
