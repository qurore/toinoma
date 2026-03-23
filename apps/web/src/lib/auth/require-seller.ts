import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type SellerProfile = Database["public"]["Tables"]["seller_profiles"]["Row"];

/**
 * Require authentication only. Redirects to /login if not authenticated.
 * Used by seller layout as the base gate.
 */
export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { user };
}

/**
 * Check whether the current user has accepted seller ToS.
 * Returns the status without redirecting — caller decides what to do.
 */
export async function getSellerTosStatus() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: sellerProfile } = await supabase
    .from("seller_profiles")
    .select("*")
    .eq("id", user.id)
    .single<SellerProfile>();

  return {
    user,
    sellerProfile,
    tosAccepted: !!sellerProfile?.tos_accepted_at,
  };
}

/**
 * Require seller ToS acceptance. Redirects to /sell (ToS modal) if not accepted.
 * Used by seller sub-pages (/sell/new, /sell/[id]/edit, etc.)
 */
export async function requireSellerTos() {
  const { user, sellerProfile, tosAccepted } = await getSellerTosStatus();

  if (!tosAccepted) {
    redirect("/sell");
  }

  return { user, sellerProfile: sellerProfile! };
}

/**
 * Require full seller onboarding (ToS + profile + Stripe Connect).
 * Redirects to /sell/onboarding if not complete.
 * Used for publish-gated actions only.
 */
export async function requireCompleteSeller() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: sellerProfile } = await supabase
    .from("seller_profiles")
    .select("*")
    .eq("id", user.id)
    .single<SellerProfile>();

  if (!sellerProfile?.tos_accepted_at || !sellerProfile?.stripe_account_id) {
    redirect("/sell/onboarding");
  }

  return { user, sellerProfile };
}
