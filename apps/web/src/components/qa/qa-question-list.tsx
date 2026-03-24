"use client";

import { useState, useMemo } from "react";
import { MessageCircleQuestion, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  const [searchQuery, setSearchQuery] = useState("");

  // Filter questions by title/body based on search query (client-side)
  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return questions;
    const query = searchQuery.toLowerCase();
    return questions.filter(
      (q) =>
        q.title.toLowerCase().includes(query) ||
        q.body.toLowerCase().includes(query)
    );
  }, [questions, searchQuery]);

  if (questions.length === 0) {
    return <EmptyState isAuthenticated={!!userId} />;
  }

  return (
    <div className="space-y-4">
      {/* Search input — only show when there are questions to search */}
      {questions.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Q&Aを検索..."
            className="pl-10"
            aria-label="Q&A検索"
          />
        </div>
      )}

      {/* Filtered results */}
      {filteredQuestions.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          <p>「{searchQuery}」に一致する質問が見つかりませんでした</p>
        </div>
      ) : (
        <div className="space-y-3" role="feed" aria-label="質問一覧">
          {filteredQuestions.map((question) => (
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
      )}
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
