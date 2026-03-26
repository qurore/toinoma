"use client";

import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RatingSummary } from "./star-rating";
import { ReviewList, type ReviewData } from "./review-list";

type SortOption = "newest" | "oldest" | "highest" | "lowest" | "most_helpful";

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "newest", label: "新しい順" },
  { value: "oldest", label: "古い順" },
  { value: "highest", label: "評価が高い順" },
  { value: "lowest", label: "評価が低い順" },
  { value: "most_helpful", label: "参考になった順" },
];

interface ReviewsSectionClientProps {
  reviews: ReviewData[];
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>;
  problemSetId: string;
  userId: string | null;
}

export function ReviewsSectionClient({
  reviews,
  averageRating,
  totalReviews,
  distribution,
  problemSetId,
  userId,
}: ReviewsSectionClientProps) {
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterStar, setFilterStar] = useState<number | null>(null);

  const filteredAndSorted = useMemo(() => {
    let result = reviews;

    // Filter by star rating
    if (filterStar !== null) {
      result = result.filter((r) => r.rating === filterStar);
    }

    // Sort
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );
        case "oldest":
          return (
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
          );
        case "highest":
          return b.rating - a.rating;
        case "lowest":
          return a.rating - b.rating;
        case "most_helpful":
          return b.helpful_count - a.helpful_count;
        default:
          return 0;
      }
    });
  }, [reviews, sortBy, filterStar]);

  if (totalReviews === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        まだレビューがありません
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating summary with clickable distribution bars for filtering */}
      <RatingSummary
        averageRating={averageRating}
        totalReviews={totalReviews}
        distribution={distribution}
        onFilterByStar={setFilterStar}
        activeStar={filterStar}
      />

      <Separator />

      {/* Sort control + filter indicator */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">
            {filterStar !== null
              ? `${filterStar}星のレビュー`
              : "すべてのレビュー"}
          </p>
          <span className="text-sm text-muted-foreground">
            ({filteredAndSorted.length}件)
          </span>
          {filterStar !== null && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 rounded-full px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setFilterStar(null)}
            >
              <X className="h-3 w-3" />
              解除
            </Button>
          )}
        </div>
        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as SortOption)}
        >
          <SelectTrigger className="w-[160px]" aria-label="並び替え">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Review list */}
      <ReviewList
        reviews={filteredAndSorted}
        problemSetId={problemSetId}
        userId={userId}
      />
    </div>
  );
}
