"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Star } from "lucide-react";
import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

// ──────────────────────────────────────────────
// Subject visual mappings
// ──────────────────────────────────────────────

const SUBJECT_GRADIENTS: Record<Subject, string> = {
  math: "from-blue-500/80 to-indigo-600/80",
  english: "from-emerald-500/80 to-teal-600/80",
  japanese: "from-rose-500/80 to-pink-600/80",
  physics: "from-amber-500/80 to-orange-600/80",
  chemistry: "from-violet-500/80 to-purple-600/80",
  biology: "from-lime-500/80 to-green-600/80",
  japanese_history: "from-red-500/80 to-rose-600/80",
  world_history: "from-cyan-500/80 to-sky-600/80",
  geography: "from-teal-500/80 to-emerald-600/80",
};

const SUBJECT_ICONS: Record<Subject, string> = {
  math: "\u2211",
  english: "Aa",
  japanese: "\u3042",
  physics: "\u26A1",
  chemistry: "\u2697",
  biology: "\uD83E\uDDEC",
  japanese_history: "\u26E9",
  world_history: "\uD83C\uDF0D",
  geography: "\uD83D\uDDFA",
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  hard: "bg-red-100 text-red-700 border-red-200",
};

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface ProblemSetCardData {
  id: string;
  title: string;
  subject: Subject;
  difficulty: Difficulty;
  price: number;
  cover_image_url?: string | null;
  university?: string | null;
  seller_display_name?: string | null;
  avg_rating?: number | null;
  review_count?: number | null;
}

interface ProblemSetCardProps {
  data: ProblemSetCardData;
  /** Whether the current user has favorited this set */
  isFavorited?: boolean;
  /** Currently authenticated user ID (null = not logged in, hide favorite) */
  userId?: string | null;
  /** Display mode */
  layout?: "vertical" | "horizontal";
}

// ──────────────────────────────────────────────
// Star rating display
// ──────────────────────────────────────────────

function StarRating({
  rating,
  count,
  size = "sm",
}: {
  rating: number;
  count: number;
  size?: "sm" | "xs";
}) {
  const starSize = size === "sm" ? "h-3.5 w-3.5" : "h-3 w-3";
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              starSize,
              star <= Math.round(rating)
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted"
            )}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-foreground">
        {rating.toFixed(1)}
      </span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </div>
  );
}

// ──────────────────────────────────────────────
// Favorite button (isolated for event handling)
// ──────────────────────────────────────────────

function FavoriteButton({
  userId,
  problemSetId,
  initialFavorited,
}: {
  userId: string;
  problemSetId: string;
  initialFavorited: boolean;
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [toggling, setToggling] = useState(false);

  const toggleFavorite = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (toggling) return;

      setToggling(true);
      const prev = favorited;
      setFavorited(!prev);

      try {
        const supabase = createClient();
        if (prev) {
          await supabase
            .from("favorites")
            .delete()
            .eq("user_id", userId)
            .eq("problem_set_id", problemSetId);
        } else {
          await supabase
            .from("favorites")
            .insert({ user_id: userId, problem_set_id: problemSetId });
        }
      } catch {
        // Revert on error
        setFavorited(prev);
      } finally {
        setToggling(false);
      }
    },
    [userId, problemSetId, toggling, favorited]
  );

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={toggling}
      aria-label={favorited ? "お気に入りから削除" : "お気に入りに追加"}
      className="rounded-full bg-white/90 p-2 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md active:scale-95"
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-colors",
          favorited
            ? "fill-red-500 text-red-500"
            : "text-muted-foreground"
        )}
      />
    </button>
  );
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────

export function ProblemSetCard({
  data,
  isFavorited = false,
  userId = null,
  layout = "vertical",
}: ProblemSetCardProps) {
  const priceLabel =
    data.price === 0 ? "無料" : `¥${data.price.toLocaleString()}`;

  const hasRating =
    data.avg_rating != null &&
    data.review_count != null &&
    data.review_count > 0;

  if (layout === "horizontal") {
    return (
      <Link href={`/problem/${data.id}`} className="group block">
        <div className="relative flex h-full overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:border-primary/20 hover:shadow-md">
          {/* Cover / gradient */}
          <div
            className={cn(
              "relative flex w-28 shrink-0 items-center justify-center bg-gradient-to-br sm:w-36",
              SUBJECT_GRADIENTS[data.subject]
            )}
          >
            {data.cover_image_url ? (
              <Image
                src={data.cover_image_url}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 640px) 112px, 144px"
              />
            ) : (
              <span className="text-3xl text-white/80">
                {SUBJECT_ICONS[data.subject]}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
            <div>
              {/* Badges */}
              <div className="mb-1.5 flex items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className="text-[10px] font-medium"
                >
                  {SUBJECT_LABELS[data.subject]}
                </Badge>
                <Badge
                  className={cn(
                    "border text-[10px] font-medium",
                    DIFFICULTY_COLORS[data.difficulty]
                  )}
                >
                  {DIFFICULTY_LABELS[data.difficulty]}
                </Badge>
              </div>

              {/* Title */}
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                {data.title}
              </h3>
            </div>

            <div className="mt-2 flex items-end justify-between">
              <div className="min-w-0">
                {/* Rating */}
                {hasRating ? (
                  <StarRating
                    rating={data.avg_rating!}
                    count={data.review_count!}
                    size="xs"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    レビューなし
                  </span>
                )}

                {/* Seller name */}
                {data.seller_display_name && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {data.seller_display_name}
                  </p>
                )}
              </div>

              {/* Price */}
              <span
                className={cn(
                  "shrink-0 text-sm font-bold",
                  data.price === 0 ? "text-primary" : "text-foreground"
                )}
              >
                {priceLabel}
              </span>
            </div>
          </div>

          {/* Favorite button */}
          {userId && (
            <div className="absolute right-2 top-2">
              <FavoriteButton
                userId={userId}
                problemSetId={data.id}
                initialFavorited={isFavorited}
              />
            </div>
          )}
        </div>
      </Link>
    );
  }

  // Default: vertical layout
  return (
    <Link href={`/problem/${data.id}`} className="group block">
      <div className="relative h-full overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg">
        {/* Cover image / gradient placeholder */}
        <div
          className={cn(
            "relative flex h-40 items-center justify-center bg-gradient-to-br sm:h-44",
            SUBJECT_GRADIENTS[data.subject]
          )}
        >
          {data.cover_image_url ? (
            <Image
              src={data.cover_image_url}
              alt=""
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <span className="text-5xl text-white/80 transition-transform duration-300 group-hover:scale-110">
              {SUBJECT_ICONS[data.subject]}
            </span>
          )}

          {/* Gradient overlay on cover for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

          {/* Favorite button overlay */}
          {userId && (
            <div className="absolute right-2.5 top-2.5 z-10">
              <FavoriteButton
                userId={userId}
                problemSetId={data.id}
                initialFavorited={isFavorited}
              />
            </div>
          )}

          {/* Price badge overlay */}
          <div className="absolute bottom-2.5 right-2.5">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold shadow-sm",
                data.price === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-white text-foreground"
              )}
            >
              {priceLabel}
            </span>
          </div>
        </div>

        {/* Card body */}
        <div className="p-4">
          {/* Badges row */}
          <div className="mb-2 flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] font-medium">
              {SUBJECT_LABELS[data.subject]}
            </Badge>
            <Badge
              className={cn(
                "border text-[10px] font-medium",
                DIFFICULTY_COLORS[data.difficulty]
              )}
            >
              {DIFFICULTY_LABELS[data.difficulty]}
            </Badge>
          </div>

          {/* Title */}
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
            {data.title}
          </h3>

          {/* Rating row */}
          <div className="mt-2">
            {hasRating ? (
              <StarRating
                rating={data.avg_rating!}
                count={data.review_count!}
              />
            ) : (
              <span className="text-xs text-muted-foreground">
                レビューなし
              </span>
            )}
          </div>

          {/* Seller name */}
          {data.seller_display_name && (
            <p className="mt-1.5 truncate text-xs text-muted-foreground">
              {data.seller_display_name}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ──────────────────────────────────────────────
// Skeleton loading variant
// ──────────────────────────────────────────────

export function ProblemSetCardSkeleton({
  layout = "vertical",
}: {
  layout?: "vertical" | "horizontal";
}) {
  if (layout === "horizontal") {
    return (
      <div className="flex overflow-hidden rounded-xl border border-border">
        <Skeleton className="h-28 w-28 shrink-0 rounded-none sm:w-36" />
        <div className="flex flex-1 flex-col justify-between p-4">
          <div>
            <div className="mb-1.5 flex gap-1.5">
              <Skeleton className="h-4 w-12 rounded-full" />
              <Skeleton className="h-4 w-10 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-2/3" />
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-1 h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Skeleton className="h-40 w-full rounded-none sm:h-44" />
      <div className="p-4">
        <div className="mb-2 flex gap-1.5">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-1 h-4 w-3/4" />
        <Skeleton className="mt-2 h-3 w-24" />
        <Skeleton className="mt-1.5 h-3 w-20" />
      </div>
    </div>
  );
}
