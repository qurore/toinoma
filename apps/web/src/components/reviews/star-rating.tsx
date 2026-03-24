"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

const SIZES = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const;

export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onChange,
}: StarRatingProps) {
  const iconClass = SIZES[size];

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={`${rating}/${maxRating}星`}>
      {Array.from({ length: maxRating }, (_, i) => {
        const filled = i < Math.floor(rating);
        const halfFilled = !filled && i < rating;

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(i + 1)}
            className={cn(
              "relative",
              interactive && "cursor-pointer transition-transform hover:scale-110",
              !interactive && "cursor-default"
            )}
            aria-label={`${i + 1}星`}
          >
            {/* Background star (empty) */}
            <Star
              className={cn(iconClass, "text-muted-foreground/20")}
              fill="currentColor"
            />
            {/* Foreground star (filled) */}
            {(filled || halfFilled) && (
              <Star
                className={cn(
                  iconClass,
                  "absolute inset-0 text-amber-400",
                  halfFilled && "[clip-path:inset(0_50%_0_0)]"
                )}
                fill="currentColor"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

interface RatingSummaryProps {
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>;
}

export function RatingSummary({
  averageRating,
  totalReviews,
  distribution,
}: RatingSummaryProps) {
  return (
    <div className="flex items-start gap-6">
      {/* Average */}
      <div className="text-center">
        <p className="text-4xl font-bold">{averageRating.toFixed(1)}</p>
        <StarRating rating={averageRating} size="sm" />
        <p className="mt-1 text-xs text-muted-foreground">
          {totalReviews}件のレビュー
        </p>
      </div>
      {/* Distribution bars */}
      <div className="flex-1 space-y-1">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] || 0;
          const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-sm">
              <span className="w-6 text-right text-muted-foreground">
                {star}
              </span>
              <Star className="h-3 w-3 text-amber-400" fill="currentColor" />
              <div className="h-2 flex-1 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${Math.max(percentage, 0)}%` }}
                />
              </div>
              <span className="w-8 text-right text-xs text-muted-foreground">
                {Math.round(percentage)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
