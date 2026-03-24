import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationType, Database } from "@/types/database";

type PrefRow = Database["public"]["Tables"]["notification_preferences"]["Row"];

// Mapping from NotificationType to the inapp preference column name
const TYPE_TO_PREF_KEY: Partial<Record<NotificationType, keyof PrefRow>> = {
  purchase: "inapp_purchase",
  grading: "inapp_grading",
  review: "inapp_review",
  announcement: "inapp_announcement",
  subscription: "inapp_subscription",
};

/**
 * Check whether a user has in-app notifications enabled for the given type.
 * Returns true if no preferences record exists (default = enabled).
 */
async function isInappEnabled(
  userId: string,
  type: NotificationType
): Promise<boolean> {
  // System notifications and types without a preference key always go through
  const prefKey = TYPE_TO_PREF_KEY[type];
  if (!prefKey) return true;

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("notification_preferences")
    .select("inapp_purchase, inapp_grading, inapp_review, inapp_announcement, inapp_subscription, inapp_qa")
    .eq("user_id", userId)
    .single();

  // No preferences row = defaults (all enabled)
  if (!data) return true;

  return data[prefKey as keyof typeof data] !== false;
}

/**
 * Create a single notification for a user.
 * Respects in-app notification preferences.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string
): Promise<void> {
  const enabled = await isInappEnabled(userId, type);
  if (!enabled) return;

  const supabase = createAdminClient();
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    link: link ?? null,
  });
}

/**
 * Create notifications for multiple users at once.
 * Filters out users who have disabled the notification type.
 */
export async function createBulkNotifications(
  userIds: string[],
  type: NotificationType,
  title: string,
  body: string,
  link?: string
): Promise<void> {
  if (userIds.length === 0) return;

  const supabase = createAdminClient();

  // For system/announcement, skip preference check
  let eligibleIds = userIds;

  const prefKey = TYPE_TO_PREF_KEY[type];
  if (prefKey) {
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("user_id, inapp_purchase, inapp_grading, inapp_review, inapp_announcement, inapp_subscription, inapp_qa")
      .in("user_id", userIds);

    // Users with explicit opt-out
    const optedOut = new Set(
      (prefs ?? [])
        .filter((p) => p[prefKey as keyof typeof p] === false)
        .map((p) => p.user_id)
    );

    eligibleIds = userIds.filter((id) => !optedOut.has(id));
  }

  if (eligibleIds.length === 0) return;

  const rows = eligibleIds.map((userId) => ({
    user_id: userId,
    type,
    title,
    body,
    link: link ?? null,
  }));

  await supabase.from("notifications").insert(rows);
}

// ── Domain-specific notification helpers ──────────────────────────────

/**
 * Notify buyer of a successful purchase.
 */
export async function notifyPurchase(
  buyerId: string,
  problemSetTitle: string,
  problemSetId: string
): Promise<void> {
  await createNotification(
    buyerId,
    "purchase",
    "購入が完了しました",
    `「${problemSetTitle}」の購入が完了しました。問題に取り組んでみましょう！`,
    `/problem/${problemSetId}/solve`
  );
}

/**
 * Notify seller of a new sale.
 */
export async function notifySale(
  sellerId: string,
  buyerName: string,
  problemSetTitle: string,
  problemSetId: string
): Promise<void> {
  await createNotification(
    sellerId,
    "purchase",
    "新しい購入がありました",
    `${buyerName}さんが「${problemSetTitle}」を購入しました。`,
    `/sell/${problemSetId}/edit`
  );
}

/**
 * Notify user that grading is complete.
 */
export async function notifyGrading(
  userId: string,
  problemSetTitle: string,
  score: number,
  submissionId: string,
  problemSetId: string
): Promise<void> {
  await createNotification(
    userId,
    "grading",
    "採点が完了しました",
    `「${problemSetTitle}」の採点結果: ${score}点`,
    `/problem/${problemSetId}/result/${submissionId}`
  );
}

/**
 * Notify seller of a new review on their problem set.
 */
export async function notifyReview(
  sellerId: string,
  reviewerName: string,
  rating: number,
  problemSetId: string
): Promise<void> {
  const stars = "\u2605".repeat(rating) + "\u2606".repeat(5 - rating);
  await createNotification(
    sellerId,
    "review",
    "新しいレビューが投稿されました",
    `${reviewerName}さんが ${stars} の評価を投稿しました。`,
    `/problem/${problemSetId}`
  );
}

/**
 * Notify seller of a new Q&A question on their problem set.
 */
export async function notifyQaQuestion(
  sellerId: string,
  askerName: string,
  questionTitle: string,
  problemSetId: string
): Promise<void> {
  await createNotification(
    sellerId,
    "system",
    "新しい質問が投稿されました",
    `${askerName}さんが「${questionTitle}」を質問しました。`,
    `/problem/${problemSetId}/qa`
  );
}

/**
 * Notify question asker that their question received an answer.
 */
export async function notifyQaAnswer(
  questionOwnerId: string,
  answererName: string,
  questionTitle: string,
  problemSetId: string
): Promise<void> {
  await createNotification(
    questionOwnerId,
    "system",
    "質問に回答がありました",
    `${answererName}さんが「${questionTitle}」に回答しました。`,
    `/problem/${problemSetId}/qa`
  );
}
