"use client";

import { useState, useCallback } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface BookmarkButtonProps {
  /** Currently authenticated user ID */
  userId: string | null;
  /** Problem set to bookmark */
  problemSetId: string;
  /** Optional question identifier for per-question bookmarks */
  questionId?: string | null;
  /** Whether already bookmarked (pre-fetched from server) */
  isBookmarked?: boolean;
  /** Visual size variant */
  size?: "sm" | "default";
  /** Additional className */
  className?: string;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function BookmarkButton({
  userId,
  problemSetId,
  questionId = null,
  isBookmarked = false,
  size = "default",
  className,
}: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [toggling, setToggling] = useState(false);

  const toggleBookmark = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!userId || toggling) return;

      setToggling(true);
      const prev = bookmarked;
      // Optimistic update
      setBookmarked(!prev);

      try {
        const supabase = createClient();

        if (prev) {
          // Remove bookmark
          let query = supabase
            .from("bookmarks")
            .delete()
            .eq("user_id", userId)
            .eq("problem_set_id", problemSetId);

          if (questionId) {
            query = query.eq("question_id", questionId);
          } else {
            query = query.is("question_id", null);
          }

          await query;
        } else {
          // Add bookmark
          await supabase.from("bookmarks").insert({
            user_id: userId,
            problem_set_id: problemSetId,
            question_id: questionId,
          });
        }
      } catch {
        // Revert on error
        setBookmarked(prev);
      } finally {
        setToggling(false);
      }
    },
    [userId, toggling, bookmarked, problemSetId, questionId]
  );

  // Not logged in — don't render
  if (!userId) return null;

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <Button
      type="button"
      variant="ghost"
      size={size === "sm" ? "sm" : "default"}
      onClick={toggleBookmark}
      disabled={toggling}
      aria-label={bookmarked ? "ブックマークを解除" : "ブックマークに追加"}
      aria-pressed={bookmarked}
      className={cn(
        "gap-1.5 text-muted-foreground transition-colors",
        bookmarked && "text-primary",
        className
      )}
    >
      <Bookmark
        className={cn(
          iconSize,
          "transition-all",
          bookmarked
            ? "fill-primary text-primary"
            : "fill-none text-current"
        )}
      />
      <span className="text-xs">
        {bookmarked ? "ブックマーク済み" : "ブックマーク"}
      </span>
    </Button>
  );
}
