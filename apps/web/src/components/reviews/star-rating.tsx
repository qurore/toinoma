"use client";

import { useState, useCallback } from "react";
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

const BUTTON_SIZES = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-7 w-7",
} as const;

export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onChange,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const iconClass = SIZES[size];
  const btnClass = BUTTON_SIZES[size];

  // The displayed rating: if hovering, show hover preview; otherwise show actual
  const displayRating = interactive && hoverRating > 0 ? hoverRating : rating;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentStar: number) => {
      if (!interactive || !onChange) return;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowUp":
          e.preventDefault();
          onChange(Math.min(currentStar + 1, maxRating));
          break;
        case "ArrowLeft":
        case "ArrowDown":
          e.preventDefault();
          onChange(Math.max(currentStar - 1, 1));
          break;
        case "Home":
          e.preventDefault();
          onChange(1);
          break;
        case "End":
          e.preventDefault();
          onChange(maxRating);
          break;
      }
    },
    [interactive, onChange, maxRating]
  );

  return (
    <div
      className="flex items-center gap-0.5"
      role={interactive ? "radiogroup" : "img"}
      aria-label={
        interactive
          ? "評価を選択"
          : `${displayRating}/${maxRating}星`
      }
      onMouseLeave={() => interactive && setHoverRating(0)}
    >
      {Array.from({ length: maxRating }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= Math.floor(displayRating);
        const halfFilled =
          !filled && starValue - 0.5 <= displayRating && starValue > displayRating;

        if (interactive) {
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={rating === starValue}
              aria-label={`${starValue}星`}
              tabIndex={rating === starValue ? 0 : -1}
              onClick={() => onChange?.(starValue)}
              onMouseEnter={() => setHoverRating(starValue)}
              onKeyDown={(e) => handleKeyDown(e, rating)}
              className={cn(
                "relative flex items-center justify-center rounded-sm transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                btnClass,
                "cursor-pointer hover:scale-110"
              )}
            >
              {/* Background star (empty) */}
              <Star
                className={cn(iconClass, "text-muted-foreground/20")}
                fill="currentColor"
              />
              {/* Foreground star (filled or half) */}
              {(filled || halfFilled) && (
                <Star
                  className={cn(
                    iconClass,
                    "absolute text-amber-400",
                    halfFilled && "[clip-path:inset(0_50%_0_0)]"
                  )}
                  fill="currentColor"
                />
              )}
            </button>
          );
        }

        // Display-only mode
        return (
          <span
            key={i}
            className="relative inline-flex"
            aria-hidden="true"
          >
            <Star
              className={cn(iconClass, "text-muted-foreground/20")}
              fill="currentColor"
            />
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
          </span>
        );
      })}
    </div>
  );
}

// ── Rating summary with distribution bars ──────────────────────────────

interface RatingSummaryProps {
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>;
  onFilterByStar?: (star: number | null) => void;
  activeStar?: number | null;
}

export function RatingSummary({
  averageRating,
  totalReviews,
  distribution,
  onFilterByStar,
  activeStar,
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
          const percentage =
            totalReviews > 0 ? (count / totalReviews) * 100 : 0;
          const isActive = activeStar === star;

          return (
            <button
              key={star}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-1 py-0.5 text-sm transition-colors",
                onFilterByStar && "cursor-pointer hover:bg-muted",
                isActive && "bg-muted"
              )}
              onClick={() => {
                if (!onFilterByStar) return;
                onFilterByStar(isActive ? null : star);
              }}
              aria-label={`${star}星のレビューを${isActive ? "フィルター解除" : "表示"}`}
              aria-pressed={isActive}
              disabled={!onFilterByStar}
            >
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
              <span className="w-10 text-right text-xs text-muted-foreground">
                {count}件
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
