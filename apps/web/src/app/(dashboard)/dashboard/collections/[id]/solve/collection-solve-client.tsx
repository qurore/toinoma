"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnswerForm } from "@/components/grading/answer-form";
import { GradingResultDisplay } from "@/components/grading/grading-result";
import { ProgressIndicator } from "@/components/solving/progress-indicator";
import { SolveTimer } from "@/components/solving/solve-timer";
import {
  ArrowLeft,
  Shuffle,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Loader2,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { shuffleArray } from "@toinoma/shared/utils";
import type { ProblemSetRubric, QuestionAnswer, GradingResult } from "@toinoma/shared/schemas";

// ─── Types ────────────────────────────────────────────────────────────

interface CollectionProblem {
  id: string;
  collectionItemId: string;
  problemSetId: string;
  title: string;
  rubric: ProblemSetRubric;
  problemPdfUrl: string | null;
}

interface CollectionSolveClientProps {
  collectionId: string;
  collectionName: string;
  problems: CollectionProblem[];
  completionMap: Record<string, { score: number; maxScore: number }>;
  unpurchasedCount: number;
}

type ItemState =
  | { status: "pending" }
  | { status: "solving" }
  | { status: "grading" }
  | { status: "completed"; result: GradingResult }
  | { status: "error"; message: string };

// ─── Component ────────────────────────────────────────────────────────

export function CollectionSolveClient({
  collectionId,
  collectionName,
  problems: initialProblems,
  completionMap,
  unpurchasedCount,
}: CollectionSolveClientProps) {
  const [problems, setProblems] = useState(initialProblems);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [states, setStates] = useState<Record<string, ItemState>>(() => {
    // Initialize states — previously completed are marked as completed
    const init: Record<string, ItemState> = {};
    for (const p of initialProblems) {
      if (completionMap[p.problemSetId]) {
        init[p.id] = { status: "pending" }; // Allow re-solving even if previously completed
      } else {
        init[p.id] = { status: "pending" };
      }
    }
    return init;
  });

  const current = problems[currentIndex];
  const currentState = current ? states[current.id] : undefined;
  const completedCount = Object.values(states).filter(
    (s) => s.status === "completed"
  ).length;
  const previouslyCompletedCount = Object.keys(completionMap).length;

  // Shuffle the problem order
  const handleShuffle = () => {
    setProblems(shuffleArray(problems));
    setCurrentIndex(0);
  };

  // Start solving a problem
  const handleStartSolving = (index: number) => {
    setCurrentIndex(index);
    const p = problems[index];
    setStates((prev) => ({
      ...prev,
      [p.id]: { status: "solving" },
    }));
  };

  // Submit answers for grading
  const handleSubmit = useCallback(
    async (answers: Record<string, QuestionAnswer>) => {
      if (!current) return;

      setStates((prev) => ({
        ...prev,
        [current.id]: { status: "grading" },
      }));

      try {
        const res = await fetch("/api/grading", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problemSetId: current.problemSetId,
            answers,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setStates((prev) => ({
            ...prev,
            [current.id]: {
              status: "error",
              message: data.error ?? "採点に失敗しました",
            },
          }));
          return;
        }

        setStates((prev) => ({
          ...prev,
          [current.id]: { status: "completed", result: data.result },
        }));
      } catch {
        setStates((prev) => ({
          ...prev,
          [current.id]: {
            status: "error",
            message: "採点に失敗しました。もう一度お試しください。",
          },
        }));
      }
    },
    [current]
  );

  // Move to next problem
  const handleNext = () => {
    if (currentIndex < problems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Retry a problem
  const handleRetry = () => {
    if (!current) return;
    setStates((prev) => ({
      ...prev,
      [current.id]: { status: "solving" },
    }));
  };

  // All items completed
  const allCompleted =
    problems.length > 0 &&
    problems.every((p) => states[p.id]?.status === "completed");

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href={`/dashboard/collections/${collectionId}`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              コレクションに戻る
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {collectionName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            コレクション内の問題を順番に解いていきましょう
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SolveTimer timeLimitMinutes={null} />
          <Button variant="outline" size="sm" onClick={handleShuffle}>
            <Shuffle className="mr-1 h-3.5 w-3.5" />
            シャッフル
          </Button>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <ProgressIndicator
              questions={problems.map((p, i) => ({
                index: i,
                label: `問${i + 1}`,
                answered: states[p.id]?.status === "completed",
              }))}
              currentQuestion={currentIndex}
              onQuestionClick={(i) => {
                if (states[problems[i].id]?.status !== "solving") {
                  setCurrentIndex(i);
                }
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {completedCount}/{problems.length} 完了
            </span>
            {previouslyCompletedCount > 0 && (
              <Badge variant="outline" className="text-xs">
                過去: {previouslyCompletedCount}問解答済み
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unpurchased warning */}
      {unpurchasedCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-700">
            {unpurchasedCount}問の未購入の問題セットはスキップされます
          </p>
        </div>
      )}

      {/* Problem list / Current problem */}
      {!currentState || currentState.status === "pending" ? (
        // Show problem list
        <div className="space-y-2">
          {problems.map((problem, index) => {
            const state = states[problem.id];
            const prevCompletion = completionMap[problem.problemSetId];

            return (
              <Card
                key={problem.id}
                className={cn(
                  "transition-shadow",
                  index === currentIndex && "ring-2 ring-primary"
                )}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{problem.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      {prevCompletion && (
                        <Badge variant="outline" className="text-xs">
                          前回: {prevCompletion.score}/{prevCompletion.maxScore}
                        </Badge>
                      )}
                      {state?.status === "completed" && (
                        <Badge className="text-xs">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          完了
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleStartSolving(index)}
                    disabled={state?.status === "grading"}
                  >
                    {state?.status === "completed"
                      ? "もう一度解く"
                      : "解く"}
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : currentState.status === "solving" && current ? (
        // Solving interface
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {currentIndex + 1}. {current.title}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStates((prev) => ({
                  ...prev,
                  [current.id]: { status: "pending" },
                }));
              }}
            >
              一覧に戻る
            </Button>
          </div>

          {current.problemPdfUrl && (
            <div className="mb-6">
              <iframe
                src={current.problemPdfUrl}
                className="h-[500px] w-full rounded-lg border border-border"
                title="問題PDF"
              />
            </div>
          )}

          <AnswerForm
            rubric={current.rubric}
            problemSetId={current.problemSetId}
            onSubmit={handleSubmit}
          />
        </div>
      ) : currentState.status === "grading" ? (
        // Grading state
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">AI採点中...</p>
          </CardContent>
        </Card>
      ) : currentState.status === "completed" ? (
        // Result display
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {currentIndex + 1}. {current?.title} — 採点結果
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRetry}>
                もう一度解く
              </Button>
              {currentIndex < problems.length - 1 && (
                <Button size="sm" onClick={handleNext}>
                  次の問題へ
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStates((prev) => ({
                    ...prev,
                    [current!.id]: { status: "pending" },
                  }));
                }}
              >
                一覧に戻る
              </Button>
            </div>
          </div>
          <GradingResultDisplay result={currentState.result} />
        </div>
      ) : currentState.status === "error" ? (
        // Error state
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-4 h-8 w-8 text-destructive" />
            <p className="mb-4 text-destructive">{currentState.message}</p>
            <div className="flex gap-2">
              <Button onClick={handleRetry}>再試行</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStates((prev) => ({
                    ...prev,
                    [current!.id]: { status: "pending" },
                  }));
                }}
              >
                一覧に戻る
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Completion screen with aggregate score */}
      {allCompleted && (() => {
        const totalScore = problems.reduce((sum, p) => {
          const state = states[p.id];
          if (state?.status === "completed" && state.result) {
            return sum + (state.result.totalScore ?? 0);
          }
          return sum;
        }, 0);
        const totalMaxScore = problems.reduce((sum, p) => {
          const state = states[p.id];
          if (state?.status === "completed" && state.result) {
            return sum + (state.result.maxScore ?? 0);
          }
          return sum;
        }, 0);
        const percentage =
          totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

        return (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col items-center py-10">
              <Trophy className="mb-4 h-12 w-12 text-primary" />
              <p className="mb-2 text-xl font-bold">
                全問完了しました！
              </p>

              {/* Aggregate score display */}
              <div className="mb-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-primary">
                  {totalScore}
                </span>
                <span className="text-lg text-muted-foreground">
                  / {totalMaxScore}
                </span>
                <Badge
                  className="ml-2"
                  variant={
                    percentage >= 80
                      ? "default"
                      : percentage >= 50
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {percentage}%
                </Badge>
              </div>

              {/* Per-problem breakdown */}
              <div className="mb-6 w-full max-w-md space-y-1.5">
                {problems.map((p, i) => {
                  const state = states[p.id];
                  const score =
                    state?.status === "completed"
                      ? (state.result.totalScore ?? 0)
                      : 0;
                  const max =
                    state?.status === "completed"
                      ? (state.result.maxScore ?? 0)
                      : 0;
                  const pct = max > 0 ? Math.round((score / max) * 100) : 0;

                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm odd:bg-muted/30"
                    >
                      <span className="truncate font-medium">
                        {i + 1}. {p.title}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {score}/{max}{" "}
                        <span
                          className={cn(
                            "font-semibold",
                            pct >= 80
                              ? "text-primary"
                              : pct >= 50
                                ? "text-amber-600"
                                : "text-destructive"
                          )}
                        >
                          ({pct}%)
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="mb-4 text-sm text-muted-foreground">
                お疲れ様でした。解答履歴でさらに詳しい結果を確認できます。
              </p>
              <div className="flex gap-2">
                <Button asChild>
                  <Link href="/dashboard/history">解答履歴を見る</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/collections/${collectionId}`}>
                    コレクションに戻る
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
