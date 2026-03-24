"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EssayAnswerInput } from "./essay-answer-input";
import { MarkSheetInput } from "./mark-sheet-input";
import { FillInBlankInput } from "./fill-in-blank-input";
import { Loader2, Send, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProblemSetRubric, QuestionAnswer } from "@toinoma/shared/schemas";
import { ANSWER_TYPE_LABELS } from "@toinoma/shared/constants";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// ──────────────────────────────────────────────
// Progress tracking types
// ──────────────────────────────────────────────

interface SectionProgress {
  sectionNumber: number;
  total: number;
  answered: number;
}

function computeProgress(
  rubric: ProblemSetRubric,
  answers: Record<string, QuestionAnswer>
): { sections: SectionProgress[]; totalAnswered: number; totalQuestions: number } {
  let totalAnswered = 0;
  let totalQuestions = 0;

  const sections = rubric.sections.map((section) => {
    let answered = 0;
    const total = section.questions.length;
    totalQuestions += total;

    for (const question of section.questions) {
      const key = `${section.number}-${question.number}`;
      const answer = answers[key];
      if (answer) {
        if (answer.type === "essay" && (answer.text || ("imageUrl" in answer && answer.imageUrl))) {
          answered++;
        } else if (answer.type === "fill_in_blank" && answer.text.trim()) {
          answered++;
        } else if (answer.type === "mark_sheet" && answer.selected) {
          answered++;
        }
      }
    }

    totalAnswered += answered;
    return { sectionNumber: section.number, total, answered };
  });

  return { sections, totalAnswered, totalQuestions };
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────

export function AnswerForm({
  rubric,
  onSubmit,
  initialAnswers,
  onAnswersChange,
}: {
  rubric: ProblemSetRubric;
  problemSetId?: string;
  onSubmit: (answers: Record<string, QuestionAnswer>) => Promise<void>;
  initialAnswers?: Record<string, QuestionAnswer>;
  onAnswersChange?: (answers: Record<string, QuestionAnswer>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>(
    initialAnswers ?? {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScrollNav, setShowScrollNav] = useState(false);
  const sectionRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Track scroll position for "back to top" visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollNav(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAnswerChange = useCallback(
    (key: string, value: QuestionAnswer) => {
      setAnswers((prev) => {
        const next = { ...prev, [key]: value };
        onAnswersChange?.(next);
        return next;
      });
    },
    [onAnswersChange]
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(answers);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scroll to a specific section
  const scrollToSection = useCallback((sectionNumber: number) => {
    const el = sectionRefs.current.get(sectionNumber);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const progress = useMemo(
    () => computeProgress(rubric, answers),
    [rubric, answers]
  );

  return (
    <div className="space-y-6">
      {/* Section navigation sidebar (sticky on desktop) */}
      <div className="hidden lg:fixed lg:right-4 lg:top-20 lg:z-40 lg:block xl:right-8">
        <Card className="w-48 shadow-md">
          <CardHeader className="p-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              セクション
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ScrollArea className="max-h-60">
              <nav className="space-y-1">
                {progress.sections.map((s) => (
                  <button
                    key={s.sectionNumber}
                    type="button"
                    onClick={() => scrollToSection(s.sectionNumber)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors",
                      "hover:bg-muted"
                    )}
                  >
                    <span className="font-medium">大問{s.sectionNumber}</span>
                    <span
                      className={cn(
                        "tabular-nums",
                        s.answered === s.total
                          ? "font-semibold text-success"
                          : "text-muted-foreground"
                      )}
                    >
                      {s.answered}/{s.total}
                    </span>
                  </button>
                ))}
              </nav>
            </ScrollArea>
            {/* Overall progress */}
            <div className="mt-2 border-t border-border pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">進捗</span>
                <span className="font-semibold tabular-nums">
                  {progress.totalAnswered}/{progress.totalQuestions}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    progress.totalAnswered === progress.totalQuestions
                      ? "bg-success"
                      : "bg-primary"
                  )}
                  style={{
                    width: `${
                      progress.totalQuestions > 0
                        ? (progress.totalAnswered / progress.totalQuestions) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile progress bar (fixed at bottom above submit) */}
      <div className="sticky top-14 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur-sm lg:hidden">
        <div className="flex items-center justify-between text-xs">
          <div className="flex gap-2">
            {progress.sections.map((s) => (
              <button
                key={s.sectionNumber}
                type="button"
                onClick={() => scrollToSection(s.sectionNumber)}
                className={cn(
                  "rounded-md px-2 py-1 font-medium transition-colors",
                  s.answered === s.total
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                )}
              >
                大問{s.sectionNumber}
                <span className="ml-1 tabular-nums">
                  {s.answered}/{s.total}
                </span>
              </button>
            ))}
          </div>
          <span className="font-semibold tabular-nums text-foreground">
            {progress.totalAnswered}/{progress.totalQuestions}
          </span>
        </div>
      </div>

      {/* Sections */}
      {rubric.sections.map((section) => (
        <Card
          key={section.number}
          ref={(el) => {
            if (el) sectionRefs.current.set(section.number, el);
          }}
          id={`section-${section.number}`}
          className="scroll-mt-20"
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                大問{section.number}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({section.points}点)
                </span>
              </CardTitle>
              {/* Section-level progress badge */}
              {(() => {
                const sp = progress.sections.find(
                  (s) => s.sectionNumber === section.number
                );
                if (!sp) return null;
                return (
                  <Badge
                    variant={sp.answered === sp.total ? "default" : "outline"}
                    className="text-xs"
                  >
                    {sp.answered}/{sp.total} 回答済
                  </Badge>
                );
              })()}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {section.questions.map((question, qi) => {
              const key = `${section.number}-${question.number}`;
              const answer = answers[key];
              const isAnswered =
                answer &&
                ((answer.type === "essay" &&
                  (answer.text || ("imageUrl" in answer && answer.imageUrl))) ||
                  (answer.type === "fill_in_blank" && answer.text.trim()) ||
                  (answer.type === "mark_sheet" && answer.selected));

              return (
                <div
                  key={key}
                  id={`question-${key}`}
                  className={cn(
                    "space-y-2 rounded-lg border p-4 transition-colors",
                    isAnswered
                      ? "border-success/30 bg-success/5"
                      : "border-border"
                  )}
                >
                  {/* Question header */}
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {qi + 1}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {ANSWER_TYPE_LABELS[question.type]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {question.points}点
                    </span>
                    {isAnswered && (
                      <span className="ml-auto text-xs font-medium text-success">
                        回答済
                      </span>
                    )}
                  </div>

                  {/* Type-specific input */}
                  {question.type === "essay" && (
                    <EssayAnswerInput
                      questionNumber={question.number}
                      onChange={(value) => handleAnswerChange(key, value)}
                      initialValue={
                        answer?.type === "essay"
                          ? (answer as { type: "essay"; text?: string; imageUrl?: string })
                          : undefined
                      }
                    />
                  )}

                  {question.type === "mark_sheet" && (
                    <MarkSheetInput
                      questionNumber={question.number}
                      choices={question.choices}
                      onChange={(value) => handleAnswerChange(key, value)}
                      initialValue={
                        answer?.type === "mark_sheet"
                          ? (answer as { type: "mark_sheet"; selected: string })
                          : undefined
                      }
                    />
                  )}

                  {question.type === "fill_in_blank" && (
                    <FillInBlankInput
                      questionNumber={question.number}
                      onChange={(value) => handleAnswerChange(key, value)}
                      initialValue={
                        answer?.type === "fill_in_blank"
                          ? (answer as { type: "fill_in_blank"; text: string })
                          : undefined
                      }
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Submit button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="mr-2 h-4 w-4" aria-hidden="true" />
        )}
        解答を提出してAI採点
      </Button>

      {/* Scroll to top button */}
      {showScrollNav && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background shadow-md transition-all hover:bg-muted lg:bottom-8 lg:right-8"
          aria-label="トップに戻る"
        >
          <ChevronUp className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
