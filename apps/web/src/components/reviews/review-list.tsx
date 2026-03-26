"use client";

import { useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StarRating } from "./star-rating";
import { ReportDialog } from "@/components/marketplace/report-dialog";

export interface ReviewData {
  id: string;
  rating: number;
  body: string | null;
  helpful_count: number;
  created_at: string;
  seller_response: string | null;
  seller_responded_at: string | null;
  user: {
    display_name: string | null;
    avatar_url: string | null;
  };
  user_has_voted_helpful?: boolean;
}

interface ReviewListProps {
  reviews: ReviewData[];
  problemSetId?: string;
  userId?: string | null;
}

export function ReviewList({ reviews, problemSetId, userId }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        まだレビューがありません
      </p>
    );
  }

  return (
    <div className="space-y-0 divide-y divide-border/60">
      {reviews.map((review) => (
        <ReviewItem
          key={review.id}
          review={review}
          problemSetId={problemSetId}
          userId={userId}
        />
      ))}
    </div>
  );
}

function ReviewItem({
  review,
  problemSetId,
  userId,
}: {
  review: ReviewData;
  problemSetId?: string;
  userId?: string | null;
}) {
  const [optimisticCount, setOptimisticCount] = useState(
    review.helpful_count
  );
  const [optimisticVoted, setOptimisticVoted] = useState(
    review.user_has_voted_helpful ?? false
  );
  const [isVoting, setIsVoting] = useState(false);

  const initials = (review.user.display_name ?? "?")
    .slice(0, 2)
    .toUpperCase();

  const timeAgo = formatDistanceToNow(new Date(review.created_at), {
    addSuffix: true,
    locale: ja,
  });

  const handleHelpful = useCallback(async () => {
    if (!userId) {
      toast.error("ログインが必要です");
      return;
    }

    // Optimistic update
    const wasVoted = optimisticVoted;
    setOptimisticVoted(!wasVoted);
    setOptimisticCount((prev) => (wasVoted ? prev - 1 : prev + 1));
    setIsVoting(true);

    try {
      const res = await fetch("/api/reviews/helpful", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: review.id }),
      });

      if (!res.ok) {
        // Revert
        setOptimisticVoted(wasVoted);
        setOptimisticCount((prev) => (wasVoted ? prev + 1 : prev - 1));
        toast.error("操作に失敗しました");
      }
    } catch {
      // Revert
      setOptimisticVoted(wasVoted);
      setOptimisticCount((prev) => (wasVoted ? prev + 1 : prev - 1));
      toast.error("操作に失敗しました");
    } finally {
      setIsVoting(false);
    }
  }, [userId, optimisticVoted, review.id]);

  return (
    <article className="py-5 first:pt-0 last:pb-0">
      {/* Header: avatar + name + date + rating */}
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border">
          <AvatarImage
            src={review.user.avatar_url ?? undefined}
            alt={review.user.display_name ?? "User"}
          />
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-sm font-semibold text-foreground">
              {review.user.display_name ?? "匿名ユーザー"}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {timeAgo}
            </span>
          </div>
          <div className="mt-0.5">
            <StarRating rating={review.rating} size="sm" />
          </div>
        </div>
      </div>

      {/* Body */}
      {review.body && (
        <p className="mt-3 text-sm leading-relaxed text-foreground/80">
          {review.body}
        </p>
      )}

      {/* Actions: helpful + report */}
      <div className="mt-3 flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 gap-1.5 rounded-full px-3 text-xs ${
            optimisticVoted
              ? "bg-primary/5 text-primary hover:bg-primary/10"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={handleHelpful}
          disabled={isVoting}
          aria-pressed={optimisticVoted}
          aria-label={`参考になった (${optimisticCount})`}
        >
          {isVoting && (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}
          参考になった
          {optimisticCount > 0 && (
            <span className="tabular-nums">({optimisticCount})</span>
          )}
        </Button>

        {/* Report button */}
        {userId && problemSetId && (
          <ReportDialog
            targetType="review"
            targetId={review.id}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"
              >
                報告
              </Button>
            }
          />
        )}
      </div>

      {/* Seller response */}
      {review.seller_response && (
        <div className="ml-6 mt-4 rounded-lg border border-border/60 bg-muted/30 p-4 sm:ml-12">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground">
              出品者からの返信
            </span>
            {review.seller_responded_at && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(
                  new Date(review.seller_responded_at),
                  {
                    addSuffix: true,
                    locale: ja,
                  }
                )}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">
            {review.seller_response}
          </p>
        </div>
      )}
    </article>
  );
}
