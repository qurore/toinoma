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

// ── Rating summary with distribution histogram ──────────────────────────

interface RatingSummaryProps {
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>;
  onFilterByStar?: (star: number | null) => void;
  activeStar?: number | null;
}

const STAR_LABELS: Record<number, string> = {
  5: "最高",
  4: "良い",
  3: "普通",
  2: "やや不満",
  1: "不満",
};

export function RatingSummary({
  averageRating,
  totalReviews,
  distribution,
  onFilterByStar,
  activeStar,
}: RatingSummaryProps) {
  // Find the max count to normalize bar widths relative to each other
  const maxCount = Math.max(...Object.values(distribution), 1);

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
      {/* Average rating (left column) */}
      <div className="flex shrink-0 flex-col items-center sm:w-32">
        <p className="text-5xl font-bold tracking-tight">
          {averageRating.toFixed(1)}
        </p>
        <div className="mt-1.5">
          <StarRating rating={averageRating} size="md" />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {totalReviews.toLocaleString()}件のレビュー
        </p>
      </div>

      {/* Distribution histogram (right column) */}
      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] || 0;
          const percentage =
            totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
          // Normalize bar fill relative to the most popular rating for visual impact
          const barWidth =
            maxCount > 0 ? (count / maxCount) * 100 : 0;
          const isActive = activeStar === star;

          return (
            <button
              key={star}
              type="button"
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-md px-2 py-1 text-sm transition-all",
                onFilterByStar
                  ? "cursor-pointer hover:bg-muted/80"
                  : "cursor-default",
                isActive && "bg-primary/5 ring-1 ring-primary/20"
              )}
              onClick={() => {
                if (!onFilterByStar) return;
                onFilterByStar(isActive ? null : star);
              }}
              aria-label={`${star}星（${STAR_LABELS[star]}）のレビューを${isActive ? "フィルター解除" : "表示"}：${count}件 (${percentage}%)`}
              aria-pressed={isActive}
              disabled={!onFilterByStar}
            >
              {/* Star label */}
              <span
                className={cn(
                  "flex w-5 items-center justify-end gap-0.5 tabular-nums",
                  isActive ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {star}
              </span>
              <Star
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  isActive ? "text-amber-500" : "text-amber-400"
                )}
                fill="currentColor"
              />

              {/* Bar track */}
              <div className="relative h-3 flex-1 overflow-hidden rounded-sm bg-muted/60">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-sm transition-all duration-300",
                    isActive
                      ? "bg-amber-500"
                      : "bg-amber-400/80 group-hover:bg-amber-400"
                  )}
                  style={{ width: `${Math.max(barWidth, count > 0 ? 2 : 0)}%` }}
                />
              </div>

              {/* Percentage + count */}
              <span
                className={cn(
                  "w-20 text-right text-xs tabular-nums",
                  isActive
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {percentage}%
                <span className="ml-1 text-muted-foreground/60">
                  ({count})
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
