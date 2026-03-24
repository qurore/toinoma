"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type AdminActionType = Database["public"]["Enums"]["admin_action_type"];

// ──────────────────────────────────────────────
// ADM-006: Seller verification actions
// ──────────────────────────────────────────────

async function requireAdmin(): Promise<
  { adminId: string } | { error: string }
> {
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

/**
 * Verify a seller — marks their profile as verified by admin.
 */
export async function verifySeller(
  sellerId: string
): Promise<{ success?: boolean; error?: string }> {
  const authResult = await requireAdmin();
  if ("error" in authResult) return { error: authResult.error };

  const admin = createAdminClient();

  // Confirm seller exists
  const { data: seller } = await admin
    .from("seller_profiles")
    .select("id, seller_display_name")
    .eq("id", sellerId)
    .single();

  if (!seller) return { error: "出品者が見つかりません" };

  // Update verified status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("seller_profiles")
    .update({
      verified_at: new Date().toISOString(),
      verified_by: authResult.adminId,
    })
    .eq("id", sellerId);

  if (error) return { error: "出品者の認証に失敗しました" };

  await createAuditLog({
    adminId: authResult.adminId,
    action: "user_warned" as AdminActionType, // Reuse closest available action type
    targetType: "seller_profile",
    targetId: sellerId,
    details: {
      action: "seller_verified",
      seller_name: seller.seller_display_name,
    },
  });

  revalidatePath("/admin/sellers");
  return { success: true };
}

/**
 * Unverify a seller — removes verification status.
 */
export async function unverifySeller(
  sellerId: string
): Promise<{ success?: boolean; error?: string }> {
  const authResult = await requireAdmin();
  if ("error" in authResult) return { error: authResult.error };

  const admin = createAdminClient();

  const { data: seller } = await admin
    .from("seller_profiles")
    .select("id, seller_display_name")
    .eq("id", sellerId)
    .single();

  if (!seller) return { error: "出品者が見つかりません" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("seller_profiles")
    .update({
      verified_at: null,
      verified_by: null,
    })
    .eq("id", sellerId);

  if (error) return { error: "出品者の認証解除に失敗しました" };

  await createAuditLog({
    adminId: authResult.adminId,
    action: "user_warned" as AdminActionType,
    targetType: "seller_profile",
    targetId: sellerId,
    details: {
      action: "seller_unverified",
      seller_name: seller.seller_display_name,
    },
  });

  revalidatePath("/admin/sellers");
  return { success: true };
}
