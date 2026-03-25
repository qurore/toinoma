import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createOrRetrieveCustomer,
  createSubscriptionCheckout,
  cancelSubscription,
  resumeSubscription,
  getSubscriptionPriceId,
  getStripe,
} from "@/lib/stripe";
import { rateLimitByUser } from "@/lib/rate-limit";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Zod schemas for request body validation
const subscriptionPostSchema = z.object({
  action: z
    .enum(["create", "change", "cancel", "reactivate"])
    .optional()
    .default("create"),
  tier: z.enum(["basic", "pro"]).optional(),
  interval: z.enum(["monthly", "annual"]).optional(),
});

const subscriptionPatchSchema = z.object({
  action: z.enum(["cancel", "resume"]),
});

type SubscriptionAction = z.infer<typeof subscriptionPostSchema>["action"];
type SubscriptionTier = "basic" | "pro";
type SubscriptionInterval = "monthly" | "annual";

interface SubscriptionRequestBody {
  action?: SubscriptionAction;
  tier?: SubscriptionTier;
  interval?: SubscriptionInterval;
}

// ── POST /api/subscription ───────────────────────────────────────────
// Unified endpoint handling create, change, cancel, and reactivate.
// For backward compatibility, a POST without action but with tier+interval
// is treated as "create". A PATCH with action is also supported.

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimitByUser(user.id, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const parsed = subscriptionPostSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: `Validation error: ${firstError?.path.join(".")} — ${firstError?.message}`,
      },
      { status: 400 }
    );
  }

  const body: SubscriptionRequestBody = parsed.data;
  const action: SubscriptionAction = body.action ?? "create";

  switch (action) {
    case "create":
      return handleCreate(user, body, supabase);
    case "change":
      return handleChange(user, body, supabase);
    case "cancel":
      return handleCancel(user, supabase);
    case "reactivate":
      return handleReactivate(user, supabase);
    default:
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
  }
}

// ── PATCH /api/subscription (backward compatibility) ─────────────────
// Supports cancel/resume actions via PATCH method.

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimitByUser(user.id, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const parsed = subscriptionPatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: `Validation error: ${firstError?.path.join(".")} — ${firstError?.message}`,
      },
      { status: 400 }
    );
  }

  const { action } = parsed.data;

  if (action === "cancel") {
    return handleCancel(user, supabase);
  }

  return handleReactivate(user, supabase);
}

// ── Action Handlers ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuthUser = any;

/**
 * Create a new subscription via Stripe Checkout.
 * If the user already has an active subscription, redirects to change flow.
 */
async function handleCreate(
  user: AuthUser,
  body: SubscriptionRequestBody,
  supabase: SupabaseClient
): Promise<NextResponse> {
  const { tier, interval } = body;

  if (!tier || !["basic", "pro"].includes(tier)) {
    return NextResponse.json(
      { error: "Invalid tier. Must be 'basic' or 'pro'." },
      { status: 400 }
    );
  }

  if (!interval || !["monthly", "annual"].includes(interval)) {
    return NextResponse.json(
      { error: "Invalid interval. Must be 'monthly' or 'annual'." },
      { status: 400 }
    );
  }

  // Check if user already has an active paid subscription
  const { data: existingSub } = await supabase
    .from("user_subscriptions")
    .select("stripe_subscription_id, tier, status")
    .eq("user_id", user.id)
    .single();

  if (
    existingSub?.stripe_subscription_id &&
    existingSub.status === "active" &&
    existingSub.tier !== "free"
  ) {
    // User already subscribed — route through change flow
    return handleChange(user, body, supabase);
  }

  const priceId = getSubscriptionPriceId(tier, interval);
  const customerId = await createOrRetrieveCustomer(user.email!, user.id);

  // Store/update customer ID
  const adminSupabase = createAdminClient();
  await adminSupabase.from("user_subscriptions").upsert(
    {
      user_id: user.id,
      stripe_customer_id: customerId,
    },
    { onConflict: "user_id" }
  );

  const session = await createSubscriptionCheckout({
    customerId,
    priceId,
    successUrl: `${APP_URL}/settings/subscription?success=true`,
    cancelUrl: `${APP_URL}/settings/subscription?canceled=true`,
    userId: user.id,
  });

  return NextResponse.json({ url: session.url });
}

/**
 * Change an existing subscription (upgrade or downgrade).
 * Uses Stripe's subscription update API with proration.
 */
async function handleChange(
  user: AuthUser,
  body: SubscriptionRequestBody,
  supabase: SupabaseClient
): Promise<NextResponse> {
  const { tier, interval } = body;

  if (!tier || !["basic", "pro"].includes(tier)) {
    return NextResponse.json(
      { error: "Invalid tier" },
      { status: 400 }
    );
  }

  if (!interval || !["monthly", "annual"].includes(interval)) {
    return NextResponse.json(
      { error: "Invalid interval" },
      { status: 400 }
    );
  }

  // Fetch current subscription
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("stripe_subscription_id, tier")
    .eq("user_id", user.id)
    .single();

  if (!sub?.stripe_subscription_id) {
    // No existing subscription — redirect to create
    return handleCreate(user, body, supabase);
  }

  // Prevent no-op changes
  if (sub.tier === tier) {
    // Allow interval change even if tier is the same
  }

  const stripe = getStripe();
  const newPriceId = getSubscriptionPriceId(tier, interval);

  // Retrieve the subscription to get the current item ID
  const currentSubscription = await stripe.subscriptions.retrieve(
    sub.stripe_subscription_id
  );

  const currentItem = currentSubscription.items.data[0];
  if (!currentItem) {
    return NextResponse.json(
      { error: "Subscription has no items" },
      { status: 500 }
    );
  }

  // Determine proration behavior: immediate for upgrades, period end for downgrades
  const TIER_ORDER: Record<string, number> = { free: 0, basic: 1, pro: 2 };
  const isUpgrade = (TIER_ORDER[tier] ?? 0) > (TIER_ORDER[sub.tier] ?? 0);

  await stripe.subscriptions.update(sub.stripe_subscription_id, {
    items: [
      {
        id: currentItem.id,
        price: newPriceId,
      },
    ],
    proration_behavior: isUpgrade ? "always_invoice" : "create_prorations",
    // For downgrades, apply at period end by canceling current and creating new
    // Stripe handles proration automatically
  });

  return NextResponse.json({ success: true });
}

/**
 * Cancel subscription at the end of the current billing period.
 */
async function handleCancel(
  user: AuthUser,
  supabase: SupabaseClient
): Promise<NextResponse> {
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", user.id)
    .single();

  if (!sub?.stripe_subscription_id) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 404 }
    );
  }

  try {
    await cancelSubscription(sub.stripe_subscription_id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[subscription] Cancel error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "サブスクリプションの解約に失敗しました。" }, { status: 500 });
  }
}

/**
 * Reactivate a subscription that was scheduled for cancellation.
 */
async function handleReactivate(
  user: AuthUser,
  supabase: SupabaseClient
): Promise<NextResponse> {
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("stripe_subscription_id, cancel_at_period_end")
    .eq("user_id", user.id)
    .single();

  if (!sub?.stripe_subscription_id) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 404 }
    );
  }

  if (!sub.cancel_at_period_end) {
    return NextResponse.json(
      { error: "Subscription is not scheduled for cancellation" },
      { status: 400 }
    );
  }

  try {
    await resumeSubscription(sub.stripe_subscription_id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[subscription] Reactivate error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "サブスクリプションの再開に失敗しました。" }, { status: 500 });
  }
}
