"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type NotificationPreferencesRow =
  Database["public"]["Tables"]["notification_preferences"]["Row"];

type NotificationPreferencesUpdate =
  Database["public"]["Tables"]["notification_preferences"]["Update"];

// All preference boolean keys (excludes id, user_id, timestamps)
const PREFERENCE_KEYS = [
  "email_purchase",
  "email_grading",
  "email_review",
  "email_announcement",
  "email_subscription",
  "email_qa",
  "email_marketing",
  "inapp_purchase",
  "inapp_grading",
  "inapp_review",
  "inapp_announcement",
  "inapp_subscription",
  "inapp_qa",
] as const satisfies ReadonlyArray<keyof NotificationPreferencesUpdate>;

type PreferenceKey = (typeof PREFERENCE_KEYS)[number];

export type NotificationPreferences = Pick<
  NotificationPreferencesRow,
  PreferenceKey
>;

/**
 * Fetch notification preferences for the current user.
 * Creates a default record on first access.
 */
export async function getNotificationPreferences(): Promise<{
  data?: NotificationPreferences;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  // Select columns for notification preferences
  const selectCols =
    "email_purchase, email_grading, email_review, email_announcement, email_subscription, email_qa, email_marketing, inapp_purchase, inapp_grading, inapp_review, inapp_announcement, inapp_subscription, inapp_qa" as const;

  // Attempt to fetch existing preferences
  const { data: existing } = await supabase
    .from("notification_preferences")
    .select(selectCols)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return { data: existing };
  }

  // Create default record on first visit
  const { data: created, error: insertError } = await supabase
    .from("notification_preferences")
    .insert({ user_id: user.id })
    .select(selectCols)
    .single();

  if (insertError || !created) {
    return { error: "通知設定の初期化に失敗しました" };
  }

  return { data: created };
}

/**
 * Update notification preferences for the current user.
 */
export async function updateNotificationPreferences(
  preferences: NotificationPreferencesUpdate
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  // Validate: only allow known boolean keys
  const sanitized: NotificationPreferencesUpdate = {};
  for (const key of PREFERENCE_KEYS) {
    if (key in preferences && typeof preferences[key] === "boolean") {
      sanitized[key] = preferences[key];
    }
  }

  if (Object.keys(sanitized).length === 0) {
    return { error: "更新する項目がありません" };
  }

  const { error } = await supabase
    .from("notification_preferences")
    .update(sanitized)
    .eq("user_id", user.id);

  if (error) {
    return { error: "通知設定の更新に失敗しました" };
  }

  revalidatePath("/settings/notifications");
  return { success: true };
}
