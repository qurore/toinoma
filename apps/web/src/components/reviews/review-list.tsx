import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { ThumbsUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "./star-rating";

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
}

interface ReviewListProps {
  reviews: ReviewData[];
}

export function ReviewList({ reviews }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        まだレビューがありません
      </p>
    );
  }

  return (
    <div className="divide-y">
      {reviews.map((review) => (
        <ReviewItem key={review.id} review={review} />
      ))}
    </div>
  );
}

function ReviewItem({ review }: { review: ReviewData }) {
  const initials = (review.user.display_name ?? "?")
    .slice(0, 2)
    .toUpperCase();

  const timeAgo = formatDistanceToNow(new Date(review.created_at), {
    addSuffix: true,
    locale: ja,
  });

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={review.user.avatar_url ?? undefined}
            alt={review.user.display_name ?? "User"}
          />
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {review.user.display_name ?? "匿名ユーザー"}
            </span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
          <StarRating rating={review.rating} size="sm" />
        </div>
      </div>

      {/* Body */}
      {review.body && (
        <p className="mt-2 text-sm leading-relaxed text-foreground/80">
          {review.body}
        </p>
      )}

      {/* Helpful */}
      <div className="mt-2 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
        >
          <ThumbsUp className="h-3 w-3" />
          参考になった ({review.helpful_count})
        </Button>
      </div>

      {/* Seller response */}
      {review.seller_response && (
        <div className="ml-8 mt-3 rounded-md border-l-2 border-primary/30 bg-muted/30 p-3">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs">
              出品者
            </Badge>
            {review.seller_responded_at && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(review.seller_responded_at), {
                  addSuffix: true,
                  locale: ja,
                })}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-foreground/80">
            {review.seller_response}
          </p>
        </div>
      )}
    </div>
  );
}
