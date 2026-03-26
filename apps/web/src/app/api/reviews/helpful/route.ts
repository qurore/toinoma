import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimitByUser } from "@/lib/rate-limit";

// Zod schema for request body validation
const helpfulVoteSchema = z.object({
  reviewId: z.string().uuid("Invalid review ID format"),
});

/**
 * Toggle "helpful" vote on a review.
 * If the user has already voted helpful, removes the vote.
 * Otherwise, adds a helpful vote.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // Rate limit: 30 votes per minute per user
  const rl = await rateLimitByUser(user.id, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらくお待ちください。" },
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

  const parsed = helpfulVoteSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Validation failed";
    return NextResponse.json(
      { error: firstError },
      { status: 400 }
    );
  }

  const { reviewId } = parsed.data;

  // Verify the review exists
  const { data: review } = await supabase
    .from("reviews")
    .select("id")
    .eq("id", reviewId)
    .single();

  if (!review) {
    return NextResponse.json(
      { error: "Review not found" },
      { status: 404 }
    );
  }

  // Check if user has already voted
  const { data: existingVote } = await supabase
    .from("review_votes")
    .select("id")
    .eq("review_id", reviewId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingVote) {
    // Remove vote
    const { error: deleteError } = await supabase
      .from("review_votes")
      .delete()
      .eq("id", existingVote.id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to remove vote" },
        { status: 500 }
      );
    }

    // Atomic decrement of helpful_count (no read-then-write race condition)
    await supabase.rpc("adjust_helpful_count", {
      review_id_param: reviewId,
      delta: -1,
    });

    return NextResponse.json({ voted: false });
  }

  // Add vote
  const { error: insertError } = await supabase
    .from("review_votes")
    .insert({
      review_id: reviewId,
      user_id: user.id,
      helpful: true,
    });

  if (insertError) {
    return NextResponse.json(
      { error: "Failed to add vote" },
      { status: 500 }
    );
  }

  // Atomic increment of helpful_count (no read-then-write race condition)
  await supabase.rpc("adjust_helpful_count", {
    review_id_param: reviewId,
    delta: 1,
  });

  return NextResponse.json({ voted: true });
}
