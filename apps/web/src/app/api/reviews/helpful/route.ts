import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  let body: { reviewId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { reviewId } = body;
  if (!reviewId || typeof reviewId !== "string") {
    return NextResponse.json(
      { error: "reviewId is required" },
      { status: 400 }
    );
  }

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

    // Decrement helpful_count
    const { data: current } = await supabase
      .from("reviews")
      .select("helpful_count")
      .eq("id", reviewId)
      .single();

    if (current) {
      await supabase
        .from("reviews")
        .update({
          helpful_count: Math.max(0, (current.helpful_count ?? 0) - 1),
        })
        .eq("id", reviewId);
    }

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

  // Increment helpful_count
  const { data: current } = await supabase
    .from("reviews")
    .select("helpful_count")
    .eq("id", reviewId)
    .single();

  if (current) {
    await supabase
      .from("reviews")
      .update({
        helpful_count: (current.helpful_count ?? 0) + 1,
      })
      .eq("id", reviewId);
  }

  return NextResponse.json({ voted: true });
}
