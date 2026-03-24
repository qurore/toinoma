"use client";

import { useState, useCallback, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageCircle,
  MoreVertical,
  Pin,
  PinOff,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { QaAnswerList } from "./qa-answer-list";
import { QaAnswerForm } from "./qa-answer-form";
import { togglePinned } from "@/app/problem/[id]/qa/actions";
import type { QaQuestionData, QaAnswerData } from "./qa-section";

interface QaThreadProps {
  question: QaQuestionData;
  problemSetId: string;
  sellerId: string;
  userId: string | null;
  isSeller: boolean;
}

export function QaThread({
  question,
  problemSetId,
  sellerId,
  userId,
  isSeller,
}: QaThreadProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [answers, setAnswers] = useState<QaAnswerData[]>([]);
  const [isLoadingAnswers, setIsLoadingAnswers] = useState(false);
  const [hasLoadedAnswers, setHasLoadedAnswers] = useState(false);
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [isPinning, setIsPinning] = useState(false);

  const initials = (question.user.display_name ?? "?")
    .slice(0, 2)
    .toUpperCase();

  const timeAgo = formatDistanceToNow(new Date(question.created_at), {
    addSuffix: true,
    locale: ja,
  });

  // Fetch answers from client when thread is expanded
  const fetchAnswers = useCallback(async () => {
    setIsLoadingAnswers(true);
    const supabase = createClient();

    const { data: answerRows } = await supabase
      .from("qa_answers")
      .select(
        "id, body, is_accepted, upvotes, created_at, updated_at, user_id"
      )
      .eq("qa_question_id", question.id)
      .order("is_accepted", { ascending: false })
      .order("upvotes", { ascending: false })
      .order("created_at", { ascending: true });

    if (!answerRows) {
      setAnswers([]);
      setIsLoadingAnswers(false);
      setHasLoadedAnswers(true);
      return;
    }

    // Fetch profiles for answer authors
    const authorIds = [...new Set(answerRows.map((a) => a.user_id))];
    const { data: profiles } =
      authorIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .in("id", authorIds)
        : { data: [] };

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    // Fetch current user's upvotes for these answers
    let userUpvoteSet = new Set<string>();
    if (userId) {
      const answerIds = answerRows.map((a) => a.id);
      const { data: upvotes } = await supabase
        .from("qa_upvotes")
        .select("qa_answer_id")
        .eq("user_id", userId)
        .in("qa_answer_id", answerIds);

      userUpvoteSet = new Set(
        (upvotes ?? []).map((u) => u.qa_answer_id)
      );
    }

    const answerData: QaAnswerData[] = answerRows.map((a) => {
      const row = a as { id: string; body: string; is_accepted: boolean; upvotes: number; created_at: string; updated_at: string; user_id: string };
      const profile = profileMap.get(row.user_id);
      return {
        id: row.id,
        body: row.body,
        is_accepted: row.is_accepted,
        upvotes: row.upvotes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        user: {
          id: row.user_id,
          display_name: profile?.display_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
        },
        is_seller: row.user_id === sellerId,
        user_has_upvoted: userUpvoteSet.has(row.id),
      };
    });

    setAnswers(answerData);
    setIsLoadingAnswers(false);
    setHasLoadedAnswers(true);
  }, [question.id, userId, sellerId]);

  // Fetch answers when expanded
  useEffect(() => {
    if (isExpanded && !hasLoadedAnswers) {
      fetchAnswers();
    }
  }, [isExpanded, hasLoadedAnswers, fetchAnswers]);

  // Refetch when answer count might have changed (router refresh)
  useEffect(() => {
    if (isExpanded && hasLoadedAnswers) {
      fetchAnswers();
    }
    // Only re-run when the question's answer_count from server changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.answer_count]);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handlePin = useCallback(async () => {
    setIsPinning(true);
    const result = await togglePinned({
      qaQuestionId: question.id,
      problemSetId,
    });

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(
        question.pinned
          ? "ピン留めを解除しました"
          : "質問をピン留めしました"
      );
    }
    setIsPinning(false);
  }, [question.id, question.pinned, problemSetId]);

  // Render simple markdown in question body (bold, code, line breaks)
  function renderBody(text: string) {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(
        /`(.+?)`/g,
        '<code class="rounded bg-muted px-1 py-0.5 text-xs font-mono">$1</code>'
      )
      .replace(/\n/g, "<br />");
  }

  return (
    <div
      className={`rounded-lg border transition-colors ${
        question.pinned
          ? "border-primary/30 bg-primary/[0.02]"
          : "bg-background"
      }`}
      role="article"
      aria-label={`質問: ${question.title}`}
    >
      {/* Question header -- always visible, clickable to expand */}
      <button
        type="button"
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50"
        onClick={handleToggleExpand}
        aria-expanded={isExpanded}
        aria-controls={`qa-thread-${question.id}`}
      >
        {/* Author avatar */}
        <Avatar className="mt-0.5 h-8 w-8 shrink-0">
          <AvatarImage
            src={question.user.avatar_url ?? undefined}
            alt={question.user.display_name ?? "User"}
          />
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Title + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
              {question.title}
            </h3>
            <div className="flex shrink-0 items-center gap-1.5">
              {question.pinned && (
                <Badge
                  variant="outline"
                  className="gap-1 border-primary/40 text-primary"
                >
                  <Pin className="h-3 w-3" />
                  ピン留め
                </Badge>
              )}
              {question.has_accepted_answer && (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
                  解決済み
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{question.user.display_name ?? "匿名ユーザー"}</span>
            <span>{timeAgo}</span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {question.answer_count}件の回答
            </span>
          </div>
        </div>

        {/* Expand chevron */}
        <div className="mt-1 shrink-0 text-muted-foreground">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div id={`qa-thread-${question.id}`} className="px-4 pb-4">
          <Separator className="mb-4" />

          {/* Full question body */}
          <div className="mb-4 rounded-md bg-muted/30 p-3">
            <div
              className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80"
              dangerouslySetInnerHTML={{ __html: renderBody(question.body) }}
            />
            {/* Image attachments not yet supported in schema */}
          </div>

          {/* Seller actions: pin */}
          {isSeller && (
            <div className="mb-4 flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    disabled={isPinning}
                  >
                    {isPinning ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <MoreVertical className="h-3.5 w-3.5" />
                    )}
                    出品者メニュー
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={handlePin} disabled={isPinning}>
                    {question.pinned ? (
                      <>
                        <PinOff className="mr-2 h-4 w-4" />
                        ピン留めを解除
                      </>
                    ) : (
                      <>
                        <Pin className="mr-2 h-4 w-4" />
                        ピン留めする
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <Separator className="mb-4" />

          {/* Answers section */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              回答 ({question.answer_count})
            </h4>

            {isLoadingAnswers ? (
              <AnswerListSkeleton />
            ) : (
              <QaAnswerList
                answers={answers}
                qaQuestionId={question.id}
                problemSetId={problemSetId}
                isSeller={isSeller}
                userId={userId}
              />
            )}
          </div>

          {/* Answer form */}
          {userId && (
            <div className="mt-4">
              {showAnswerForm ? (
                <QaAnswerForm
                  qaQuestionId={question.id}
                  problemSetId={problemSetId}
                  onCancel={() => setShowAnswerForm(false)}
                />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowAnswerForm(true)}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  回答する
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Loading skeleton for answers ───────────────────────────────────────
function AnswerListSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="回答を読み込み中">
      {[1, 2].map((i) => (
        <div key={i} className="flex gap-3 py-3">
          <div className="flex flex-col items-center gap-1">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
