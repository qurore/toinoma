import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  notifyPurchase,
  notifySale,
  createNotification,
} from "@/lib/notifications";
import type Stripe from "stripe";

// ── Price ID → Tier mapping ──────────────────────────────────────────

function mapPriceIdToTier(
  priceId: string | undefined
): "free" | "basic" | "pro" {
  if (!priceId) return "free";

  const mapping: Record<string, "basic" | "pro"> = {};

  const proMonthly = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const proAnnual = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
  const basicMonthly = process.env.STRIPE_BASIC_MONTHLY_PRICE_ID;
  const basicAnnual = process.env.STRIPE_BASIC_ANNUAL_PRICE_ID;

  if (proMonthly) mapping[proMonthly] = "pro";
  if (proAnnual) mapping[proAnnual] = "pro";
  if (basicMonthly) mapping[basicMonthly] = "basic";
  if (basicAnnual) mapping[basicAnnual] = "basic";

  return mapping[priceId] ?? "free";
}

// ── Idempotency guard (in-memory) ───────────────────────────────────
// Prevents duplicate processing of the same webhook event.
// For production scale, replace with Redis or DB-backed deduplication.

const processedEvents = new Map<string, number>();
const MAX_CACHE_SIZE = 10_000;
const EVENT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function isEventProcessed(eventId: string): boolean {
  const timestamp = processedEvents.get(eventId);
  if (timestamp && Date.now() - timestamp < EVENT_TTL_MS) {
    return true;
  }
  return false;
}

function markEventProcessed(eventId: string): void {
  // Evict old entries if cache is too large
  if (processedEvents.size >= MAX_CACHE_SIZE) {
    const cutoff = Date.now() - EVENT_TTL_MS;
    for (const [key, ts] of processedEvents) {
      if (ts < cutoff) processedEvents.delete(key);
    }
  }
  processedEvents.set(eventId, Date.now());
}

// ── Webhook Handler ──────────────────────────────────────────────────

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // ── Verify signature ───────────────────────────────────────────
  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhook] Signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  // ── Idempotency check ─────────────────────────────────────────
  if (isEventProcessed(event.id)) {
    return NextResponse.json({ received: true, deduplicated: true });
  }
  markEventProcessed(event.id);

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      // ── Purchase completed ───────────────────────────────────
      case "checkout.session.completed": {
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
          supabase
        );
        break;
      }

      // ── Subscription lifecycle ───────────────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await handleSubscriptionUpsert(
          event.data.object as Stripe.Subscription,
          supabase
        );
        break;
      }

      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
          supabase
        );
        break;
      }

      // ── Invoice events ───────────────────────────────────────
      case "invoice.payment_succeeded": {
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
          supabase
        );
        break;
      }

      case "invoice.payment_failed": {
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
          supabase
        );
        break;
      }

      // ── Refund ───────────────────────────────────────────────
      case "charge.refunded": {
        await handleChargeRefunded(
          event.data.object as Stripe.Charge,
          supabase
        );
        break;
      }

      // ── Connect account updates ──────────────────────────────
      case "account.updated": {
        await handleAccountUpdated(
          event.data.object as Stripe.Account,
          supabase
        );
        break;
      }

      default: {
        console.log(`[webhook] Unhandled event type: ${event.type}`);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[webhook] Error processing ${event.type} (${event.id}):`,
      message
    );
    // Return 200 to prevent Stripe from retrying (we logged the error)
    // For critical failures, consider returning 500 so Stripe retries
    return NextResponse.json({ received: true, error: message });
  }

  return NextResponse.json({ received: true });
}

// ── Event Handlers ───────────────────────────────────────────────────

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Handle checkout.session.completed — create purchase record for one-time payments.
 * Subscription checkouts are handled by customer.subscription.created instead.
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: AdminClient
): Promise<void> {
  // Skip subscription checkouts
  if (session.mode === "subscription") return;

  const problemSetId = session.metadata?.problem_set_id;
  const userId = session.metadata?.user_id;
  const couponId = session.metadata?.coupon_id || null;
  const discountAmountStr = session.metadata?.discount_amount;

  if (!problemSetId) {
    console.warn("[webhook] checkout.session.completed missing problem_set_id");
    return;
  }

  // Resolve user: prefer metadata user_id, fall back to email lookup
  let buyerId = userId;

  if (!buyerId && session.customer_email) {
    const { data: userData } = await supabase.auth.admin.listUsers();
    const buyer = userData?.users.find(
      (u) => u.email === session.customer_email
    );
    buyerId = buyer?.id;
  }

  if (!buyerId) {
    console.error(
      "[webhook] checkout.session.completed: could not resolve buyer for session",
      session.id
    );
    return;
  }

  // Check if purchase already exists (idempotency at the DB level)
  const { data: existingPurchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", buyerId)
    .eq("problem_set_id", problemSetId)
    .single();

  if (existingPurchase) {
    // Already processed — skip
    return;
  }

  // Create purchase record
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const { error: insertError } = await supabase.from("purchases").insert({
    user_id: buyerId,
    problem_set_id: problemSetId,
    amount_paid: session.amount_total ?? 0,
    stripe_payment_intent_id: paymentIntentId,
    coupon_id: couponId || null,
    discount_amount: discountAmountStr ? parseInt(discountAmountStr, 10) : 0,
  });

  if (insertError) {
    console.error("[webhook] Failed to insert purchase:", insertError);
    return;
  }

  // Increment coupon usage if a coupon was applied
  if (couponId) {
    const { data: couponRow } = await supabase
      .from("coupons")
      .select("current_uses")
      .eq("id", couponId)
      .single();

    if (couponRow) {
      await supabase
        .from("coupons")
        .update({ current_uses: couponRow.current_uses + 1 })
        .eq("id", couponId);
    }
  }

  // Send purchase and sale notifications
  const { data: problemSet } = await supabase
    .from("problem_sets")
    .select("title, seller_id")
    .eq("id", problemSetId)
    .single();

  if (problemSet) {
    // Resolve buyer display name
    const { data: buyerProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", buyerId)
      .single();

    const buyerName = buyerProfile?.display_name ?? "ユーザー";

    await Promise.all([
      notifyPurchase(buyerId, problemSet.title, problemSetId),
      notifySale(
        problemSet.seller_id,
        buyerName,
        problemSet.title,
        problemSetId
      ),
    ]);
  }
}

/**
 * Handle customer.subscription.created and customer.subscription.updated.
 * Upserts the user_subscriptions record with current tier, period, and status.
 */
async function handleSubscriptionUpsert(
  subscription: Stripe.Subscription,
  supabase: AdminClient
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const subItem = subscription.items.data[0];
  if (!subItem) {
    console.warn("[webhook] Subscription has no items:", subscription.id);
    return;
  }

  const priceId = subItem.price.id;
  const tier = mapPriceIdToTier(priceId);
  const interval: "annual" | "monthly" =
    subItem.price.recurring?.interval === "year" ? "annual" : "monthly";

  // Extract period from the subscription item
  const periodStart = subItem.current_period_start
    ? new Date(subItem.current_period_start * 1000).toISOString()
    : null;
  const periodEnd = subItem.current_period_end
    ? new Date(subItem.current_period_end * 1000).toISOString()
    : null;

  const subscriptionData = {
    tier,
    interval,
    stripe_subscription_id: subscription.id,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: subscription.cancel_at_period_end,
    status: subscription.status,
  };

  // Try to find existing record by stripe_customer_id
  const { data: existingSub } = await supabase
    .from("user_subscriptions")
    .select("id, user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (existingSub) {
    await supabase
      .from("user_subscriptions")
      .update(subscriptionData)
      .eq("id", existingSub.id);

    // Notify on tier change (upgrade/downgrade)
    if (subscription.status === "active") {
      const { data: currentSub } = await supabase
        .from("user_subscriptions")
        .select("tier")
        .eq("id", existingSub.id)
        .single();

      if (currentSub && currentSub.tier !== tier) {
        const tierLabel =
          tier === "pro" ? "プロ" : tier === "basic" ? "ベーシック" : "フリー";
        await createNotification(
          existingSub.user_id,
          "subscription",
          "プランが変更されました",
          `${tierLabel}プランへの変更が完了しました。`,
          "/settings/subscription"
        );
      }
    }
  } else {
    // Try to find user via metadata
    const userId = subscription.metadata?.user_id;
    if (userId) {
      await supabase.from("user_subscriptions").upsert(
        {
          user_id: userId,
          stripe_customer_id: customerId,
          ...subscriptionData,
        },
        { onConflict: "user_id" }
      );

      // Welcome notification for new subscription
      const tierLabel =
        tier === "pro" ? "プロ" : tier === "basic" ? "ベーシック" : "フリー";
      await createNotification(
        userId,
        "subscription",
        "サブスクリプションが開始されました",
        `${tierLabel}プランへようこそ！すべての機能をお楽しみください。`,
        "/settings/subscription"
      );
    } else {
      console.warn(
        "[webhook] Subscription upsert: no user_id in metadata and no existing record for customer",
        customerId
      );
    }
  }
}

/**
 * Handle customer.subscription.deleted — reset user to free tier.
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: AdminClient
): Promise<void> {
  const { data: subRecord } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  await supabase
    .from("user_subscriptions")
    .update({
      tier: "free",
      interval: null,
      stripe_subscription_id: null,
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      status: "canceled",
      grace_period_end: null,
    })
    .eq("stripe_subscription_id", subscription.id);

  // Notify user
  if (subRecord?.user_id) {
    await createNotification(
      subRecord.user_id,
      "subscription",
      "サブスクリプションが終了しました",
      "サブスクリプションが終了し、フリープランに戻りました。いつでも再度お申し込みいただけます。",
      "/settings/subscription"
    );
  }
}

/**
 * Handle invoice.payment_succeeded — clear any grace period on successful renewal.
 */
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: AdminClient
): Promise<void> {
  const subRef = invoice.parent?.subscription_details?.subscription;
  const subscriptionId =
    typeof subRef === "string" ? subRef : subRef?.id ?? null;

  if (!subscriptionId) return;

  // Clear grace period and set status to active on successful payment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("user_subscriptions")
    .update({
      status: "active",
      grace_period_end: null,
    })
    .eq("stripe_subscription_id", subscriptionId);
}

/**
 * Handle invoice.payment_failed — set grace period and notify user.
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: AdminClient
): Promise<void> {
  const subRef = invoice.parent?.subscription_details?.subscription;
  const subscriptionId =
    typeof subRef === "string" ? subRef : subRef?.id ?? null;

  if (!subscriptionId) return;

  // Set 3-day grace period
  const gracePeriodEnd = new Date(
    Date.now() + 3 * 24 * 60 * 60 * 1000
  ).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("user_subscriptions")
    .update({
      status: "past_due",
      grace_period_end: gracePeriodEnd,
    })
    .eq("stripe_subscription_id", subscriptionId);

  // Notify the user about payment failure
  const { data: subRecord } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (subRecord?.user_id) {
    await createNotification(
      subRecord.user_id,
      "subscription",
      "お支払いに失敗しました",
      "お支払いに失敗しました。3日以内に更新してください。更新されない場合、サブスクリプションは自動的にキャンセルされます。",
      "/settings/billing"
    );
  }
}

/**
 * Handle charge.refunded — revoke access by deleting the purchase record.
 */
async function handleChargeRefunded(
  charge: Stripe.Charge,
  supabase: AdminClient
): Promise<void> {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id ?? null;

  if (!paymentIntentId) {
    console.warn("[webhook] charge.refunded: no payment_intent on charge", charge.id);
    return;
  }

  // Find the purchase by stripe_payment_intent_id
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id, user_id, problem_set_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .single();

  if (!purchase) {
    console.warn(
      "[webhook] charge.refunded: no purchase found for payment_intent",
      paymentIntentId
    );
    return;
  }

  // Delete the purchase record to revoke access
  const { error: deleteError } = await supabase
    .from("purchases")
    .delete()
    .eq("id", purchase.id);

  if (deleteError) {
    console.error(
      "[webhook] charge.refunded: failed to delete purchase",
      purchase.id,
      deleteError
    );
    return;
  }

  // Fetch problem set title for notification
  const { data: problemSet } = await supabase
    .from("problem_sets")
    .select("title")
    .eq("id", purchase.problem_set_id)
    .single();

  // Notify the user
  await createNotification(
    purchase.user_id,
    "purchase",
    "返金が完了しました",
    `「${problemSet?.title ?? "問題セット"}」の返金が完了しました。`,
    "/dashboard"
  );
}

/**
 * Handle account.updated — update seller Connect account status.
 */
async function handleAccountUpdated(
  account: Stripe.Account,
  supabase: AdminClient
): Promise<void> {
  if (account.charges_enabled && account.payouts_enabled) {
    await supabase
      .from("seller_profiles")
      .update({ stripe_account_id: account.id })
      .eq("stripe_account_id", account.id);
  }
}
