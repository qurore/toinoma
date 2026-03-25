"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import {
  notifyUserWarned,
  notifyUserSuspended,
  notifyUserBanned,
  notifyUserUnbanned,
  notifyContentRemoved,
  notifyReportResolved,
} from "@/lib/notifications";

type AdminActionType = Database["public"]["Enums"]["admin_action_type"];
type ReportStatus = Database["public"]["Enums"]["report_status"];

// --- Helpers ---

async function requireAdmin(): Promise<{ adminId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { error: "管理者権限が必要です" };

  return { adminId: user.id };
}

/**
 * Log an admin action to admin_audit_logs.
 */
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

// --- User actions ---

/**
 * Ban a user permanently.
 */
export async function banUser(
  targetUserId: string,
  reason: string
): Promise<{ success?: boolean; error?: string }> {
  const authResult = await requireAdmin();
  if ("error" in authResult) return { error: authResult.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      banned_at: new Date().toISOString(),
      ban_reason: reason,
      suspended_until: null,
    })
    .eq("id", targetUserId);

  if (error) return { error: "ユーザーのBANに失敗しました" };

  await Promise.all([
    createAuditLog({
      adminId: authResult.adminId,
      action: "user_banned",
      targetType: "user",
      targetId: targetUserId,
      details: { reason },
    }),
    notifyUserBanned(targetUserId, reason),
  ]);

  revalidatePath("/admin/users");
  return { success: true };
}

/**
 * Suspend a user for a specified number of days.
 */
export async function suspendUser(
  targetUserId: string,
  reason: string,
  durationDays: number
): Promise<{ success?: boolean; error?: string }> {
  const authResult = await requireAdmin();
  if ("error" in authResult) return { error: authResult.error };

  if (durationDays < 1 || durationDays > 365) {
    return { error: "停止期間は1日から365日の間で指定してください" };
  }

  const suspendedUntil = new Date(
    Date.now() + durationDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      suspended_until: suspendedUntil,
      ban_reason: reason,
      banned_at: null,
    })
    .eq("id", targetUserId);

  if (error) return { error: "ユーザーの一時停止に失敗しました" };

  await Promise.all([
    createAuditLog({
      adminId: authResult.adminId,
      action: "user_suspended",
      targetType: "user",
      targetId: targetUserId,
      details: { reason, duration_days: durationDays, suspended_until: suspendedUntil },
    }),
    notifyUserSuspended(targetUserId, reason, suspendedUntil),
  ]);

  revalidatePath("/admin/users");
  return { success: true };
}

/**
 * Warn a user (logged but no state change on the profile).
 */
export async function warnUser(
  targetUserId: string,
  reason: string
): Promise<{ success?: boolean; error?: string }> {
  const authResult = await requireAdmin();
  if ("error" in authResult) return { error: authResult.error };

  await Promise.all([
    createAuditLog({
      adminId: authResult.adminId,
      action: "user_warned",
      targetType: "user",
      targetId: targetUserId,
      details: { reason },
    }),
    notifyUserWarned(targetUserId, reason),
  ]);

  revalidatePath("/admin/users");
  return { success: true };
}

/**
 * Unban / unsuspend a user.
 */
export async function unbanUser(
  targetUserId: string
): Promise<{ success?: boolean; error?: string }> {
  const authResult = await requireAdmin();
  if ("error" in authResult) return { error: authResult.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      banned_at: null,
      suspended_until: null,
      ban_reason: null,
    })
    .eq("id", targetUserId);

  if (error) return { error: "ユーザーの解除に失敗しました" };

  await Promise.all([
    createAuditLog({
      adminId: authResult.adminId,
      action: "user_unbanned",
      targetType: "user",
      targetId: targetUserId,
      details: {},
    }),
    notifyUserUnbanned(targetUserId),
  ]);

  revalidatePath("/admin/users");
  return { success: true };
}

// --- Report actions ---

/**
 * Update a report's status with admin notes.
 */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  notes?: string
): Promise<{ success?: boolean; error?: string }> {
  const authResult = await requireAdmin();
  if ("error" in authResult) return { error: authResult.error };

  const admin = createAdminClient();

  // Fetch the report to get reporter_id for notification
  const { data: report } = await admin
    .from("reports")
    .select("reporter_id")
    .eq("id", reportId)
    .single();

  const { error } = await admin
    .from("reports")
    .update({
      status,
      reviewed_by: authResult.adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) return { error: "報告のステータス更新に失敗しました" };

  const action: AdminActionType =
    status === "dismissed" ? "report_dismissed" : "report_reviewed";

  await Promise.all([
    createAuditLog({
      adminId: authResult.adminId,
      action,
      targetType: "report",
      targetId: reportId,
      details: { status, notes: notes ?? null },
    }),
    // Notify the reporter that their report has been resolved
    report?.reporter_id
      ? notifyReportResolved(report.reporter_id, status)
      : Promise.resolve(),
  ]);

  revalidatePath("/admin/reports");
  return { success: true };
}

/**
 * Take action on a report: remove content and warn the user.
 */
export async function takeReportAction(
  reportId: string,
  notes: string
): Promise<{ success?: boolean; error?: string }> {
  const authResult = await requireAdmin();
  if ("error" in authResult) return { error: authResult.error };

  const admin = createAdminClient();

  // Fetch the report to identify the target content
  const { data: report } = await admin
    .from("reports")
    .select("problem_set_id, review_id, qa_question_id, reporter_id")
    .eq("id", reportId)
    .single();

  if (!report) return { error: "報告が見つかりません" };

  // Remove the reported content and notify the content owner
  if (report.problem_set_id) {
    // Fetch the problem set to identify the owner and title
    const { data: problemSet } = await admin
      .from("problem_sets")
      .select("seller_id, title")
      .eq("id", report.problem_set_id)
      .single();

    await admin
      .from("problem_sets")
      .update({ status: "draft" as Database["public"]["Enums"]["problem_set_status"] })
      .eq("id", report.problem_set_id);

    await Promise.all([
      createAuditLog({
        adminId: authResult.adminId,
        action: "content_removed",
        targetType: "problem_set",
        targetId: report.problem_set_id,
        details: { report_id: reportId, notes },
      }),
      // Notify the content owner
      problemSet?.seller_id
        ? notifyContentRemoved(
            problemSet.seller_id,
            "problem_set",
            problemSet.title ?? "---"
          )
        : Promise.resolve(),
    ]);
  } else if (report.review_id) {
    // Fetch the review to identify the owner
    const { data: review } = await admin
      .from("reviews")
      .select("user_id")
      .eq("id", report.review_id)
      .single();

    await admin.from("reviews").delete().eq("id", report.review_id);

    await Promise.all([
      createAuditLog({
        adminId: authResult.adminId,
        action: "content_removed",
        targetType: "review",
        targetId: report.review_id,
        details: { report_id: reportId, notes },
      }),
      review?.user_id
        ? notifyContentRemoved(review.user_id, "review", "レビュー")
        : Promise.resolve(),
    ]);
  } else if (report.qa_question_id) {
    // Fetch the question to identify the owner
    const { data: question } = await admin
      .from("qa_questions")
      .select("user_id, title")
      .eq("id", report.qa_question_id)
      .single();

    await admin.from("qa_questions").delete().eq("id", report.qa_question_id);

    await Promise.all([
      createAuditLog({
        adminId: authResult.adminId,
        action: "content_removed",
        targetType: "qa_question",
        targetId: report.qa_question_id,
        details: { report_id: reportId, notes },
      }),
      question?.user_id
        ? notifyContentRemoved(
            question.user_id,
            "qa_question",
            question.title ?? "質問"
          )
        : Promise.resolve(),
    ]);
  }

  // Update report status and notify reporter
  await admin
    .from("reports")
    .update({
      status: "action_taken" as ReportStatus,
      reviewed_by: authResult.adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  // Notify the reporter that action has been taken
  if (report.reporter_id) {
    await notifyReportResolved(report.reporter_id, "action_taken");
  }

  revalidatePath("/admin/reports");
  return { success: true };
}
