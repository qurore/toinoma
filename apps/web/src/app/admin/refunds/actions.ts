"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminAction } from "@/lib/auth/admin";
import { getStripe } from "@/lib/stripe";
import { notifyRefund } from "@/lib/notifications";
import type { Database } from "@/types/database";

type AdminActionType = Database["public"]["Enums"]["admin_action_type"];

// ──────────────────────────────────────────────
// Refund eligibility check
// ──────────────────────────────────────────────

const REFUND_WINDOW_HOURS = 24;

export interface RefundEligibility {
  eligible: boolean;
  reason?: string;
}

export async function checkRefundEligibility(
  purchaseId: string
): Promise<RefundEligibility> {
  const admin = createAdminClient();

  // Fetch purchase
  const { data: purchase } = await admin
    .from("purchases")
    .select("id, user_id, problem_set_id, stripe_payment_intent_id, amount_paid, created_at")
    .eq("id", purchaseId)
    .single();

  if (!purchase) {
    return { eligible: false, reason: "購入が見つかりません" };
  }

  // Check time window (24 hours)
  const purchaseTime = new Date(purchase.created_at).getTime();
  const cutoff = Date.now() - REFUND_WINDOW_HOURS * 60 * 60 * 1000;
  if (purchaseTime < cutoff) {
    return {
      eligible: false,
      reason: `購入から${REFUND_WINDOW_HOURS}時間以上経過しています`,
    };
  }

  // Check for submissions (no refund if answers have been submitted)
  const { count } = await admin
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", purchase.user_id)
    .eq("problem_set_id", purchase.problem_set_id);

  if (count && count > 0) {
    return {
      eligible: false,
      reason: "この問題セットに対する提出が存在するため、返金できません",
    };
  }

  // Free purchases cannot be refunded
  if (purchase.amount_paid === 0) {
    return { eligible: false, reason: "無料の購入は返金対象外です" };
  }

  // No Stripe payment intent means Stripe refund is impossible
  if (!purchase.stripe_payment_intent_id) {
    return {
      eligible: false,
      reason: "Stripe決済情報がないため、返金できません",
    };
  }

  return { eligible: true };
}

// ──────────────────────────────────────────────
// Process refund
// ──────────────────────────────────────────────

export async function processRefund(
  purchaseId: string
): Promise<{ success?: boolean; error?: string }> {
  const authResult = await requireAdminAction();
  if ("error" in authResult) return { error: authResult.error };

  const admin = createAdminClient();

  // Fetch purchase with full details
  const { data: purchase } = await admin
    .from("purchases")
    .select(
      "id, user_id, problem_set_id, stripe_payment_intent_id, amount_paid, created_at"
    )
    .eq("id", purchaseId)
    .single();

  if (!purchase) return { error: "購入が見つかりません" };

  // Re-check eligibility
  const eligibility = await checkRefundEligibility(purchaseId);
  if (!eligibility.eligible) {
    return { error: eligibility.reason ?? "返金対象外です" };
  }

  // Process Stripe refund
  try {
    const stripe = getStripe();
    await stripe.refunds.create({
      payment_intent: purchase.stripe_payment_intent_id!,
    });
  } catch (stripeError) {
    const message =
      stripeError instanceof Error
        ? stripeError.message
        : "Stripe返金処理に失敗しました";
    return { error: `Stripe返金エラー: ${message}` };
  }

  // Delete the purchase record to revoke access
  const { error: deleteError } = await admin
    .from("purchases")
    .delete()
    .eq("id", purchaseId);

  if (deleteError) {
    // Stripe refund succeeded but DB delete failed — log for manual resolution
    console.error(
      `[CRITICAL] Stripe refund succeeded but purchase deletion failed for ${purchaseId}`,
      deleteError
    );
    return {
      error:
        "Stripe返金は成功しましたが、購入レコードの削除に失敗しました。手動で確認してください。",
    };
  }

  // Fetch problem set title for the notification
  const { data: problemSet } = await admin
    .from("problem_sets")
    .select("title")
    .eq("id", purchase.problem_set_id)
    .single();

  // Audit log and notification in parallel
  await Promise.all([
    admin.from("admin_audit_logs").insert({
      admin_id: authResult.adminId,
      action: "content_removed" as AdminActionType,
      target_type: "purchase",
      target_id: purchaseId,
      details: {
        action: "refund",
        user_id: purchase.user_id,
        problem_set_id: purchase.problem_set_id,
        amount_refunded: purchase.amount_paid,
        stripe_payment_intent_id: purchase.stripe_payment_intent_id,
      } as unknown as Database["public"]["Tables"]["admin_audit_logs"]["Insert"]["details"],
    }),
    notifyRefund(
      purchase.user_id,
      problemSet?.title ?? "問題セット",
      purchase.amount_paid
    ),
  ]);

  revalidatePath("/admin/refunds");
  return { success: true };
}
