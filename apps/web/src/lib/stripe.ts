import Stripe from "stripe";
import { calculatePlatformFee } from "@toinoma/shared/utils";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set. Add it to your environment variables."
      );
    }
    stripeInstance = new Stripe(key, {
      apiVersion: "2026-01-28.clover",
      typescript: true,
    });
  }
  return stripeInstance;
}

export async function createCheckoutSession({
  priceAmountJpy,
  problemSetId,
  problemSetName,
  creatorStripeAccountId,
  customerEmail,
  successUrl,
  cancelUrl,
}: {
  priceAmountJpy: number;
  problemSetId: string;
  problemSetName: string;
  creatorStripeAccountId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = getStripe();
  const platformFee = calculatePlatformFee(priceAmountJpy);

  return stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "jpy",
          product_data: {
            name: problemSetName,
          },
          unit_amount: priceAmountJpy,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: platformFee,
      transfer_data: {
        destination: creatorStripeAccountId,
      },
    },
    customer_email: customerEmail,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      problem_set_id: problemSetId,
    },
  });
}

export async function createConnectAccountLink({
  accountId,
  refreshUrl,
  returnUrl,
}: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}) {
  const stripe = getStripe();

  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
}

export async function createConnectAccount(email: string) {
  const stripe = getStripe();

  return stripe.accounts.create({
    type: "express",
    country: "JP",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
}

// --- Stripe Billing (Subscriptions) ---

export async function createSubscriptionCheckout({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  userId,
}: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
}) {
  const stripe = getStripe();

  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { user_id: userId },
  });
}

export async function createOrRetrieveCustomer(
  email: string,
  userId: string
): Promise<string> {
  const stripe = getStripe();

  // Check if customer already exists with this email
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) {
    return existing.data[0].id;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });
  return customer.id;
}

export async function cancelSubscription(subscriptionId: string) {
  const stripe = getStripe();
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

export async function resumeSubscription(subscriptionId: string) {
  const stripe = getStripe();
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

export async function getSubscription(subscriptionId: string) {
  const stripe = getStripe();
  return stripe.subscriptions.retrieve(subscriptionId);
}

export function getSubscriptionPriceId(
  tier: "basic" | "pro",
  interval: "monthly" | "annual"
): string {
  const envKey =
    tier === "pro"
      ? interval === "annual"
        ? "STRIPE_PRO_ANNUAL_PRICE_ID"
        : "STRIPE_PRO_MONTHLY_PRICE_ID"
      : interval === "annual"
        ? "STRIPE_BASIC_ANNUAL_PRICE_ID"
        : "STRIPE_BASIC_MONTHLY_PRICE_ID";
  const priceId = process.env[envKey];
  if (!priceId) {
    throw new Error(`${envKey} is not set`);
  }
  return priceId;
}
