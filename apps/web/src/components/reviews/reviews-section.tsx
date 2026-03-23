import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RatingSummary } from "./star-rating";
import { ReviewList, type ReviewData } from "./review-list";
import { ReviewForm } from "./review-form";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromUntyped(supabase: SupabaseClient<any>, table: string) {
  return supabase.from(table);
}

interface ReviewsSectionProps {
  problemSetId: string;
  userId: string | null;
}

export async function ReviewsSection({
  problemSetId,
  userId,
}: ReviewsSectionProps) {
  const supabase = await createClient();

  // Fetch reviews
  const { data: reviews } = await fromUntyped(supabase, "reviews")
    .select("id, rating, body, helpful_count, created_at, seller_response, seller_responded_at, user_id")
    .eq("problem_set_id", problemSetId)
    .order("created_at", { ascending: false });

  // Fetch user profiles for reviews
  const userIds = [...new Set((reviews ?? []).map((r: { user_id: string }) => r.user_id))];
  const { data: profiles } = userIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds)
    : { data: [] };

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  );

  const reviewData: ReviewData[] = (reviews ?? []).map((r: {
    id: string;
    rating: number;
    body: string | null;
    helpful_count: number;
    created_at: string;
    seller_response: string | null;
    seller_responded_at: string | null;
    user_id: string;
  }) => {
    const profile = profileMap.get(r.user_id);
    return {
      id: r.id,
      rating: r.rating,
      body: r.body,
      helpful_count: r.helpful_count,
      created_at: r.created_at,
      seller_response: r.seller_response,
      seller_responded_at: r.seller_responded_at,
      user: {
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
      },
    };
  });

  // Calculate summary
  const totalReviews = reviewData.length;
  const averageRating =
    totalReviews > 0
      ? reviewData.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviewData) {
    distribution[r.rating] = (distribution[r.rating] || 0) + 1;
  }

  // Check if current user can review
  let canReview = false;
  let existingReview: { id: string; rating: number; body: string | null } | undefined;

  if (userId) {
    const [purchaseResult, submissionResult] = await Promise.all([
      supabase
        .from("purchases")
        .select("id")
        .eq("user_id", userId)
        .eq("problem_set_id", problemSetId)
        .single(),
      supabase
        .from("submissions")
        .select("id")
        .eq("user_id", userId)
        .eq("problem_set_id", problemSetId)
        .limit(1)
        .single(),
    ]);

    canReview = !!purchaseResult.data && !!submissionResult.data;

    const existing = reviewData.find(
      (r) => r.id && reviewData.some((rd) => rd === r)
    );
    // Check if user already has a review
    const { data: userReview } = await fromUntyped(supabase, "reviews")
      .select("id, rating, body")
      .eq("user_id", userId)
      .eq("problem_set_id", problemSetId)
      .single();

    if (userReview) {
      existingReview = userReview;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">レビュー</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {totalReviews > 0 && (
          <>
            <RatingSummary
              averageRating={averageRating}
              totalReviews={totalReviews}
              distribution={distribution}
            />
            <Separator />
          </>
        )}

        {canReview && (
          <>
            <div>
              <h3 className="mb-3 text-sm font-medium">
                {existingReview ? "レビューを編集" : "レビューを書く"}
              </h3>
              <ReviewForm
                problemSetId={problemSetId}
                existingReview={existingReview}
              />
            </div>
            {totalReviews > 0 && <Separator />}
          </>
        )}

        <ReviewList reviews={reviewData} />
      </CardContent>
    </Card>
  );
}
