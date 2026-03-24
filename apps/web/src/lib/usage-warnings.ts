import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications";
import type { SubscriptionTier } from "@/types/database";

/**
 * Check current usage against grading limits and send warning notifications
 * at 80% and 100% thresholds. Avoids duplicate notifications within the
 * same billing period by checking existing notifications.
 */
export async function checkAndNotifyUsage(
  userId: string,
  tier: SubscriptionTier,
  currentUsage: number,
  limit: number
): Promise<void> {
  // Unlimited tiers (-1) never need warnings
  if (limit === -1) return;

  const percentage = (currentUsage / limit) * 100;

  // No warning needed below 80%
  if (percentage < 80) return;

  const supabase = createAdminClient();

  // Determine start of current billing period (start of month)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const periodStart = startOfMonth.toISOString();

  if (percentage >= 100) {
    // Check if 100% warning already sent this period
    const { count: existingCount } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "subscription")
      .gte("created_at", periodStart)
      .like("title", "%利用上限に達しました%");

    if ((existingCount ?? 0) === 0) {
      await createNotification(
        userId,
        "subscription",
        "AI採点の利用上限に達しました",
        `今月のAI採点回数が上限（${limit}回）に達しました。プランをアップグレードすると引き続きご利用いただけます。`,
        "/settings"
      );
    }
  } else if (percentage >= 80) {
    // Check if 80% warning already sent this period
    const { count: existingCount } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "subscription")
      .gte("created_at", periodStart)
      .like("title", "%利用量が80%に達しました%");

    if ((existingCount ?? 0) === 0) {
      await createNotification(
        userId,
        "subscription",
        "AI採点の利用量が80%に達しました",
        `今月のAI採点回数が${currentUsage}/${limit}回に達しました。残り${limit - currentUsage}回です。`,
        "/settings"
      );
    }
  }
}
