import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyPurchase, notifySale } from "@/lib/notifications";
import { createNotification } from "@/lib/notifications";
import type Stripe from "stripe";

function mapPriceIdToTier(priceId: string | undefined): "free" | "basic" | "pro" {
  if (!priceId) return "free";
  const proMonthly = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const proAnnual = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
  const basicMonthly = process.env.STRIPE_BASIC_MONTHLY_PRICE_ID;
  const basicAnnual = process.env.STRIPE_BASIC_ANNUAL_PRICE_ID;

  if (priceId === proMonthly || priceId === proAnnual) return "pro";
  if (priceId === basicMonthly || priceId === basicAnnual) return "basic";
  return "free";
}

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
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // Skip subscription checkouts — handled by customer.subscription.created
      if (session.mode === "subscription") break;

      const problemSetId = session.metadata?.problem_set_id;
      const customerEmail = session.customer_email;

      if (problemSetId && customerEmail) {
        // Look up user by email
        const { data: userData } =
          await supabase.auth.admin.listUsers();
        const buyer = userData?.users.find(
          (u) => u.email === customerEmail
        );

        if (buyer) {
          await supabase.from("purchases").insert({
            user_id: buyer.id,
            problem_set_id: problemSetId,
            amount_paid: session.amount_total ?? 0,
            stripe_payment_intent_id:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id ?? null,
          });

          // Send purchase/sale notifications
          const { data: problemSet } = await supabase
            .from("problem_sets")
            .select("title, seller_id")
            .eq("id", problemSetId)
            .single();

          if (problemSet) {
            const buyerName =
              buyer.user_metadata?.display_name ??
              buyer.user_metadata?.full_name ??
              "ユーザー";

            await Promise.all([
              notifyPurchase(buyer.id, problemSet.title, problemSetId),
              notifySale(
                problemSet.seller_id,
                buyerName,
                problemSet.title,
                problemSetId
              ),
            ]);
          }
        }
      }
      break;
    }
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      // Update seller's stripe_account_id when their Connect account is ready
      if (account.charges_enabled && account.payouts_enabled) {
        await supabase
          .from("seller_profiles")
          .update({ stripe_account_id: account.id })
          .eq("stripe_account_id", account.id);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

      // Determine tier from the price ID
      const subItem = subscription.items.data[0];
      const priceId = subItem?.price.id;
      const tier = mapPriceIdToTier(priceId);
      const interval = subItem?.price.recurring?.interval === "year"
        ? "annual" as const
        : "monthly" as const;

      // Extract period from the subscription item
      const periodStart = subItem?.current_period_start
        ? new Date(subItem.current_period_start * 1000).toISOString()
        : null;
      const periodEnd = subItem?.current_period_end
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

      // Find user by stripe_customer_id
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
      } else {
        // Try to find user via metadata
        const userId = subscription.metadata?.user_id;
        if (userId) {
          await supabase.from("user_subscriptions").upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            ...subscriptionData,
          }, { onConflict: "user_id" });
        }
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      // Reset user to free tier
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
        })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      // Extract subscription ID from parent.subscription_details
      const subRef = invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof subRef === "string"
        ? subRef
        : subRef?.id ?? null;

      if (subscriptionId) {
        // Set grace period: 3 days before auto-cancel (Stripe handles the actual cancel)
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

        // Send notification to the user about payment failure
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
            "/settings/subscription"
          );
        }
      }
      break;
    }
    default: {
      console.log(`Unhandled event type: ${event.type}`);
    }
  }

  return NextResponse.json({ received: true });
}
