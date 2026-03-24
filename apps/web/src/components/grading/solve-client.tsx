"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnswerForm } from "./answer-form";
import { GradingResultDisplay } from "./grading-result";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Save, AlertTriangle } from "lucide-react";
import type { ProblemSetRubric, QuestionAnswer, GradingResult } from "@toinoma/shared/schemas";

// ──────────────────────────────────────────────
// Draft auto-save (SLV-009)
// ──────────────────────────────────────────────

const AUTO_SAVE_INTERVAL_MS = 30_000;

function getDraftKey(problemSetId: string, userId: string): string {
  return `draft-${problemSetId}-${userId}`;
}

function saveDraft(
  key: string,
  answers: Record<string, QuestionAnswer>
): void {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ answers, savedAt: Date.now() })
    );
  } catch {
    // localStorage may be full or unavailable — silently ignore
  }
}

function loadDraft(
  key: string
): { answers: Record<string, QuestionAnswer>; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.answers) {
      return parsed as { answers: Record<string, QuestionAnswer>; savedAt: number };
    }
    return null;
  } catch {
    return null;
  }
}

function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

// ──────────────────────────────────────────────
// Answer validation helpers (SLV-028)
// ──────────────────────────────────────────────

function getUnansweredQuestions(
  rubric: ProblemSetRubric,
  answers: Record<string, QuestionAnswer>
): string[] {
  const unanswered: string[] = [];
  for (const section of rubric.sections) {
    for (const question of section.questions) {
      const key = `${section.number}-${question.number}`;
      const answer = answers[key];
      if (!answer) {
        unanswered.push(`${section.number}-${question.number}`);
        continue;
      }
      // Check if the answer is effectively empty
      if (answer.type === "essay" && !answer.text && !("imageUrl" in answer && answer.imageUrl)) {
        unanswered.push(`${section.number}-${question.number}`);
      } else if (answer.type === "fill_in_blank" && !answer.text.trim()) {
        unanswered.push(`${section.number}-${question.number}`);
      } else if (answer.type === "mark_sheet" && !answer.selected) {
        unanswered.push(`${section.number}-${question.number}`);
      }
    }
  }
  return unanswered;
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────

export function SolveClient({
  problemSetId,
  rubric,
  userId,
}: {
  problemSetId: string;
  rubric: ProblemSetRubric;
  userId: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [unansweredQuestions, setUnansweredQuestions] = useState<string[]>([]);

  // Ref to track latest answers for auto-save without re-rendering
  const answersRef = useRef<Record<string, QuestionAnswer>>({});
  const draftKey = getDraftKey(problemSetId, userId);

  // Restore draft on mount
  const [initialAnswers, setInitialAnswers] = useState<Record<string, QuestionAnswer> | undefined>(undefined);

  useEffect(() => {
    const draft = loadDraft(draftKey);
    if (draft) {
      answersRef.current = draft.answers;
      setInitialAnswers(draft.answers);
      setDraftRestored(true);
      const savedDate = new Date(draft.savedAt);
      toast.info("下書きを復元しました", {
        description: `保存日時: ${savedDate.toLocaleString("ja-JP")}`,
      });
    } else {
      setInitialAnswers({});
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (Object.keys(answersRef.current).length > 0) {
        saveDraft(draftKey, answersRef.current);
      }
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [draftKey]);

  // Save on tab/window blur
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && Object.keys(answersRef.current).length > 0) {
        saveDraft(draftKey, answersRef.current);
      }
    };
    const handleBeforeUnload = () => {
      if (Object.keys(answersRef.current).length > 0) {
        saveDraft(draftKey, answersRef.current);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [draftKey]);

  const handleSaveDraft = useCallback(() => {
    if (Object.keys(answersRef.current).length > 0) {
      saveDraft(draftKey, answersRef.current);
      toast.success("下書きを保存しました");
    }
  }, [draftKey]);

  // Track answer changes for auto-save ref
  const handleAnswersChange = useCallback((answers: Record<string, QuestionAnswer>) => {
    answersRef.current = answers;
  }, []);

  const performSubmit = async (answers: Record<string, QuestionAnswer>) => {
    setError(null);

    const res = await fetch("/api/grading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemSetId, answers }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "採点に失敗しました");
      return;
    }

    // Clear draft on successful submission
    clearDraft(draftKey);

    setResult(data.result);

    // Navigate to result page
    if (data.submissionId) {
      router.push(`/problem/${problemSetId}/result/${data.submissionId}`);
    }
  };

  const handleSubmit = async (answers: Record<string, QuestionAnswer>) => {
    // SLV-028: Validate for unanswered questions before submission
    const unanswered = getUnansweredQuestions(rubric, answers);
    if (unanswered.length > 0) {
      answersRef.current = answers;
      setUnansweredQuestions(unanswered);
      setShowValidationDialog(true);
      return;
    }
    await performSubmit(answers);
  };

  const handleSubmitAnyway = async () => {
    setShowValidationDialog(false);
    await performSubmit(answersRef.current);
  };

  if (result) {
    return <GradingResultDisplay result={result} />;
  }

  // Wait for draft restoration check before rendering the form
  if (initialAnswers === undefined) {
    return null;
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {draftRestored && (
        <div className="mb-4 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
          前回の下書きを復元しました。続きから解答できます。
        </div>
      )}

      <AnswerForm
        rubric={rubric}
        problemSetId={problemSetId}
        onSubmit={handleSubmit}
        initialAnswers={initialAnswers}
        onAnswersChange={handleAnswersChange}
      />

      {/* Manual save draft button */}
      <div className="mt-4 flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveDraft}
        >
          <Save className="mr-2 h-4 w-4" />
          下書きを保存
        </Button>
      </div>

      {/* SLV-028: Unanswered questions warning dialog */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              未回答の問題があります
            </DialogTitle>
            <DialogDescription>
              {unansweredQuestions.length}問が未回答です。提出しますか？
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-muted/50 p-3">
            <p className="mb-2 text-sm font-medium">未回答の問題:</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {unansweredQuestions.map((qKey) => {
                const [section, question] = qKey.split("-");
                return (
                  <li key={qKey}>
                    大問{section} - 問{question}
                  </li>
                );
              })}
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowValidationDialog(false)}
            >
              解答を続ける
            </Button>
            <Button
              variant="default"
              onClick={handleSubmitAnyway}
            >
              このまま提出する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
