"use client";

import { MessageCircleQuestion } from "lucide-react";
import { QaThread } from "./qa-thread";
import type { QaQuestionData } from "./qa-section";

interface QaQuestionListProps {
  questions: QaQuestionData[];
  problemSetId: string;
  sellerId: string;
  userId: string | null;
  isSeller: boolean;
}

export function QaQuestionList({
  questions,
  problemSetId,
  sellerId,
  userId,
  isSeller,
}: QaQuestionListProps) {
  if (questions.length === 0) {
    return <EmptyState isAuthenticated={!!userId} />;
  }

  return (
    <div className="space-y-3" role="feed" aria-label="質問一覧">
      {questions.map((question) => (
        <QaThread
          key={question.id}
          question={question}
          problemSetId={problemSetId}
          sellerId={sellerId}
          userId={userId}
          isSeller={isSeller}
        />
      ))}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────
function EmptyState({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <MessageCircleQuestion className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">
        まだ質問がありません
      </p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        {isAuthenticated
          ? "この問題セットについてわからないことがあれば、質問を投稿してみましょう。"
          : "質問を投稿するにはログインが必要です。"}
      </p>
    </div>
  );
}
