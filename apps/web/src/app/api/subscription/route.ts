import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createOrRetrieveCustomer,
  createSubscriptionCheckout,
  cancelSubscription,
  resumeSubscription,
  getSubscriptionPriceId,
} from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// POST /api/subscription — Create a Stripe subscription checkout
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { tier, interval } = body as {
    tier: "basic" | "pro";
    interval: "monthly" | "annual";
  };

  if (!tier || !interval || !["basic", "pro"].includes(tier)) {
    return NextResponse.json(
      { error: "Invalid tier or interval" },
      { status: 400 }
    );
  }

  if (!["monthly", "annual"].includes(interval)) {
    return NextResponse.json(
      { error: "Invalid interval" },
      { status: 400 }
    );
  }

  const priceId = getSubscriptionPriceId(tier, interval);
  const customerId = await createOrRetrieveCustomer(user.email!, user.id);

  // Store/update customer ID in user_subscriptions
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

// PATCH /api/subscription — Cancel or resume subscription
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body as { action: "cancel" | "resume" };

  if (!action || !["cancel", "resume"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  }

  // Fetch user's subscription
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

  if (action === "cancel") {
    await cancelSubscription(sub.stripe_subscription_id);
  } else {
    await resumeSubscription(sub.stripe_subscription_id);
  }

  return NextResponse.json({ success: true });
}
