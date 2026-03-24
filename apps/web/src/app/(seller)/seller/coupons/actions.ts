"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type CouponInsert = Database["public"]["Tables"]["coupons"]["Insert"];
type CouponRow = Database["public"]["Tables"]["coupons"]["Row"];

/**
 * Create a new coupon for the authenticated seller.
 * Validates code uniqueness (per seller), discount range, and scope constraints.
 */
export async function createCoupon(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  // Verify seller profile exists
  const { data: sellerProfile } = await supabase
    .from("seller_profiles")
    .select("id, tos_accepted_at")
    .eq("id", user.id)
    .single();

  if (!sellerProfile?.tos_accepted_at) {
    return { error: "出品者登録が必要です" };
  }

  const code = (formData.get("code") as string)?.trim().toUpperCase();
  const couponType = formData.get("coupon_type") as "percentage" | "fixed";
  const discountValue = parseInt(formData.get("discount_value") as string, 10);
  const minPurchase = parseInt(formData.get("min_purchase") as string, 10) || 0;
  const maxUsesRaw = formData.get("max_uses") as string;
  const maxUses = maxUsesRaw ? parseInt(maxUsesRaw, 10) : null;
  const scope = formData.get("scope") as string;
  const problemSetId = formData.get("problem_set_id") as string | null;
  const startsAt = (formData.get("starts_at") as string) || new Date().toISOString();
  const expiresAtRaw = formData.get("expires_at") as string;
  const expiresAt = expiresAtRaw || null;

  // Validation
  if (!code || code.length < 3 || code.length > 20) {
    return { error: "クーポンコードは3〜20文字で入力してください" };
  }

  if (!/^[A-Z0-9_-]+$/.test(code)) {
    return { error: "クーポンコードは半角英数字・ハイフン・アンダースコアのみ使用できます" };
  }

  if (!couponType || (couponType !== "percentage" && couponType !== "fixed")) {
    return { error: "割引タイプを選択してください" };
  }

  if (isNaN(discountValue) || discountValue <= 0) {
    return { error: "割引値は1以上の数値を入力してください" };
  }

  if (couponType === "percentage" && discountValue > 100) {
    return { error: "割引率は100%以下で入力してください" };
  }

  if (maxUses !== null && (isNaN(maxUses) || maxUses < 1)) {
    return { error: "利用上限は1以上の数値を入力してください" };
  }

  // Scope validation
  const appliesToAll = scope === "all";
  const targetProblemSetId = appliesToAll ? null : (problemSetId || null);

  if (!appliesToAll && !targetProblemSetId) {
    return { error: "対象の問題セットを選択してください" };
  }

  // If specific problem set, verify ownership
  if (targetProblemSetId) {
    const { data: ps } = await supabase
      .from("problem_sets")
      .select("id")
      .eq("id", targetProblemSetId)
      .eq("seller_id", user.id)
      .single();

    if (!ps) {
      return { error: "指定された問題セットが見つかりません" };
    }
  }

  // Date validation
  if (expiresAt && new Date(expiresAt) <= new Date(startsAt)) {
    return { error: "終了日は開始日より後に設定してください" };
  }

  // Check code uniqueness per seller
  const { data: existingCoupon } = await supabase
    .from("coupons")
    .select("id")
    .eq("seller_id", user.id)
    .eq("code", code)
    .single();

  if (existingCoupon) {
    return { error: "このクーポンコードは既に使用されています" };
  }

  const insert: CouponInsert = {
    seller_id: user.id,
    code,
    coupon_type: couponType,
    discount_value: discountValue,
    min_purchase: minPurchase,
    max_uses: maxUses,
    problem_set_id: targetProblemSetId,
    applies_to_all: appliesToAll,
    starts_at: startsAt,
    expires_at: expiresAt,
    active: true,
  };

  const { error } = await supabase.from("coupons").insert(insert);

  if (error) {
    return { error: "クーポンの作成に失敗しました" };
  }

  revalidatePath("/seller/coupons");
  return { success: true };
}

/**
 * Toggle the active status of a coupon owned by the authenticated seller.
 */
export async function toggleCouponActive(couponId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  // Fetch current coupon state
  const { data: coupon } = await supabase
    .from("coupons")
    .select("id, active")
    .eq("id", couponId)
    .eq("seller_id", user.id)
    .single();

  if (!coupon) {
    return { error: "クーポンが見つかりません" };
  }

  const { error } = await supabase
    .from("coupons")
    .update({ active: !coupon.active })
    .eq("id", couponId)
    .eq("seller_id", user.id);

  if (error) {
    return { error: "ステータスの更新に失敗しました" };
  }

  revalidatePath("/seller/coupons");
  return { success: true, active: !coupon.active };
}

/**
 * Delete a coupon if it has zero uses. Prevents deletion of used coupons
 * to maintain purchase history integrity.
 */
export async function deleteCoupon(couponId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  // Verify ownership and check usage
  const { data: coupon } = await supabase
    .from("coupons")
    .select("id, current_uses")
    .eq("id", couponId)
    .eq("seller_id", user.id)
    .single();

  if (!coupon) {
    return { error: "クーポンが見つかりません" };
  }

  if (coupon.current_uses > 0) {
    return { error: "利用済みのクーポンは削除できません。無効化してください。" };
  }

  const { error } = await supabase
    .from("coupons")
    .delete()
    .eq("id", couponId)
    .eq("seller_id", user.id);

  if (error) {
    return { error: "クーポンの削除に失敗しました" };
  }

  revalidatePath("/seller/coupons");
  return { success: true };
}

/**
 * Compute usage statistics for a coupon.
 */
export async function getCouponStats(couponId: string): Promise<{
  error?: string;
  stats?: {
    coupon: CouponRow;
    totalUses: number;
    totalDiscount: number;
    recentPurchases: Array<{ created_at: string; discount_amount: number }>;
  };
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  const { data: coupon } = await supabase
    .from("coupons")
    .select("*")
    .eq("id", couponId)
    .eq("seller_id", user.id)
    .single<CouponRow>();

  if (!coupon) {
    return { error: "クーポンが見つかりません" };
  }

  // Fetch purchases that used this coupon
  const { data: purchases } = await supabase
    .from("purchases")
    .select("created_at, discount_amount")
    .eq("coupon_id", couponId)
    .order("created_at", { ascending: false })
    .limit(10);

  const allPurchases = (purchases ?? []) as Array<{
    created_at: string;
    discount_amount: number;
  }>;
  const totalDiscount = allPurchases.reduce(
    (sum, p) => sum + (p.discount_amount ?? 0),
    0
  );

  return {
    stats: {
      coupon,
      totalUses: coupon.current_uses,
      totalDiscount,
      recentPurchases: allPurchases,
    },
  };
}
