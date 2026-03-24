import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";
import { RefundsClient } from "./refunds-client";

export const metadata: Metadata = {
  title: "返金管理 - 問の間",
};

const REFUND_WINDOW_HOURS = 24;

export const dynamic = "force-dynamic";

export default async function AdminRefundsPage() {
  const admin = createAdminClient();

  // Fetch recent purchases within 24-hour refund window
  const now = new Date();
  const cutoffDate = new Date(
    now.getTime() - REFUND_WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data: recentPurchases } = await admin
    .from("purchases")
    .select(
      "id, user_id, problem_set_id, stripe_payment_intent_id, amount_paid, created_at"
    )
    .gte("created_at", cutoffDate)
    .gt("amount_paid", 0)
    .not("stripe_payment_intent_id", "is", null)
    .order("created_at", { ascending: false });

  const purchases = recentPurchases ?? [];

  // Fetch related data: user profiles, problem set titles, and submission counts
  const userIds = [...new Set(purchases.map((p) => p.user_id))];
  const problemSetIds = [
    ...new Set(purchases.map((p) => p.problem_set_id)),
  ];

  const [profilesResult, setsResult, submissionsResult] = await Promise.all([
    userIds.length > 0
      ? admin
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds)
      : Promise.resolve({ data: [] }),
    problemSetIds.length > 0
      ? admin
          .from("problem_sets")
          .select("id, title")
          .in("id", problemSetIds)
      : Promise.resolve({ data: [] }),
    // For each purchase, check if there are submissions
    purchases.length > 0
      ? admin
          .from("submissions")
          .select("user_id, problem_set_id")
          .in("user_id", userIds)
          .in("problem_set_id", problemSetIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map(
    (profilesResult.data ?? []).map((p) => [
      p.id,
      { displayName: p.display_name },
    ])
  );
  const setMap = new Map(
    (setsResult.data ?? []).map((s) => [s.id, s.title])
  );

  // Build a set of user+problemSet combos that have submissions
  const submissionSet = new Set(
    (submissionsResult.data ?? []).map(
      (s) => `${s.user_id}:${s.problem_set_id}`
    )
  );

  // Build refund rows with eligibility info
  const rows = purchases.map((p) => {
    const hasSubmissions = submissionSet.has(
      `${p.user_id}:${p.problem_set_id}`
    );
    const profile = profileMap.get(p.user_id);
    return {
      id: p.id,
      userId: p.user_id,
      userDisplayName: profile?.displayName ?? null,
      problemSetId: p.problem_set_id,
      problemSetTitle: setMap.get(p.problem_set_id) ?? "—",
      amountPaid: p.amount_paid,
      createdAt: p.created_at,
      hasSubmissions,
      eligible: !hasSubmissions,
    };
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">返金管理</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        購入から24時間以内で未提出の購入に対して返金処理が可能です
      </p>
      <RefundsClient rows={rows} />
    </div>
  );
}
