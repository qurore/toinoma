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
