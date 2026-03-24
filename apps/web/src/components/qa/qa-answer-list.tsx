"use client";

import { useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import {
  CheckCircle2,
  ChevronUp,
  Loader2,
  MoreVertical,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleUpvote, markAccepted } from "@/app/problem/[id]/qa/actions";
import type { QaAnswerData } from "./qa-section";

interface QaAnswerListProps {
  answers: QaAnswerData[];
  qaQuestionId: string;
  problemSetId: string;
  isSeller: boolean;
  userId: string | null;
}

export function QaAnswerList({
  answers,
  qaQuestionId,
  problemSetId,
  isSeller,
  userId,
}: QaAnswerListProps) {
  if (answers.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        まだ回答がありません
      </p>
    );
  }

  // Sort: accepted first, then by upvotes descending, then by creation date
  const sorted = [...answers].sort((a, b) => {
    if (a.is_accepted !== b.is_accepted) return a.is_accepted ? -1 : 1;
    if (a.upvotes !== b.upvotes) return b.upvotes - a.upvotes;
    return (
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  });

  return (
    <div className="divide-y" role="list" aria-label="回答一覧">
      {sorted.map((answer) => (
        <AnswerItem
          key={answer.id}
          answer={answer}
          qaQuestionId={qaQuestionId}
          problemSetId={problemSetId}
          isSeller={isSeller}
          userId={userId}
        />
      ))}
    </div>
  );
}

// ── Single answer item ─────────────────────────────────────────────────
function AnswerItem({
  answer,
  qaQuestionId,
  problemSetId,
  isSeller,
  userId,
}: {
  answer: QaAnswerData;
  qaQuestionId: string;
  problemSetId: string;
  isSeller: boolean;
  userId: string | null;
}) {
  const [optimisticUpvotes, setOptimisticUpvotes] = useState(answer.upvotes);
  const [optimisticUpvoted, setOptimisticUpvoted] = useState(
    answer.user_has_upvoted
  );
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  const initials = (answer.user.display_name ?? "?")
    .slice(0, 2)
    .toUpperCase();

  const timeAgo = formatDistanceToNow(new Date(answer.created_at), {
    addSuffix: true,
    locale: ja,
  });

  const handleUpvote = useCallback(async () => {
    if (!userId) {
      toast.error("投票するにはログインが必要です");
      return;
    }

    // Optimistic update
    const wasUpvoted = optimisticUpvoted;
    setOptimisticUpvoted(!wasUpvoted);
    setOptimisticUpvotes((prev) => (wasUpvoted ? prev - 1 : prev + 1));
    setIsUpvoting(true);

    const result = await toggleUpvote({
      qaAnswerId: answer.id,
      problemSetId,
    });

    if (result?.error) {
      // Revert optimistic update
      setOptimisticUpvoted(wasUpvoted);
      setOptimisticUpvotes((prev) => (wasUpvoted ? prev + 1 : prev - 1));
      toast.error(result.error);
    }

    setIsUpvoting(false);
  }, [userId, optimisticUpvoted, answer.id, problemSetId]);

  const handleAccept = useCallback(async () => {
    setIsAccepting(true);
    const result = await markAccepted({
      qaAnswerId: answer.id,
      qaQuestionId,
      problemSetId,
    });

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(
        answer.is_accepted
          ? "ベストアンサーを取り消しました"
          : "ベストアンサーに選びました"
      );
    }

    setIsAccepting(false);
  }, [answer.id, answer.is_accepted, qaQuestionId, problemSetId]);

  return (
    <div className="flex gap-3 py-4" role="listitem">
      {/* Upvote column */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${
            optimisticUpvoted
              ? "text-primary hover:text-primary/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={handleUpvote}
          disabled={isUpvoting}
          aria-label={
            optimisticUpvoted ? "投票を取り消す" : "この回答に投票する"
          }
          aria-pressed={optimisticUpvoted}
        >
          {isUpvoting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </Button>
        <span
          className={`text-sm font-medium ${
            optimisticUpvoted ? "text-primary" : "text-muted-foreground"
          }`}
          aria-label={`${optimisticUpvotes}票`}
        >
          {optimisticUpvotes}
        </span>
      </div>

      {/* Answer content */}
      <div className="min-w-0 flex-1">
        {/* Author header */}
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage
              src={answer.user.avatar_url ?? undefined}
              alt={answer.user.display_name ?? "User"}
            />
            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">
            {answer.user.display_name ?? "匿名ユーザー"}
          </span>
          {/* Seller badge */}
          {answer.is_seller && (
            <Badge
              variant="outline"
              className="gap-1 border-primary/40 text-primary"
            >
              <Store className="h-3 w-3" />
              出品者
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
          {answer.is_accepted && (
            <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              ベストアンサー
            </Badge>
          )}
        </div>

        {/* Answer body */}
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
          {answer.body}
        </p>

        {/* Seller actions (accept / more) */}
        {isSeller && (
          <div className="mt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  aria-label="回答のアクション"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={handleAccept}
                  disabled={isAccepting}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {answer.is_accepted
                    ? "ベストアンサーを取り消す"
                    : "ベストアンサーに選ぶ"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}
