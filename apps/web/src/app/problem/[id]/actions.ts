"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyReview } from "@/lib/notifications";

interface SubmitReviewInput {
  problemSetId: string;
  rating: number;
  body: string | null;
}

export async function submitReview({ problemSetId, rating, body }: SubmitReviewInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  if (rating < 1 || rating > 5) {
    return { error: "評価は1〜5の範囲で選択してください" };
  }

  if (body && (body.length < 10 || body.length > 500)) {
    return { error: "レビューは10〜500文字で入力してください" };
  }

  // Verify purchase exists
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("problem_set_id", problemSetId)
    .single();

  if (!purchase) {
    return { error: "購入後にレビューできます" };
  }

  // Verify at least one submission exists
  const { data: submission } = await supabase
    .from("submissions")
    .select("id")
    .eq("user_id", user.id)
    .eq("problem_set_id", problemSetId)
    .limit(1)
    .single();

  if (!submission) {
    return { error: "回答を提出後にレビューできます" };
  }

  // Upsert review (one per user per set)
  const { error } = await supabase.from("reviews").upsert(
    {
      user_id: user.id,
      problem_set_id: problemSetId,
      rating,
      body,
    },
    { onConflict: "user_id,problem_set_id" }
  );

  if (error) {
    return { error: "レビューの投稿に失敗しました" };
  }

  // Notify seller of new review (fire-and-forget)
  const { data: ps } = await supabase
    .from("problem_sets")
    .select("seller_id")
    .eq("id", problemSetId)
    .single();

  if (ps && ps.seller_id !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const reviewerName = profile?.display_name ?? "ユーザー";
    notifyReview(ps.seller_id, reviewerName, rating, problemSetId).catch(
      () => {}
    );
  }

  revalidatePath(`/problem/${problemSetId}`);
  return { success: true };
}

export async function submitSellerResponse(reviewId: string, response: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  if (!response || response.length < 1 || response.length > 500) {
    return { error: "返信は1〜500文字で入力してください" };
  }

  // Verify the review belongs to the seller's problem set
  const { data: review } = await supabase.from("reviews")
    .select("problem_set_id")
    .eq("id", reviewId)
    .single();

  if (!review) {
    return { error: "レビューが見つかりません" };
  }

  const { data: ps } = await supabase
    .from("problem_sets")
    .select("seller_id")
    .eq("id", review.problem_set_id)
    .eq("seller_id", user.id)
    .single();

  if (!ps) {
    return { error: "自分の問題セットのレビューにのみ返信できます" };
  }

  const { error } = await supabase.from("reviews")
    .update({
      seller_response: response,
      seller_responded_at: new Date().toISOString(),
    })
    .eq("id", reviewId);

  if (error) {
    return { error: "返信の投稿に失敗しました" };
  }

  revalidatePath(`/problem/${review.problem_set_id}`);
  return { success: true };
}
