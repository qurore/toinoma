import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimitByUser } from "@/lib/rate-limit";
import type { Database } from "@/types/database";

type CouponRow = Database["public"]["Tables"]["coupons"]["Row"];

// Zod schema for request body validation
const validateCouponSchema = z.object({
  code: z.string().min(1, "Coupon code is required").max(50),
  problem_set_id: z.string().uuid("Invalid problem set ID format"),
  seller_id: z.string().uuid("Invalid seller ID format"),
});

/**
 * POST /api/coupon/validate
 *
 * Validates a coupon code against the following criteria:
 * - Exists and belongs to the seller of the target problem set
 * - Is active
 * - Has not expired
 * - Has not reached its usage limit
 * - Applies to the given problem set (or applies_to_all)
 * - Meets minimum purchase threshold (checked against the problem set price)
 *
 * Returns the computed discount amount on success.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  // Require authentication to prevent anonymous coupon enumeration
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { valid: false, error: "認証が必要です" },
      { status: 401 }
    );
  }

  // Rate limit: 20 coupon validations per minute per user
  const rl = await rateLimitByUser(user.id, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { valid: false, error: "リクエストが多すぎます。しばらくお待ちください。" },
      { status: 429 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { valid: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const parsed = validateCouponSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Validation failed";
    return NextResponse.json(
      { valid: false, error: firstError },
      { status: 400 }
    );
  }

  const { code, problem_set_id, seller_id } = parsed.data;

  const normalizedCode = code.trim().toUpperCase();

  // Fetch the coupon by seller + code
  const { data: coupon } = await supabase
    .from("coupons")
    .select("*")
    .eq("seller_id", seller_id)
    .eq("code", normalizedCode)
    .single<CouponRow>();

  if (!coupon) {
    return NextResponse.json({
      valid: false,
      error: "クーポンコードが見つかりません",
    });
  }

  // Check active status
  if (!coupon.active) {
    return NextResponse.json({
      valid: false,
      error: "このクーポンは現在無効です",
    });
  }

  // Check date range
  const now = new Date();

  if (new Date(coupon.starts_at) > now) {
    return NextResponse.json({
      valid: false,
      error: "このクーポンはまだ有効期間に入っていません",
    });
  }

  if (coupon.expires_at && new Date(coupon.expires_at) <= now) {
    return NextResponse.json({
      valid: false,
      error: "このクーポンは有効期限が切れています",
    });
  }

  // Check usage limit
  if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
    return NextResponse.json({
      valid: false,
      error: "このクーポンの利用上限に達しています",
    });
  }

  // Check scope
  if (!coupon.applies_to_all && coupon.problem_set_id !== problem_set_id) {
    return NextResponse.json({
      valid: false,
      error: "このクーポンはこの問題セットには適用できません",
    });
  }

  // Fetch problem set price for min_purchase check and discount calculation
  const { data: problemSet } = await supabase
    .from("problem_sets")
    .select("price")
    .eq("id", problem_set_id)
    .single();

  if (!problemSet) {
    return NextResponse.json({
      valid: false,
      error: "問題セットが見つかりません",
    });
  }

  // Check min purchase
  if (coupon.min_purchase > 0 && problemSet.price < coupon.min_purchase) {
    return NextResponse.json({
      valid: false,
      error: `最低購入金額 (¥${coupon.min_purchase.toLocaleString()}) を満たしていません`,
    });
  }

  // Calculate discount amount
  let discountAmount: number;
  if (coupon.coupon_type === "percentage") {
    discountAmount = Math.floor((problemSet.price * coupon.discount_value) / 100);
  } else {
    discountAmount = Math.min(coupon.discount_value, problemSet.price);
  }

  return NextResponse.json({
    valid: true,
    coupon_id: coupon.id,
    coupon_type: coupon.coupon_type,
    discount_value: coupon.discount_value,
    discount_amount: discountAmount,
  });
}
