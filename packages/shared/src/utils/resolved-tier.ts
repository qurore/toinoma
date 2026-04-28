import type { SubscriptionTier } from "../types";

/**
 * Single source of truth for "what tier is this user actually on".
 *
 * Returns the manual override tier if an admin has set one; otherwise
 * the Stripe-driven tier. All entitlement, billing-display, and AI-budget
 * gating MUST use this resolver — direct reads of `subscription.tier` are
 * reserved for the Stripe webhook handler and admin server actions only.
 */
export function getResolvedTier(
  subscription: {
    tier: SubscriptionTier;
    manual_override_tier: SubscriptionTier | null;
  }
): SubscriptionTier {
  return subscription.manual_override_tier ?? subscription.tier;
}

/**
 * Returns true when an admin manual override is active and disagrees with
 * the Stripe-driven tier. Used to render warning banners on admin and
 * user-facing billing surfaces.
 */
export function hasOverrideMismatch(subscription: {
  tier: SubscriptionTier;
  manual_override_tier: SubscriptionTier | null;
}): boolean {
  return (
    subscription.manual_override_tier !== null &&
    subscription.manual_override_tier !== subscription.tier
  );
}
