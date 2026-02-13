import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/stripe";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { problemSetId } = body as { problemSetId: string };

  if (!problemSetId) {
    return NextResponse.json(
      { error: "Missing problemSetId" },
      { status: 400 }
    );
  }

  // Fetch problem set
  const { data: ps } = await supabase
    .from("problem_sets")
    .select("id, title, price, seller_id, status")
    .eq("id", problemSetId)
    .eq("status", "published")
    .single();

  if (!ps) {
    return NextResponse.json(
      { error: "Problem set not found" },
      { status: 404 }
    );
  }

  // Check if already purchased
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

  // Free purchase — create record directly
  if (ps.price === 0) {
    const { error } = await supabase.from("purchases").insert({
      user_id: user.id,
      problem_set_id: problemSetId,
      amount_paid: 0,
    });

    if (error) {
      return NextResponse.json(
        { error: "Failed to create purchase" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  }

  // Paid purchase — create Stripe Checkout session
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

  const session = await createCheckoutSession({
    priceAmountJpy: ps.price,
    problemSetId: ps.id,
    problemSetName: ps.title,
    creatorStripeAccountId: sellerProfile.stripe_account_id,
    customerEmail: user.email ?? "",
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/problem/${problemSetId}?purchased=true`,
    cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/problem/${problemSetId}`,
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
