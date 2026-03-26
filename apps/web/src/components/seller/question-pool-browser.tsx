"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Filter,
  X,
} from "lucide-react";
import {
  SUBJECTS,
  SUBJECT_LABELS,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  ANSWER_TYPE_LABELS,
} from "@toinoma/shared/constants";
import type { Subject, Difficulty, AnswerType } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Question shape returned from the pool query
export interface PoolQuestion {
  id: string;
  question_type: string;
  question_text: string;
  subject: string;
  difficulty: string;
  points: number;
}

const ALL_ANSWER_TYPES = Object.keys(ANSWER_TYPE_LABELS) as AnswerType[];

interface QuestionPoolBrowserProps {
  /** Set of question IDs already added to the set */
  addedQuestionIds: Set<string>;
  /** Callback to add a question to the set */
  onAddQuestion: (question: PoolQuestion) => void;
}

export function QuestionPoolBrowser({
  addedQuestionIds,
  onAddQuestion,
}: QuestionPoolBrowserProps) {
  const [questions, setQuestions] = useState<PoolQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters =
    filterType !== "all" ||
    filterSubject !== "all" ||
    filterDifficulty !== "all";

  // Fetch questions from the seller's pool
  useEffect(() => {
    let cancelled = false;

    async function fetchQuestions() {
      const supabase = createClient();

      const { data } = await supabase
        .from("questions")
        .select(
          "id, question_type, question_text, subject, difficulty, points"
        )
        .order("created_at", { ascending: false });

      if (!cancelled) {
        setQuestions((data as PoolQuestion[]) ?? []);
        setIsLoading(false);
      }
    }

    fetchQuestions();

    return () => {
      cancelled = true;
    };
  }, []);

  // Client-side filtering
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (filterType !== "all" && q.question_type !== filterType) return false;
      if (filterSubject !== "all" && q.subject !== filterSubject) return false;
      if (filterDifficulty !== "all" && q.difficulty !== filterDifficulty)
        return false;
      if (
        searchQuery.trim() &&
        !q.question_text
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase())
      )
        return false;
      return true;
    });
  }, [questions, filterType, filterSubject, filterDifficulty, searchQuery]);

  function clearFilters() {
    setFilterType("all");
    setFilterSubject("all");
    setFilterDifficulty("all");
    setSearchQuery("");
  }

  if (isLoading) {
    return <QuestionPoolSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Search bar */}
      <div className="space-y-2 pb-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="問題を検索..."
              className="pl-9"
            />
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            aria-label="フィルター"
            aria-expanded={showFilters}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="問題形式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての形式</SelectItem>
                  {ALL_ANSWER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ANSWER_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="教科" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての教科</SelectItem>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SUBJECT_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filterDifficulty}
                onValueChange={setFilterDifficulty}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="難易度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての難易度</SelectItem>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {DIFFICULTY_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs"
              >
                <X className="mr-1 h-3 w-3" />
                フィルターをクリア
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="mb-2 text-xs text-muted-foreground">
        {filteredQuestions.length} / {questions.length} 問
      </div>

      {/* Question list */}
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium">
              まだ問題がありません
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              問題プールに問題を追加してください
            </p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium">
              条件に一致する問題がありません
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              フィルターや検索条件を変更してください
            </p>
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const isAdded = addedQuestionIds.has(q.id);
            const typeLabel =
              ANSWER_TYPE_LABELS[q.question_type as AnswerType] ??
              q.question_type;

            return (
              <Card
                key={q.id}
                className={cn(
                  "transition-colors",
                  isAdded && "border-primary/30 bg-primary/5"
                )}
              >
                <CardContent className="flex items-start gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm leading-snug">
                      {q.question_text}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {typeLabel} · {SUBJECT_LABELS[q.subject as Subject]} · {DIFFICULTY_LABELS[q.difficulty as Difficulty]} · {q.points}点
                    </p>
                  </div>

                  <Button
                    variant={isAdded ? "secondary" : "outline"}
                    size="sm"
                    className="shrink-0"
                    disabled={isAdded}
                    onClick={() => onAddQuestion(q)}
                    aria-label={
                      isAdded
                        ? "追加済み"
                        : `${q.question_text.slice(0, 20)}を追加`
                    }
                  >
                    {isAdded ? (
                      <>追加済み</>
                    ) : (
                      <>
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        追加
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function QuestionPoolSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-4 w-20" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-8 w-14 shrink-0" />
        </div>
      ))}
    </div>
  );
}
