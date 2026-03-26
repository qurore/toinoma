"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QaThread } from "./qa-thread";
import type { QaQuestionData } from "./qa-section";

type SortOption = "newest" | "oldest" | "most_upvoted" | "most_answers";

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "newest", label: "新しい順" },
  { value: "oldest", label: "古い順" },
  { value: "most_upvoted", label: "投票順" },
  { value: "most_answers", label: "回答数順" },
];

const PAGE_SIZE = 10;

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
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter questions by title/body based on search query (client-side)
  const filteredAndSorted = useMemo(() => {
    let result = questions;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (q) =>
          q.title.toLowerCase().includes(query) ||
          q.body.toLowerCase().includes(query)
      );
    }

    // Sort: pinned always first, then by selected sort
    return [...result].sort((a, b) => {
      // Pinned questions always first
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

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
        case "most_upvoted":
          return b.upvote_count - a.upvote_count;
        case "most_answers":
          return b.answer_count - a.answer_count;
        default:
          return 0;
      }
    });
  }, [questions, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedQuestions = filteredAndSorted.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  // Reset page when search or sort changes
  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setCurrentPage(1);
  }

  function handleSortChange(value: SortOption) {
    setSortBy(value);
    setCurrentPage(1);
  }

  if (questions.length === 0) {
    return <EmptyState isAuthenticated={!!userId} />;
  }

  return (
    <div className="space-y-4">
      {/* Search and sort controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Q&Aを検索..."
            className="pl-10"
            aria-label="Q&A検索"
          />
        </div>
        <Select
          value={sortBy}
          onValueChange={(v) => handleSortChange(v as SortOption)}
        >
          <SelectTrigger className="w-[140px] shrink-0" aria-label="並び替え">
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

      {/* Filtered results */}
      {filteredAndSorted.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          <p>「{searchQuery}」に一致する質問が見つかりませんでした</p>
        </div>
      ) : (
        <>
          <div className="space-y-3" role="feed" aria-label="質問一覧">
            {paginatedQuestions.map((question) => (
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                前へ
              </Button>
              <span className="text-sm text-muted-foreground">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
              >
                次へ
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────
function EmptyState({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm font-medium text-foreground">
        まだ質問がありません
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {isAuthenticated
          ? "解き方がわからない問題や解説について気になる点があれば、質問を投稿してみましょう。"
          : "質問の閲覧や投稿にはログインが必要です。"}
      </p>
    </div>
  );
}
