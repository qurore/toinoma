"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Star, Users } from "lucide-react";
import { useState, useCallback, useOptimistic } from "react";
import { toast } from "sonner";
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

const SUBJECT_BADGE_COLORS: Record<Subject, string> = {
  math: "bg-blue-100 text-blue-700 border-blue-200",
  english: "bg-emerald-100 text-emerald-700 border-emerald-200",
  japanese: "bg-rose-100 text-rose-700 border-rose-200",
  physics: "bg-amber-100 text-amber-700 border-amber-200",
  chemistry: "bg-violet-100 text-violet-700 border-violet-200",
  biology: "bg-lime-100 text-lime-700 border-lime-200",
  japanese_history: "bg-red-100 text-red-700 border-red-200",
  world_history: "bg-cyan-100 text-cyan-700 border-cyan-200",
  geography: "bg-teal-100 text-teal-700 border-teal-200",
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  hard: "bg-red-50 text-red-700 border-red-200",
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
  purchase_count?: number | null;
}

interface ProblemSetCardProps {
  data: ProblemSetCardData;
  /** Whether the current user has favorited this set */
  isFavorited?: boolean;
  /** Currently authenticated user ID (null = not logged in, hide favorite) */
  userId?: string | null;
  /** Display mode — vertical on desktop, horizontal on mobile */
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
  const roundedRating = Math.round(rating * 10) / 10;

  return (
    <div className="flex items-center gap-1" aria-label={`${roundedRating}星 (${count}件のレビュー)`}>
      <div className="flex items-center" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => {
          // Support half-star rendering for visual fidelity
          const fillPercent = Math.min(1, Math.max(0, rating - (star - 1)));
          const isFull = fillPercent >= 0.75;
          const isHalf = fillPercent >= 0.25 && fillPercent < 0.75;

          return (
            <span key={star} className="relative">
              {/* Background (empty) star */}
              <Star className={cn(starSize, "fill-muted/60 text-muted/60")} />
              {/* Foreground (filled) star with clip */}
              {(isFull || isHalf) && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: isFull ? "100%" : "50%" }}
                >
                  <Star className={cn(starSize, "fill-amber-400 text-amber-400")} />
                </span>
              )}
            </span>
          );
        })}
      </div>
      <span className="text-xs font-medium text-foreground">
        {roundedRating.toFixed(1)}
      </span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </div>
  );
}

// ──────────────────────────────────────────────
// Favorite button (optimistic)
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
  const [optimisticFavorited, addOptimistic] = useOptimistic(
    initialFavorited,
    (_current: boolean, next: boolean) => next
  );
  const [toggling, setToggling] = useState(false);

  const toggleFavorite = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (toggling) return;

      setToggling(true);
      const next = !optimisticFavorited;
      addOptimistic(next);

      try {
        const supabase = createClient();
        if (!next) {
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
        addOptimistic(!next);
        toast.error(next ? "お気に入り登録に失敗しました" : "お気に入り解除に失敗しました");
      } finally {
        setToggling(false);
      }
    },
    [userId, problemSetId, toggling, optimisticFavorited, addOptimistic]
  );

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={toggling}
      aria-label={optimisticFavorited ? "お気に入りから削除" : "お気に入りに追加"}
      aria-pressed={optimisticFavorited}
      className={cn(
        "rounded-full p-2 shadow-sm backdrop-blur-sm transition-all",
        "hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        optimisticFavorited
          ? "bg-white text-red-500"
          : "bg-white/90 text-muted-foreground hover:bg-white"
      )}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-all duration-200",
          optimisticFavorited && "fill-current scale-110"
        )}
      />
    </button>
  );
}

// ──────────────────────────────────────────────
// Price display helper
// ──────────────────────────────────────────────

function PriceTag({
  price,
  variant,
}: {
  price: number;
  variant: "overlay" | "inline";
}) {
  const label = price === 0 ? "無料" : `\u00A5${price.toLocaleString()}`;

  if (variant === "overlay") {
    return (
      <span
        className={cn(
          "rounded-full px-3 py-1 text-xs font-bold shadow-sm",
          price === 0
            ? "bg-primary text-primary-foreground"
            : "bg-white/95 text-foreground backdrop-blur-sm"
        )}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "shrink-0 text-sm font-bold",
        price === 0 ? "text-primary" : "text-foreground"
      )}
    >
      {label}
    </span>
  );
}

// ──────────────────────────────────────────────
// Purchase count display
// ──────────────────────────────────────────────

function PurchaseCount({ count }: { count: number }) {
  if (count === 0) return null;

  const label =
    count >= 1000
      ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`
      : String(count);

  return (
    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
      <Users className="h-3 w-3" aria-hidden="true" />
      <span>{label}人購入</span>
    </span>
  );
}

// ──────────────────────────────────────────────
// Card cover area (shared between layouts)
// ──────────────────────────────────────────────

function CardCover({
  subject,
  coverImageUrl,
  className,
  iconSize = "text-5xl",
  sizes,
}: {
  subject: Subject;
  coverImageUrl?: string | null;
  className?: string;
  iconSize?: string;
  sizes: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center bg-gradient-to-br",
        SUBJECT_GRADIENTS[subject],
        className
      )}
    >
      {coverImageUrl ? (
        <Image
          src={coverImageUrl}
          alt=""
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes={sizes}
        />
      ) : (
        <span
          className={cn(
            "select-none text-white/80 transition-transform duration-300 group-hover:scale-110",
            iconSize
          )}
          aria-hidden="true"
        >
          {SUBJECT_ICONS[subject]}
        </span>
      )}
      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
    </div>
  );
}

// ──────────────────────────────────────────────
// Badges row
// ──────────────────────────────────────────────

function BadgesRow({
  subject,
  difficulty,
  size = "default",
}: {
  subject: Subject;
  difficulty: Difficulty;
  size?: "default" | "sm";
}) {
  const textSize = size === "sm" ? "text-[10px]" : "text-[11px]";

  return (
    <div className="flex items-center gap-1.5">
      <Badge
        className={cn(
          "border font-medium",
          textSize,
          SUBJECT_BADGE_COLORS[subject]
        )}
      >
        {SUBJECT_LABELS[subject]}
      </Badge>
      <Badge
        className={cn(
          "border font-medium",
          textSize,
          DIFFICULTY_COLORS[difficulty]
        )}
      >
        {DIFFICULTY_LABELS[difficulty]}
      </Badge>
    </div>
  );
}

// ──────────────────────────────────────────────
// Rating + meta row
// ──────────────────────────────────────────────

function RatingMeta({
  avgRating,
  reviewCount,
  purchaseCount,
  starSize = "sm",
}: {
  avgRating?: number | null;
  reviewCount?: number | null;
  purchaseCount?: number | null;
  starSize?: "sm" | "xs";
}) {
  const hasRating =
    avgRating != null && reviewCount != null && reviewCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
      {hasRating ? (
        <StarRating rating={avgRating} count={reviewCount} size={starSize} />
      ) : (
        <span className="text-xs text-muted-foreground">
          レビューなし
        </span>
      )}
      {purchaseCount != null && purchaseCount > 0 && (
        <PurchaseCount count={purchaseCount} />
      )}
    </div>
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
  // Horizontal layout (mobile compact)
  if (layout === "horizontal") {
    return (
      <Link
        href={`/problem/${data.id}`}
        className="group block"
        aria-label={`${data.title} - ${SUBJECT_LABELS[data.subject]} ${DIFFICULTY_LABELS[data.difficulty]}`}
      >
        <article className="relative flex h-full overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:border-primary/20 hover:shadow-md">
          {/* Cover / gradient */}
          <CardCover
            subject={data.subject}
            coverImageUrl={data.cover_image_url}
            className="w-28 shrink-0 sm:w-36"
            iconSize="text-3xl"
            sizes="(max-width: 640px) 112px, 144px"
          />

          {/* Content */}
          <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
            <div>
              <div className="mb-1.5">
                <BadgesRow subject={data.subject} difficulty={data.difficulty} size="sm" />
              </div>
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                {data.title}
              </h3>
            </div>

            <div className="mt-2 flex items-end justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <RatingMeta
                  avgRating={data.avg_rating}
                  reviewCount={data.review_count}
                  purchaseCount={data.purchase_count}
                  starSize="xs"
                />
                {data.seller_display_name && (
                  <p className="truncate text-xs text-muted-foreground">
                    {data.seller_display_name}
                  </p>
                )}
              </div>
              <PriceTag price={data.price} variant="inline" />
            </div>
          </div>

          {/* Favorite button */}
          {userId && (
            <div className="absolute right-2 top-2 z-10">
              <FavoriteButton
                userId={userId}
                problemSetId={data.id}
                initialFavorited={isFavorited}
              />
            </div>
          )}
        </article>
      </Link>
    );
  }

  // Default: vertical layout (desktop cards)
  return (
    <Link
      href={`/problem/${data.id}`}
      className="group block"
      aria-label={`${data.title} - ${SUBJECT_LABELS[data.subject]} ${DIFFICULTY_LABELS[data.difficulty]}`}
    >
      <article className="relative h-full overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg">
        {/* Cover image / gradient placeholder */}
        <div className="relative">
          <CardCover
            subject={data.subject}
            coverImageUrl={data.cover_image_url}
            className="h-40 sm:h-44"
            iconSize="text-5xl"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

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
            <PriceTag price={data.price} variant="overlay" />
          </div>
        </div>

        {/* Card body */}
        <div className="p-4">
          {/* Badges row */}
          <div className="mb-2">
            <BadgesRow subject={data.subject} difficulty={data.difficulty} />
          </div>

          {/* Title */}
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
            {data.title}
          </h3>

          {/* University tag */}
          {data.university && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {data.university}
            </p>
          )}

          {/* Rating + purchase count */}
          <div className="mt-2">
            <RatingMeta
              avgRating={data.avg_rating}
              reviewCount={data.review_count}
              purchaseCount={data.purchase_count}
            />
          </div>

          {/* Seller name */}
          {data.seller_display_name && (
            <p className="mt-1.5 truncate text-xs text-muted-foreground">
              {data.seller_display_name}
            </p>
          )}
        </div>
      </article>
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
      <div className="flex overflow-hidden rounded-xl border border-border" role="presentation">
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
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-1 h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border" role="presentation">
      <Skeleton className="h-40 w-full rounded-none sm:h-44" />
      <div className="p-4">
        <div className="mb-2 flex gap-1.5">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-1 h-4 w-3/4" />
        <Skeleton className="mt-2 h-3 w-28" />
        <Skeleton className="mt-1.5 h-3 w-20" />
      </div>
    </div>
  );
}
