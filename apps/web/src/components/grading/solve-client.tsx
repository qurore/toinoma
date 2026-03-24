"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnswerForm } from "./answer-form";
import { GradingResultDisplay } from "./grading-result";
import { GradingStatusIndicator } from "./grading-status-indicator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Save,
  AlertTriangle,
  Clock,
  FileText,
  Edit3,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ProblemSetRubric,
  QuestionAnswer,
  GradingResult,
} from "@toinoma/shared/schemas";

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
      return parsed as {
        answers: Record<string, QuestionAnswer>;
        savedAt: number;
      };
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
      if (
        answer.type === "essay" &&
        !answer.text &&
        !("imageUrl" in answer && answer.imageUrl)
      ) {
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
// Timer component
// ──────────────────────────────────────────────

function ExamTimer({
  timeLimitMinutes,
  onTimeUp,
}: {
  timeLimitMinutes: number;
  onTimeUp: () => void;
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(
    timeLimitMinutes * 60
  );
  const timeUpTriggered = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0 && !timeUpTriggered.current) {
          timeUpTriggered.current = true;
          onTimeUp();
        }
        return Math.max(0, next);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onTimeUp]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const isWarning = secondsRemaining <= 300; // 5 minutes
  const isCritical = secondsRemaining <= 60; // 1 minute

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium tabular-nums",
        isCritical
          ? "animate-pulse bg-destructive/10 text-destructive"
          : isWarning
            ? "bg-amber-500/10 text-amber-600"
            : "bg-muted text-muted-foreground"
      )}
    >
      <Clock className="h-3.5 w-3.5" />
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </div>
  );
}

// ──────────────────────────────────────────────
// Auto-save indicator
// ──────────────────────────────────────────────

function AutoSaveIndicator({ lastSaved }: { lastSaved: number | null }) {
  if (!lastSaved) return null;

  const date = new Date(lastSaved);
  const timeStr = date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <CheckCircle2 className="h-3 w-3 text-success" />
      <span>{timeStr} 自動保存済</span>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────

export function SolveClient({
  problemSetId,
  rubric,
  userId,
  problemPdfUrl,
  timeLimitMinutes,
}: {
  problemSetId: string;
  rubric: ProblemSetRubric;
  userId: string;
  problemPdfUrl?: string | null;
  timeLimitMinutes?: number | null;
}) {
  const router = useRouter();
  const [result, setResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [unansweredQuestions, setUnansweredQuestions] = useState<string[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [gradingStatus, setGradingStatus] = useState<
    "idle" | "submitting" | "grading" | "complete"
  >("idle");

  // Mobile tab state for split view toggle
  const [mobileTab, setMobileTab] = useState<string>("answers");

  // Ref to track latest answers for auto-save without re-rendering
  const answersRef = useRef<Record<string, QuestionAnswer>>({});
  const draftKey = getDraftKey(problemSetId, userId);

  // Restore draft on mount
  const [initialAnswers, setInitialAnswers] = useState<
    Record<string, QuestionAnswer> | undefined
  >(undefined);

  useEffect(() => {
    const draft = loadDraft(draftKey);
    if (draft) {
      answersRef.current = draft.answers;
      setInitialAnswers(draft.answers);
      setDraftRestored(true);
      setLastSavedAt(draft.savedAt);
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
        setLastSavedAt(Date.now());
      }
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [draftKey]);

  // Save on tab/window blur
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "hidden" &&
        Object.keys(answersRef.current).length > 0
      ) {
        saveDraft(draftKey, answersRef.current);
        setLastSavedAt(Date.now());
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
      setLastSavedAt(Date.now());
      toast.success("下書きを保存しました");
    }
  }, [draftKey]);

  // Track answer changes for auto-save ref
  const handleAnswersChange = useCallback(
    (answers: Record<string, QuestionAnswer>) => {
      answersRef.current = answers;
    },
    []
  );

  const performSubmit = async (answers: Record<string, QuestionAnswer>) => {
    setError(null);
    setGradingStatus("submitting");

    try {
      // Brief delay to show the submitting state
      await new Promise((resolve) => setTimeout(resolve, 500));
      setGradingStatus("grading");

      const res = await fetch("/api/grading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemSetId, answers }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "採点に失敗しました");
        setGradingStatus("idle");
        return;
      }

      // Clear draft on successful submission
      clearDraft(draftKey);

      setGradingStatus("complete");
      setResult(data.result);

      // Navigate to result page after showing completion state
      if (data.submissionId) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        router.push(`/problem/${problemSetId}/result/${data.submissionId}`);
      }
    } catch {
      setError("採点リクエストに失敗しました。もう一度お試しください。");
      setGradingStatus("idle");
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

  // Timer time-up callback
  const handleTimeUp = useCallback(() => {
    toast.warning("制限時間になりました。解答を提出してください。", {
      duration: 10000,
    });
  }, []);

  // Question count for progress
  const totalQuestions = useMemo(
    () => rubric.sections.reduce((sum, s) => sum + s.questions.length, 0),
    [rubric]
  );

  // Show grading status overlay when submitting/grading
  if (gradingStatus !== "idle") {
    return <GradingStatusIndicator status={gradingStatus} />;
  }

  if (result) {
    return <GradingResultDisplay result={result} />;
  }

  // Wait for draft restoration check before rendering the form
  if (initialAnswers === undefined) {
    return null;
  }

  // Check if we have a PDF to show in split view
  const hasPdf = !!problemPdfUrl;

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

      {/* Header bar with timer and auto-save indicator */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            全{totalQuestions}問
          </Badge>
          {timeLimitMinutes != null && timeLimitMinutes > 0 && (
            <ExamTimer
              timeLimitMinutes={timeLimitMinutes}
              onTimeUp={handleTimeUp}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <AutoSaveIndicator lastSaved={lastSavedAt} />
          <Button variant="outline" size="sm" onClick={handleSaveDraft}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            保存
          </Button>
        </div>
      </div>

      {/* Split view: PDF on left/top, answers on right/bottom */}
      {hasPdf ? (
        <>
          {/* Desktop: side-by-side split view */}
          <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6">
            {/* Problem sheet (left) */}
            <div className="sticky top-20 h-[calc(100vh-6rem)] overflow-hidden rounded-lg border border-border">
              <div className="flex h-10 items-center border-b border-border bg-muted/50 px-3">
                <FileText className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  問題用紙
                </span>
              </div>
              <iframe
                src={problemPdfUrl!}
                className="h-[calc(100%-2.5rem)] w-full"
                title="問題PDF"
              />
            </div>

            {/* Answer sheet (right) */}
            <div>
              <div className="mb-3 flex h-10 items-center rounded-t-lg border border-b-0 border-border bg-muted/50 px-3">
                <Edit3 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  解答用紙
                </span>
              </div>
              <AnswerForm
                rubric={rubric}
                problemSetId={problemSetId}
                onSubmit={handleSubmit}
                initialAnswers={initialAnswers}
                onAnswersChange={handleAnswersChange}
              />
            </div>
          </div>

          {/* Mobile/Tablet: tabbed toggle between problem and answers */}
          <div className="lg:hidden">
            <Tabs
              value={mobileTab}
              onValueChange={setMobileTab}
              className="w-full"
            >
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="problem" className="flex-1">
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  問題用紙
                </TabsTrigger>
                <TabsTrigger value="answers" className="flex-1">
                  <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                  解答用紙
                </TabsTrigger>
              </TabsList>

              <TabsContent value="problem">
                <div className="overflow-hidden rounded-lg border border-border">
                  <iframe
                    src={problemPdfUrl!}
                    className="h-[70vh] w-full"
                    title="問題PDF"
                  />
                </div>
              </TabsContent>

              <TabsContent value="answers">
                <AnswerForm
                  rubric={rubric}
                  problemSetId={problemSetId}
                  onSubmit={handleSubmit}
                  initialAnswers={initialAnswers}
                  onAnswersChange={handleAnswersChange}
                />
              </TabsContent>
            </Tabs>
          </div>
        </>
      ) : (
        // No PDF — single column answer form
        <AnswerForm
          rubric={rubric}
          problemSetId={problemSetId}
          onSubmit={handleSubmit}
          initialAnswers={initialAnswers}
          onAnswersChange={handleAnswersChange}
        />
      )}

      {/* SLV-028: Unanswered questions warning dialog */}
      <Dialog
        open={showValidationDialog}
        onOpenChange={setShowValidationDialog}
      >
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
            <Button variant="default" onClick={handleSubmitAnyway}>
              このまま提出する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
