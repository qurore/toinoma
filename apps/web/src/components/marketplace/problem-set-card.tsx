"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Star } from "lucide-react";
import { useState, useCallback, useOptimistic } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

// ──────────────────────────────────────────────
// Visual design — monochromatic, Udemy-style clean
// No colorful badges — subtle, professional look
// ──────────────────────────────────────────────

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
              <Star className={cn(starSize, "fill-muted/40 text-muted/40")} />
              {/* Foreground (filled) star with clip */}
              {(isFull || isHalf) && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: isFull ? "100%" : "50%" }}
                >
                  <Star className={cn(starSize, "fill-amber-400/80 text-amber-400/80")} />
                </span>
              )}
            </span>
          );
        })}
      </div>
      <span className="text-xs font-medium text-muted-foreground">
        {roundedRating.toFixed(1)}
      </span>
      <span className="text-xs text-muted-foreground/70">({count})</span>
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

function PriceTag({ price }: { price: number }) {
  if (price === 0) {
    return (
      <span className="shrink-0 text-sm font-semibold text-emerald-600">
        無料
      </span>
    );
  }

  return (
    <span className="shrink-0 text-base font-bold text-foreground">
      ¥{price.toLocaleString()}
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
    <span className="text-xs text-muted-foreground">
      {label}人が購入
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
  sizes,
}: {
  subject: Subject;
  coverImageUrl?: string | null;
  className?: string;
  sizes: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center bg-gradient-to-br from-primary-700 to-primary-900",
        className
      )}
    >
      {coverImageUrl ? (
        <Image
          src={coverImageUrl}
          alt=""
          fill
          className="object-cover"
          sizes={sizes}
        />
      ) : (
        <span
          className="select-none text-3xl font-bold text-white/20"
          aria-hidden="true"
        >
          {SUBJECT_LABELS[subject]}
        </span>
      )}
      {/* Subtle gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
    </div>
  );
}

// ──────────────────────────────────────────────
// Subject / difficulty meta line (text-only, no badges)
// ──────────────────────────────────────────────

function MetaLine({
  subject,
  difficulty,
  size = "default",
}: {
  subject: Subject;
  difficulty: Difficulty;
  size?: "default" | "sm";
}) {
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <span className={cn("text-muted-foreground", textSize)}>
      {SUBJECT_LABELS[subject]}
      <span className="mx-1" aria-hidden="true">·</span>
      {DIFFICULTY_LABELS[difficulty]}
    </span>
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
      <div className="group relative">
        <Link
          href={`/problem/${data.id}`}
          className="block"
          aria-label={`${data.title} - ${SUBJECT_LABELS[data.subject]} ${DIFFICULTY_LABELS[data.difficulty]}`}
        >
          <article className="flex h-full overflow-hidden rounded-lg border border-border bg-card transition-shadow duration-200 hover:shadow-md">
            {/* Cover / gradient */}
            <CardCover
              subject={data.subject}
              coverImageUrl={data.cover_image_url}
              className="w-28 shrink-0 sm:w-36"
              sizes="(max-width: 640px) 112px, 144px"
            />

            {/* Content */}
            <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
              <div>
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                  {data.title}
                </h3>
                <div className="mt-1">
                  <MetaLine subject={data.subject} difficulty={data.difficulty} size="sm" />
                </div>
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
                <PriceTag price={data.price} />
              </div>
            </div>
          </article>
        </Link>

        {/* Favorite button — outside Link to avoid nested interactive elements */}
        {userId && (
          <div className="absolute right-2 top-2 z-10">
            <FavoriteButton
              userId={userId}
              problemSetId={data.id}
              initialFavorited={isFavorited}
            />
          </div>
        )}
      </div>
    );
  }

  // Default: vertical layout (desktop cards)
  return (
    <div className="group relative">
      <Link
        href={`/problem/${data.id}`}
        className="block"
        aria-label={`${data.title} - ${SUBJECT_LABELS[data.subject]} ${DIFFICULTY_LABELS[data.difficulty]}`}
      >
        <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow duration-200 hover:shadow-md">
          {/* Cover image / gradient placeholder */}
          <div className="relative">
            <CardCover
              subject={data.subject}
              coverImageUrl={data.cover_image_url}
              className="h-36 sm:h-40"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>

        {/* Card body */}
        <div className="flex flex-1 flex-col p-3.5">
          {/* Title */}
          <h3 className="line-clamp-2 text-sm font-bold leading-snug transition-colors group-hover:text-primary">
            {data.title}
          </h3>

          {/* Subject / difficulty / university as a single text line */}
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {SUBJECT_LABELS[data.subject]}
            <span className="mx-1" aria-hidden="true">·</span>
            {DIFFICULTY_LABELS[data.difficulty]}
            {data.university && (
              <>
                <span className="mx-1" aria-hidden="true">·</span>
                {data.university}
              </>
            )}
          </p>

          {/* Seller name */}
          {data.seller_display_name && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {data.seller_display_name}
            </p>
          )}

          {/* Rating + purchase count */}
          <div className="mt-auto pt-2">
            <RatingMeta
              avgRating={data.avg_rating}
              reviewCount={data.review_count}
              purchaseCount={data.purchase_count}
            />
          </div>

          {/* Price */}
          <div className="mt-1.5">
            <PriceTag price={data.price} />
          </div>
        </div>
      </article>
    </Link>

    {/* Favorite button — outside Link to avoid nested interactive elements */}
    {userId && (
      <div className="absolute right-2.5 top-2.5 z-10">
        <FavoriteButton
          userId={userId}
          problemSetId={data.id}
          initialFavorited={isFavorited}
        />
      </div>
    )}
  </div>
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
      <div className="flex overflow-hidden rounded-lg border border-border" role="presentation">
        <Skeleton className="h-28 w-28 shrink-0 rounded-none sm:w-36" />
        <div className="flex flex-1 flex-col justify-between p-4">
          <div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-2/3" />
            <Skeleton className="mt-1.5 h-3 w-24" />
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-1 h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-14" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border" role="presentation">
      <Skeleton className="h-36 w-full rounded-none sm:h-40" />
      <div className="p-3.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-1 h-4 w-3/4" />
        <Skeleton className="mt-1.5 h-3 w-32" />
        <Skeleton className="mt-1 h-3 w-20" />
        <Skeleton className="mt-3 h-3 w-24" />
        <Skeleton className="mt-1.5 h-4 w-14" />
      </div>
    </div>
  );
}
