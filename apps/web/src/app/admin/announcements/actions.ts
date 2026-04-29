"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminAction } from "@/lib/auth/admin";
import type { Database } from "@/types/database";

type AdminActionType = Database["public"]["Enums"]["admin_action_type"];

async function createAuditLog(params: {
  adminId: string;
  action: AdminActionType;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  await admin.from("admin_audit_logs").insert({
    admin_id: params.adminId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId,
    details: (params.details ?? {}) as Database["public"]["Tables"]["admin_audit_logs"]["Insert"]["details"],
  });
}

// --- Announcement actions ---

/**
 * Create a new announcement as a draft.
 */
export async function createAnnouncement(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const authResult = await requireAdminAction();
  if ("error" in authResult) return { error: authResult.error };

  const title = formData.get("title") as string | null;
  const body = formData.get("body") as string | null;
  const target = formData.get("target") as string | null;

  if (!title?.trim()) return { error: "タイトルを入力してください" };
  if (!body?.trim()) return { error: "本文を入力してください" };

  const validTargets = ["all", "sellers", "subscribers"];
  const resolvedTarget = validTargets.includes(target ?? "") ? target! : "all";

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("announcements")
    .insert({
      admin_id: authResult.adminId,
      title: title.trim(),
      body: body.trim(),
      target: resolvedTarget,
      published: false,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "お知らせの作成に失敗しました" };

  await createAuditLog({
    adminId: authResult.adminId,
    action: "announcement_created",
    targetType: "announcement",
    targetId: data.id,
    details: { title: title.trim(), target: resolvedTarget },
  });

  revalidatePath("/admin/announcements");
  return { success: true };
}

/**
 * Update an existing announcement (title, body, target).
 * Only allowed for unpublished announcements.
 */
export async function updateAnnouncement(
  id: string,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const authResult = await requireAdminAction();
  if ("error" in authResult) return { error: authResult.error };

  const title = formData.get("title") as string | null;
  const body = formData.get("body") as string | null;
  const target = formData.get("target") as string | null;

  if (!title?.trim()) return { error: "タイトルを入力してください" };
  if (!body?.trim()) return { error: "本文を入力してください" };

  const validTargets = ["all", "sellers", "subscribers"];
  const resolvedTarget = validTargets.includes(target ?? "") ? target! : "all";

  const admin = createAdminClient();

  const { error } = await admin
    .from("announcements")
    .update({
      title: title.trim(),
      body: body.trim(),
      target: resolvedTarget,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: "お知らせの更新に失敗しました" };

  revalidatePath("/admin/announcements");
  return { success: true };
}

/**
 * Publish an announcement, creating notifications for all target users.
 */
export async function publishAnnouncement(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  const authResult = await requireAdminAction();
  if ("error" in authResult) return { error: authResult.error };

  const admin = createAdminClient();

  // Fetch the announcement to determine target audience
  const { data: announcement } = await admin
    .from("announcements")
    .select("id, title, body, target, published")
    .eq("id", id)
    .single();

  if (!announcement) return { error: "お知らせが見つかりません" };
  if (announcement.published) return { error: "このお知らせは既に公開されています" };

  // Publish
  const { error: publishError } = await admin
    .from("announcements")
    .update({
      published: true,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (publishError) return { error: "お知らせの公開に失敗しました" };

  // Determine target user IDs
  let userIds: string[] = [];

  if (announcement.target === "sellers") {
    const { data: sellers } = await admin
      .from("seller_profiles")
      .select("id")
      .not("tos_accepted_at", "is", null);
    userIds = (sellers ?? []).map((s) => s.id);
  } else if (announcement.target === "subscribers") {
    // Resolve effective tier (manual_override_tier takes precedence) before filtering.
    const { data: subs } = await admin
      .from("user_subscriptions")
      .select("user_id, tier, manual_override_tier");
    userIds = (subs ?? [])
      .filter((s) => {
        const resolved = s.manual_override_tier ?? s.tier;
        return resolved === "basic" || resolved === "pro";
      })
      .map((s) => s.user_id);
  } else {
    // "all" — fetch all profiles
    const { data: allUsers } = await admin
      .from("profiles")
      .select("id");
    userIds = (allUsers ?? []).map((u) => u.id);
  }

  // Create notifications in batches of 500 to avoid payload limits
  const BATCH_SIZE = 500;
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);
    const notifications = batch.map((userId) => ({
      user_id: userId,
      type: "announcement" as const,
      title: announcement.title,
      body: announcement.body.length > 200
        ? announcement.body.slice(0, 197) + "..."
        : announcement.body,
      link: null,
    }));

    await admin.from("notifications").insert(notifications);
  }

  await createAuditLog({
    adminId: authResult.adminId,
    action: "announcement_created",
    targetType: "announcement",
    targetId: id,
    details: {
      action: "published",
      target: announcement.target,
      notified_users: userIds.length,
    },
  });

  revalidatePath("/admin/announcements");
  return { success: true };
}

/**
 * Unpublish a published announcement.
 */
export async function unpublishAnnouncement(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  const authResult = await requireAdminAction();
  if ("error" in authResult) return { error: authResult.error };

  const admin = createAdminClient();

  const { error } = await admin
    .from("announcements")
    .update({
      published: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: "お知らせの非公開に失敗しました" };

  revalidatePath("/admin/announcements");
  return { success: true };
}

/**
 * Delete an announcement. Only drafts (unpublished) can be deleted.
 */
export async function deleteAnnouncement(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  const authResult = await requireAdminAction();
  if ("error" in authResult) return { error: authResult.error };

  const admin = createAdminClient();

  // Verify not published
  const { data: announcement } = await admin
    .from("announcements")
    .select("id, published")
    .eq("id", id)
    .single();

  if (!announcement) return { error: "お知らせが見つかりません" };
  if (announcement.published) {
    return { error: "公開中のお知らせは削除できません。先に非公開にしてください。" };
  }

  const { error } = await admin
    .from("announcements")
    .delete()
    .eq("id", id);

  if (error) return { error: "お知らせの削除に失敗しました" };

  revalidatePath("/admin/announcements");
  return { success: true };
}
