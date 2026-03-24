import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ReviewsSectionClient } from "./reviews-section-client";
import { ReviewForm } from "./review-form";
import type { ReviewData } from "./review-list";

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
  const { data: reviews } = await supabase
    .from("reviews")
    .select(
      "id, rating, body, helpful_count, created_at, seller_response, seller_responded_at, user_id"
    )
    .eq("problem_set_id", problemSetId)
    .order("created_at", { ascending: false });

  // Fetch user profiles for reviews
  const userIds = [
    ...new Set(
      (reviews ?? []).map((r: { user_id: string }) => r.user_id)
    ),
  ];
  const { data: profiles } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", userIds)
      : { data: [] };

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  );

  // Check which reviews the current user has marked as helpful
  let helpfulSet = new Set<string>();
  if (userId) {
    const reviewIds = (reviews ?? []).map(
      (r: { id: string }) => r.id
    );
    if (reviewIds.length > 0) {
      const { data: helpfulVotes } = await supabase
        .from("review_votes")
        .select("review_id")
        .eq("user_id", userId)
        .in("review_id", reviewIds);
      helpfulSet = new Set(
        (helpfulVotes ?? []).map((v) => v.review_id)
      );
    }
  }

  const reviewData: ReviewData[] = (reviews ?? []).map(
    (r: {
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
        user_has_voted_helpful: helpfulSet.has(r.id),
      };
    }
  );

  // Calculate summary
  const totalReviews = reviewData.length;
  const averageRating =
    totalReviews > 0
      ? reviewData.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

  const distribution: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const r of reviewData) {
    distribution[r.rating] = (distribution[r.rating] || 0) + 1;
  }

  // Check if current user can review
  let canReview = false;
  let existingReview:
    | { id: string; rating: number; body: string | null }
    | undefined;

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

    // User can review only if they have BOTH purchased AND submitted at least one answer
    canReview = !!purchaseResult.data && !!submissionResult.data;

    // Check if user already has a review (for edit mode)
    const { data: userReview } = await supabase
      .from("reviews")
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
        <h2 className="font-display text-base font-semibold leading-none tracking-tight">
          レビュー
        </h2>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Review form -- for eligible users */}
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

        {/* Rating summary + review list with sort/filter (client component) */}
        <ReviewsSectionClient
          reviews={reviewData}
          averageRating={averageRating}
          totalReviews={totalReviews}
          distribution={distribution}
          problemSetId={problemSetId}
          userId={userId}
        />
      </CardContent>
    </Card>
  );
}
