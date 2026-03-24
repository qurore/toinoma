"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Star } from "lucide-react";
import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
  math: "∑",
  english: "Aa",
  japanese: "あ",
  physics: "⚡",
  chemistry: "⚗",
  biology: "🧬",
  japanese_history: "⛩",
  world_history: "🌍",
  geography: "🗺",
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
// Main component
// ──────────────────────────────────────────────

export function ProblemSetCard({
  data,
  isFavorited = false,
  userId = null,
  layout = "vertical",
}: ProblemSetCardProps) {
  const [favorited, setFavorited] = useState(isFavorited);
  const [toggling, setToggling] = useState(false);

  const toggleFavorite = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!userId || toggling) return;

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
            .eq("problem_set_id", data.id);
        } else {
          await supabase
            .from("favorites")
            .insert({ user_id: userId, problem_set_id: data.id });
        }
      } catch {
        // Revert on error
        setFavorited(prev);
      } finally {
        setToggling(false);
      }
    },
    [userId, toggling, favorited, data.id]
  );

  const priceLabel =
    data.price === 0 ? "無料" : `¥${data.price.toLocaleString()}`;

  const hasRating =
    data.avg_rating != null &&
    data.review_count != null &&
    data.review_count > 0;

  if (layout === "horizontal") {
    return (
      <Link href={`/problem/${data.id}`} className="group block">
        <Card className="flex h-full overflow-hidden transition-all duration-200 hover:shadow-md">
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
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
                {data.title}
              </h3>
            </div>

            <div className="mt-2 flex items-end justify-between">
              <div className="min-w-0">
                {/* Rating */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {hasRating ? (
                    <>
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="font-medium text-foreground">
                        {data.avg_rating!.toFixed(1)}
                      </span>
                      <span>({data.review_count})</span>
                    </>
                  ) : (
                    <span>レビューなし</span>
                  )}
                </div>
                {data.seller_display_name && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {data.seller_display_name}
                  </p>
                )}
              </div>
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

          {/* Favorite */}
          {userId && (
            <button
              type="button"
              onClick={toggleFavorite}
              disabled={toggling}
              aria-label={favorited ? "お気に入りから削除" : "お気に入りに追加"}
              className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
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
          )}
        </Card>
      </Link>
    );
  }

  // Default: vertical layout
  return (
    <Link href={`/problem/${data.id}`} className="group block">
      <Card className="relative h-full overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        {/* Cover image / gradient placeholder */}
        <div
          className={cn(
            "relative flex h-36 items-center justify-center bg-gradient-to-br sm:h-40",
            SUBJECT_GRADIENTS[data.subject]
          )}
        >
          {data.cover_image_url ? (
            <Image
              src={data.cover_image_url}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <span className="text-4xl text-white/80">
              {SUBJECT_ICONS[data.subject]}
            </span>
          )}

          {/* Favorite button overlay */}
          {userId && (
            <button
              type="button"
              onClick={toggleFavorite}
              disabled={toggling}
              aria-label={favorited ? "お気に入りから削除" : "お気に入りに追加"}
              className="absolute right-2.5 top-2.5 rounded-full bg-white/80 p-1.5 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
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
          )}

          {/* Price badge overlay */}
          <div className="absolute bottom-2.5 right-2.5">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-bold shadow-sm",
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
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
            {data.title}
          </h3>

          {/* Rating row */}
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            {hasRating ? (
              <>
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="font-medium text-foreground">
                  {data.avg_rating!.toFixed(1)}
                </span>
                <span>({data.review_count})</span>
              </>
            ) : (
              <span>レビューなし</span>
            )}
          </div>

          {/* Seller name */}
          {data.seller_display_name && (
            <p className="mt-1.5 truncate text-xs text-muted-foreground">
              {data.seller_display_name}
            </p>
          )}
        </div>
      </Card>
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
      <div className="flex overflow-hidden rounded-lg border border-border">
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
    <div className="overflow-hidden rounded-lg border border-border">
      <Skeleton className="h-36 w-full rounded-none sm:h-40" />
      <div className="p-4">
        <div className="mb-2 flex gap-1.5">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-1 h-4 w-3/4" />
        <Skeleton className="mt-2 h-3 w-20" />
        <Skeleton className="mt-1.5 h-3 w-24" />
      </div>
    </div>
  );
}
