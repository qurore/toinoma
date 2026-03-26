"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Minus,
} from "lucide-react";
import { VideoPlayer } from "@/components/solving/video-player";
import type { GradingResult } from "@toinoma/shared/schemas";
import { ANSWER_TYPE_LABELS } from "@toinoma/shared/constants";
import type { AnswerType } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────

interface ReviewQuestion {
  /** Combined key like "1-(1)" */
  key: string;
  sectionNumber: number;
  questionNumber: string;
  questionType: AnswerType;
  questionText?: string;
  verticalText?: boolean;
  /** Student's submitted answer */
  studentAnswer?: StudentAnswer;
  /** Correct/model answer from rubric */
  modelAnswer?: ModelAnswer;
  /** Grading result for this question */
  gradingResult?: GradingResult["sections"][0]["questions"][0];
  /** Video URLs for explanation */
  videos?: { url: string; title: string }[];
}

type StudentAnswer =
  | { type: "essay"; text?: string; imageUrl?: string }
  | { type: "mark_sheet"; selected: string }
  | { type: "fill_in_blank"; text: string };

type ModelAnswer =
  | { type: "essay"; text?: string; rubricElements?: { element: string; points: number }[] }
  | { type: "mark_sheet"; correct: string; choices: string[] }
  | { type: "fill_in_blank"; acceptedAnswers: string[]; caseSensitive: boolean };

interface ReviewModeProps {
  questions: ReviewQuestion[];
  totalScore: number;
  maxScore: number;
  overallFeedback?: string;
}

// ─── Score Badge ──────────────────────────────────────────────────────

function ScoreBadge({ score, maxScore }: { score: number; maxScore: number }) {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const color =
    percentage >= 80
      ? "text-success"
      : percentage >= 50
        ? "text-amber-600"
        : "text-destructive";
  return (
    <span className={`text-sm font-semibold tabular-nums ${color}`}>
      {score} / {maxScore}
    </span>
  );
}

// ─── Essay Review ─────────────────────────────────────────────────────

function EssayReview({
  studentAnswer,
  modelAnswer,
  gradingResult,
}: {
  studentAnswer?: StudentAnswer;
  modelAnswer?: ModelAnswer;
  gradingResult?: GradingResult["sections"][0]["questions"][0];
}) {
  const student = studentAnswer?.type === "essay" ? studentAnswer : null;
  const model = modelAnswer?.type === "essay" ? modelAnswer : null;

  return (
    <div className="space-y-4">
      {/* Side-by-side: student vs model */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Student answer */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <p className="text-xs font-medium text-muted-foreground">あなたの解答</p>
          </div>
          <div className="min-h-[100px] rounded-md border border-border bg-muted/30 p-3">
            {student?.text ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{student.text}</p>
            ) : student?.imageUrl ? (
              <Image
                src={student.imageUrl}
                alt="解答画像"
                width={400}
                height={240}
                className="max-h-60 rounded-md object-contain"
                unoptimized
              />
            ) : (
              <p className="text-sm italic text-muted-foreground">未解答</p>
            )}
          </div>
        </div>

        {/* Model answer */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" />
            <p className="text-xs font-medium text-muted-foreground">模範解答</p>
          </div>
          <div className="min-h-[100px] rounded-md border border-success/20 bg-success/5 p-3">
            {model?.text ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{model.text}</p>
            ) : (
              <p className="text-sm italic text-muted-foreground">模範解答なし</p>
            )}
          </div>
        </div>
      </div>

      {/* Rubric element breakdown */}
      {gradingResult && gradingResult.rubricMatches.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            採点基準別スコア
          </p>
          <div className="space-y-2">
            {gradingResult.rubricMatches.map((match, i) => {
              const ratio =
                match.pointsPossible > 0
                  ? match.pointsAwarded / match.pointsPossible
                  : 0;
              const matchColor =
                ratio >= 1
                  ? "border-success/20 bg-success/5"
                  : ratio > 0
                    ? "border-amber-500/20 bg-amber-500/10"
                    : "border-destructive/20 bg-destructive/5";
              const iconColor =
                ratio >= 1
                  ? "text-success"
                  : ratio > 0
                    ? "text-amber-500"
                    : "text-destructive";

              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-2 rounded-md border p-3",
                    matchColor
                  )}
                >
                  {ratio >= 1 ? (
                    <CheckCircle2 className={cn("mt-0.5 h-4 w-4 shrink-0", iconColor)} />
                  ) : ratio > 0 ? (
                    <Minus className={cn("mt-0.5 h-4 w-4 shrink-0", iconColor)} />
                  ) : (
                    <XCircle className={cn("mt-0.5 h-4 w-4 shrink-0", iconColor)} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{match.element}</p>
                      <span
                        className={cn(
                          "shrink-0 text-xs font-semibold tabular-nums",
                          iconColor
                        )}
                      >
                        {match.pointsAwarded} / {match.pointsPossible}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {match.explanation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mark Sheet Review ────────────────────────────────────────────────

function MarkSheetReview({
  studentAnswer,
  modelAnswer,
}: {
  studentAnswer?: StudentAnswer;
  modelAnswer?: ModelAnswer;
}) {
  const student = studentAnswer?.type === "mark_sheet" ? studentAnswer : null;
  const model = modelAnswer?.type === "mark_sheet" ? modelAnswer : null;

  const isCorrect = student && model && student.selected === model.correct;
  const choices = model?.choices ?? [];

  return (
    <div className="space-y-3">
      {/* Bubble grid with correctness indicators */}
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => {
          const isStudentChoice = student?.selected === choice;
          const isCorrectChoice = model?.correct === choice;

          return (
            <div
              key={choice}
              className={cn(
                "relative flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border-2 px-3 text-sm font-semibold transition-all",
                isCorrectChoice && isStudentChoice &&
                  "border-success bg-success text-success-foreground shadow-sm",
                isCorrectChoice && !isStudentChoice &&
                  "border-success/60 bg-success/10 text-success",
                !isCorrectChoice && isStudentChoice &&
                  "border-destructive bg-destructive text-destructive-foreground shadow-sm",
                !isCorrectChoice && !isStudentChoice &&
                  "border-border bg-card text-muted-foreground"
              )}
            >
              {choice}
              {/* Status icon overlay */}
              {(isCorrectChoice || isStudentChoice) && (
                <span className="absolute -right-1 -top-1">
                  {isCorrectChoice && isStudentChoice ? (
                    <CheckCircle2 className="h-4 w-4 text-success drop-shadow-sm" />
                  ) : isCorrectChoice ? (
                    <CheckCircle2 className="h-4 w-4 text-success drop-shadow-sm" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive drop-shadow-sm" />
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Result label */}
      {student && model && (
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium",
            isCorrect
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive"
          )}
        >
          {isCorrect ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              正解
            </>
          ) : (
            <>
              <XCircle className="h-3.5 w-3.5" />
              不正解（正解: {model.correct}）
            </>
          )}
        </div>
      )}
      {!student && (
        <p className="text-sm italic text-muted-foreground">未解答</p>
      )}
    </div>
  );
}

// ─── Fill-in-blank Review ─────────────────────────────────────────────

function FillInBlankReview({
  studentAnswer,
  modelAnswer,
}: {
  studentAnswer?: StudentAnswer;
  modelAnswer?: ModelAnswer;
}) {
  const student = studentAnswer?.type === "fill_in_blank" ? studentAnswer : null;
  const model = modelAnswer?.type === "fill_in_blank" ? modelAnswer : null;

  const isCorrect = student && model && model.acceptedAnswers.some((a) => {
    if (model.caseSensitive) return a === student.text;
    return a.toLowerCase() === student.text.toLowerCase();
  });

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Student answer */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                student
                  ? isCorrect
                    ? "bg-success"
                    : "bg-destructive"
                  : "bg-muted-foreground/30"
              )}
            />
            <p className="text-xs font-medium text-muted-foreground">
              あなたの解答
            </p>
          </div>
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-md border-2 p-3",
              student
                ? isCorrect
                  ? "border-success/40 bg-success/5"
                  : "border-destructive/40 bg-destructive/5"
                : "border-border bg-muted/30"
            )}
          >
            {student ? (
              <>
                {isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                )}
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCorrect ? "text-success" : "text-destructive"
                  )}
                >
                  {student.text || "（空欄）"}
                </span>
              </>
            ) : (
              <>
                <Minus className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm italic text-muted-foreground">未解答</span>
              </>
            )}
          </div>
        </div>

        {/* Model answer */}
        {model && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success" />
              <p className="text-xs font-medium text-muted-foreground">
                正解
              </p>
            </div>
            <div className="rounded-md border-2 border-success/30 bg-success/5 p-3">
              <span className="text-sm font-medium text-foreground">
                {model.acceptedAnswers.join(" / ")}
              </span>
              {!model.caseSensitive && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  ※ 大文字・小文字は区別しません
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Review Mode Component ──────────────────────────────────────

export function ReviewMode({
  questions,
  totalScore,
  maxScore,
  overallFeedback,
}: ReviewModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1));
  }, [questions.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Keyboard navigation: ArrowLeft/ArrowRight to navigate between questions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept when focus is inside an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  const current = questions[currentIndex];
  if (!current) return null;

  return (
    <div className="space-y-4">
      {/* Score summary bar */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full",
                percentage >= 80
                  ? "bg-success/10"
                  : percentage >= 50
                    ? "bg-amber-500/10"
                    : "bg-destructive/10"
              )}
            >
              <span
                className={cn(
                  "text-lg font-bold",
                  percentage >= 80
                    ? "text-success"
                    : percentage >= 50
                      ? "text-amber-500"
                      : "text-destructive"
                )}
              >
                {percentage}%
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold">
                {totalScore} / {maxScore} 点
              </p>
              <p className="text-xs text-muted-foreground">
                ※ AI採点の結果は参考スコアです
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {currentIndex + 1} / {questions.length}
          </p>
        </CardContent>
      </Card>

      {/* Question navigation chips */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {questions.map((q, i) => {
          const qResult = q.gradingResult;
          const qPercentage =
            qResult && qResult.maxScore > 0
              ? (qResult.score / qResult.maxScore) * 100
              : null;

          const chipColor =
            qPercentage === null
              ? "bg-muted text-muted-foreground"
              : qPercentage >= 80
                ? "bg-success/10 text-success"
                : qPercentage >= 50
                  ? "bg-amber-500/10 text-amber-600"
                  : "bg-destructive/10 text-destructive";

          const dotColor =
            qPercentage === null
              ? "bg-muted-foreground/30"
              : qPercentage >= 80
                ? "bg-success"
                : qPercentage >= 50
                  ? "bg-amber-500"
                  : "bg-destructive";

          return (
            <button
              key={q.key}
              type="button"
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-2 text-xs font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                i === currentIndex
                  ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                  : "",
                chipColor
              )}
              aria-label={`問${q.key}${qPercentage !== null ? ` — ${Math.round(qPercentage)}%` : ""}`}
              aria-current={i === currentIndex ? "step" : undefined}
            >
              <span className={cn("h-2 w-2 rounded-full", dotColor)} />
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Current question review */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">
                大問{current.sectionNumber} {current.questionNumber}
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {ANSWER_TYPE_LABELS[current.questionType]}
              </span>
            </div>
            {current.gradingResult && (
              <ScoreBadge
                score={current.gradingResult.score}
                maxScore={current.gradingResult.maxScore}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Question text */}
          {current.questionText && (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p
                className={cn(
                  "text-sm",
                  current.verticalText &&
                    "writing-mode-vertical-rl text-orientation-mixed"
                )}
              >
                {current.questionText}
              </p>
            </div>
          )}

          {/* Type-specific review */}
          {current.questionType === "essay" && (
            <EssayReview
              studentAnswer={current.studentAnswer}
              modelAnswer={current.modelAnswer}
              gradingResult={current.gradingResult}
            />
          )}

          {current.questionType === "mark_sheet" && (
            <MarkSheetReview
              studentAnswer={current.studentAnswer}
              modelAnswer={current.modelAnswer}
            />
          )}

          {current.questionType === "fill_in_blank" && (
            <FillInBlankReview
              studentAnswer={current.studentAnswer}
              modelAnswer={current.modelAnswer}
            />
          )}

          {/* Feedback */}
          {current.gradingResult?.feedback && (
            <div className="rounded-md border border-border bg-card p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                フィードバック
              </p>
              <p className="text-sm leading-relaxed">
                {current.gradingResult.feedback}
              </p>
            </div>
          )}

          {/* Explanation videos */}
          {current.videos && current.videos.length > 0 && (
            <VideoPlayer videos={current.videos} />
          )}
        </CardContent>
      </Card>

      {/* Overall feedback (shown on last question) */}
      {currentIndex === questions.length - 1 && overallFeedback && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">総合フィードバック</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {overallFeedback}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          前の問題
        </Button>
        <span className="hidden text-xs text-muted-foreground sm:inline-flex sm:items-center sm:gap-1.5">
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">←</kbd>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">→</kbd>
          <span className="ml-0.5">で移動</span>
        </span>
        <Button
          variant="outline"
          onClick={goNext}
          disabled={currentIndex === questions.length - 1}
        >
          次の問題
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
