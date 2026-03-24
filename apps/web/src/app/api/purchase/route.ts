import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { calculatePlatformFee } from "@toinoma/shared/utils";
import { rateLimitByUser } from "@/lib/rate-limit";
import { notifyPurchase, notifySale } from "@/lib/notifications";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface PurchaseRequestBody {
  problemSetId: string;
  couponCode?: string;
}

/**
 * POST /api/purchase
 *
 * Creates a purchase for a problem set.
 * - Free (price = 0 after discount): creates purchase record directly.
 * - Paid: creates a Stripe Checkout session with Connect destination charge.
 *
 * Supports optional couponCode for seller-created discounts.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  // ── Authentication ─────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Rate limiting ──────────────────────────────────────────────
  const rl = rateLimitByUser(user.id, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  // ── Parse and validate body ────────────────────────────────────
  let body: PurchaseRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { problemSetId, couponCode } = body;

  if (!problemSetId || typeof problemSetId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid problemSetId" },
      { status: 400 }
    );
  }

  // ── Fetch problem set ──────────────────────────────────────────
  const { data: ps } = await supabase
    .from("problem_sets")
    .select("id, title, price, seller_id, status")
    .eq("id", problemSetId)
    .eq("status", "published")
    .single();

  if (!ps) {
    return NextResponse.json(
      { error: "Problem set not found or not published" },
      { status: 404 }
    );
  }

  // Prevent sellers from purchasing their own problem sets
  if (ps.seller_id === user.id) {
    return NextResponse.json(
      { error: "Cannot purchase your own problem set" },
      { status: 400 }
    );
  }

  // ── Check for duplicate purchase ───────────────────────────────
  const { data: existing } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("problem_set_id", problemSetId)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Already purchased" },
      { status: 409 }
    );
  }

  // ── Coupon validation ──────────────────────────────────────────
  let discountAmount = 0;
  let couponId: string | null = null;
  let stripeCouponId: string | null = null;

  if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
    const normalizedCode = couponCode.trim().toUpperCase();

    const { data: coupon } = await supabase
      .from("coupons")
      .select("id, seller_id, code, coupon_type, discount_value, min_purchase, max_uses, current_uses, problem_set_id, applies_to_all, starts_at, expires_at, active, stripe_coupon_id")
      .eq("seller_id", ps.seller_id)
      .eq("code", normalizedCode)
      .single();

    if (!coupon) {
      return NextResponse.json(
        { error: "クーポンコードが見つかりません" },
        { status: 400 }
      );
    }

    const now = new Date();

    if (!coupon.active) {
      return NextResponse.json(
        { error: "このクーポンは現在無効です" },
        { status: 400 }
      );
    }

    if (new Date(coupon.starts_at) > now) {
      return NextResponse.json(
        { error: "このクーポンはまだ有効期間に入っていません" },
        { status: 400 }
      );
    }

    if (coupon.expires_at && new Date(coupon.expires_at) <= now) {
      return NextResponse.json(
        { error: "このクーポンは有効期限が切れています" },
        { status: 400 }
      );
    }

    if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
      return NextResponse.json(
        { error: "このクーポンの利用上限に達しています" },
        { status: 400 }
      );
    }

    if (!coupon.applies_to_all && coupon.problem_set_id !== problemSetId) {
      return NextResponse.json(
        { error: "このクーポンはこの問題セットには適用できません" },
        { status: 400 }
      );
    }

    if (coupon.min_purchase > 0 && ps.price < coupon.min_purchase) {
      return NextResponse.json(
        {
          error: `最低購入金額 (¥${coupon.min_purchase.toLocaleString()}) を満たしていません`,
        },
        { status: 400 }
      );
    }

    // Calculate discount
    if (coupon.coupon_type === "percentage") {
      discountAmount = Math.floor(
        (ps.price * coupon.discount_value) / 100
      );
    } else {
      discountAmount = Math.min(coupon.discount_value, ps.price);
    }

    couponId = coupon.id;
    stripeCouponId = coupon.stripe_coupon_id;
  }

  // ── Compute final price ────────────────────────────────────────
  const finalPrice = Math.max(0, ps.price - discountAmount);

  // ── Free purchase path ─────────────────────────────────────────
  if (finalPrice === 0) {
    const adminSupabase = createAdminClient();

    const { error: insertError } = await adminSupabase
      .from("purchases")
      .insert({
        user_id: user.id,
        problem_set_id: problemSetId,
        amount_paid: 0,
        coupon_id: couponId,
        discount_amount: discountAmount,
      });

    if (insertError) {
      console.error("[purchase] Failed to create free purchase:", insertError);
      return NextResponse.json(
        { error: "Failed to create purchase" },
        { status: 500 }
      );
    }

    // Increment coupon usage count (read-then-write; acceptable for low-contention coupon usage)
    if (couponId) {
      const { data: couponRow } = await adminSupabase
        .from("coupons")
        .select("current_uses")
        .eq("id", couponId)
        .single();

      if (couponRow) {
        await adminSupabase
          .from("coupons")
          .update({ current_uses: couponRow.current_uses + 1 })
          .eq("id", couponId);
      }
    }

    // Send notifications (fire-and-forget)
    const buyerName =
      user.user_metadata?.display_name ??
      user.user_metadata?.full_name ??
      "ユーザー";

    Promise.all([
      notifyPurchase(user.id, ps.title, problemSetId),
      notifySale(ps.seller_id, buyerName, ps.title, problemSetId),
    ]).catch((err) =>
      console.error("[purchase] Notification error:", err)
    );

    return NextResponse.json({
      success: true,
      free: true,
      redirectUrl: `${APP_URL}/purchase/success?problem_set_id=${problemSetId}`,
    });
  }

  // ── Paid purchase — Stripe Checkout ────────────────────────────
  const { data: sellerProfile } = await supabase
    .from("seller_profiles")
    .select("stripe_account_id")
    .eq("id", ps.seller_id)
    .single();

  if (!sellerProfile?.stripe_account_id) {
    return NextResponse.json(
      { error: "Seller payment not configured" },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripe();
    const platformFee = calculatePlatformFee(finalPrice);

    // Build Stripe Checkout session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionParams: any = {
      mode: "payment" as const,
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: { name: ps.title },
            unit_amount: stripeCouponId ? ps.price : finalPrice,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: sellerProfile.stripe_account_id,
        },
      },
      customer_email: user.email ?? "",
      success_url: `${APP_URL}/purchase/success?problem_set_id=${problemSetId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/problem/${problemSetId}`,
      metadata: {
        problem_set_id: problemSetId,
        user_id: user.id,
        coupon_id: couponId ?? "",
        discount_amount: String(discountAmount),
        original_price: String(ps.price),
      },
    };

    // Apply Stripe-managed coupon if available
    if (stripeCouponId) {
      sessionParams.discounts = [{ coupon: stripeCouponId }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Stripe session creation failed";
    console.error("[purchase] Stripe error:", message);
    return NextResponse.json(
      { error: "Payment processing failed. Please try again." },
      { status: 500 }
    );
  }
}
