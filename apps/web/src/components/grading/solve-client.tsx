"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EssayAnswerInput } from "./essay-answer-input";
import { MarkSheetInput } from "./mark-sheet-input";
import { FillInBlankInput } from "./fill-in-blank-input";
import { MultipleChoiceInput } from "./multiple-choice-input";
import { GradingStatusIndicator } from "./grading-status-indicator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Loader2,
  Send,
  ChevronUp,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ANSWER_TYPE_LABELS } from "@toinoma/shared/constants";
import type {
  ProblemSetRubric,
  QuestionAnswer,
  GradingResult,
} from "@toinoma/shared/schemas";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const AUTO_SAVE_INTERVAL_MS = 30_000;
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MIN_DIVIDER_POSITION = 25;
const MAX_DIVIDER_POSITION = 75;
const DEFAULT_DIVIDER_POSITION = 50;

// ──────────────────────────────────────────────
// Draft persistence (localStorage + server)
// ──────────────────────────────────────────────

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
      // Discard stale drafts
      if (Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
        localStorage.removeItem(key);
        return null;
      }
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

// Save draft to server (debounced, best-effort)
async function saveDraftToServer(
  problemSetId: string,
  answers: Record<string, QuestionAnswer>
): Promise<void> {
  try {
    await fetch("/api/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemSetId, answers }),
    });
  } catch {
    // Server draft save is best-effort — never block the user
  }
}

// ──────────────────────────────────────────────
// Progress computation
// ──────────────────────────────────────────────

interface QuestionProgress {
  key: string;
  sectionNumber: number;
  questionNumber: string;
  type: string;
  answered: boolean;
}

interface SectionProgress {
  sectionNumber: number;
  total: number;
  answered: number;
}

function computeProgress(
  rubric: ProblemSetRubric,
  answers: Record<string, QuestionAnswer>
): {
  questions: QuestionProgress[];
  sections: SectionProgress[];
  totalAnswered: number;
  totalQuestions: number;
} {
  let totalAnswered = 0;
  let totalQuestions = 0;
  const questions: QuestionProgress[] = [];

  const sections = rubric.sections.map((section) => {
    let answered = 0;
    const total = section.questions.length;
    totalQuestions += total;

    for (const question of section.questions) {
      const key = `${section.number}-${question.number}`;
      const answer = answers[key];
      const isAnswered = checkIsAnswered(answer);
      if (isAnswered) answered++;

      questions.push({
        key,
        sectionNumber: section.number,
        questionNumber: question.number,
        type: question.type,
        answered: isAnswered,
      });
    }

    totalAnswered += answered;
    return { sectionNumber: section.number, total, answered };
  });

  return { questions, sections, totalAnswered, totalQuestions };
}

function checkIsAnswered(answer: QuestionAnswer | undefined): boolean {
  if (!answer) return false;
  switch (answer.type) {
    case "essay":
      return !!(answer.text || ("imageUrl" in answer && answer.imageUrl));
    case "fill_in_blank":
      return !!answer.text.trim();
    case "mark_sheet":
      return !!answer.selected;
    case "multiple_choice":
      return answer.selected.length > 0;
    default:
      return false;
  }
}

function getUnansweredQuestions(
  rubric: ProblemSetRubric,
  answers: Record<string, QuestionAnswer>
): string[] {
  const unanswered: string[] = [];
  for (const section of rubric.sections) {
    for (const question of section.questions) {
      const key = `${section.number}-${question.number}`;
      if (!checkIsAnswered(answers[key])) {
        unanswered.push(key);
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
  const warningShown = useRef({ fiveMin: false, oneMin: false });

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        const next = prev - 1;

        // 5-minute warning
        if (next === 300 && !warningShown.current.fiveMin) {
          warningShown.current.fiveMin = true;
          toast.warning("残り5分です", { duration: 5000 });
        }

        // 1-minute warning
        if (next === 60 && !warningShown.current.oneMin) {
          warningShown.current.oneMin = true;
          toast.warning("残り1分です。提出を忘れずに。", { duration: 8000 });
        }

        if (next <= 0 && !timeUpTriggered.current) {
          timeUpTriggered.current = true;
          onTimeUp();
        }
        return Math.max(0, next);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onTimeUp]);

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;
  const isWarning = secondsRemaining <= 300;
  const isCritical = secondsRemaining <= 60;

  const timeStr =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium font-mono tabular-nums",
        isCritical
          ? "animate-pulse bg-destructive/10 text-destructive"
          : isWarning
            ? "bg-amber-500/10 text-amber-600"
            : "bg-muted text-muted-foreground"
      )}
      role="timer"
      aria-label="残り時間"
    >
      <Clock className="h-3.5 w-3.5" />
      {timeStr}
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
// Question navigation sidebar
// ──────────────────────────────────────────────

function QuestionNav({
  progress,
  onNavigate,
  className,
}: {
  progress: ReturnType<typeof computeProgress>;
  onNavigate: (key: string) => void;
  className?: string;
}) {
  return (
    <Card className={cn("shadow-md", className)}>
      <CardHeader className="p-3">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          問題ナビ
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <ScrollArea className="max-h-64">
          <div className="space-y-3">
            {progress.sections.map((section) => {
              const sectionQuestions = progress.questions.filter(
                (q) => q.sectionNumber === section.sectionNumber
              );
              return (
                <div key={section.sectionNumber}>
                  <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                    大問{section.sectionNumber}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {sectionQuestions.map((q, idx) => (
                      <button
                        key={q.key}
                        type="button"
                        onClick={() => onNavigate(q.key)}
                        title={`${q.questionNumber}`}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          q.answered
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Overall progress */}
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">進捗</span>
            <span className="font-semibold tabular-nums">
              {progress.totalAnswered}/{progress.totalQuestions}
            </span>
          </div>
          <Progress
            value={
              progress.totalQuestions > 0
                ? (progress.totalAnswered / progress.totalQuestions) * 100
                : 0
            }
            className="mt-1.5 h-1.5"
            indicatorClassName={
              progress.totalAnswered === progress.totalQuestions
                ? "bg-success"
                : "bg-primary"
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Resizable divider (desktop split view)
// ──────────────────────────────────────────────

function ResizableDivider({
  position,
  onPositionChange,
}: {
  position: number;
  onPositionChange: (position: number) => void;
}) {
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      const container = containerRef.current?.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = (x / rect.width) * 100;
      const clamped = Math.min(
        MAX_DIVIDER_POSITION,
        Math.max(MIN_DIVIDER_POSITION, percent)
      );
      onPositionChange(clamped);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onPositionChange]);

  return (
    <div
      ref={containerRef}
      className="group relative flex w-2 cursor-col-resize items-center justify-center"
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={position}
      aria-valuemin={MIN_DIVIDER_POSITION}
      aria-valuemax={MAX_DIVIDER_POSITION}
      aria-label="パネルサイズ変更"
    >
      <div className="h-full w-px bg-border transition-colors group-hover:bg-primary/40" />
      <div className="absolute flex h-8 w-5 items-center justify-center rounded-md bg-muted opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Answer form section
// ──────────────────────────────────────────────

function AnswerSection({
  rubric,
  answers,
  onAnswerChange,
  progress,
  onNavigateQuestion,
  subject,
}: {
  rubric: ProblemSetRubric;
  answers: Record<string, QuestionAnswer>;
  onAnswerChange: (key: string, value: QuestionAnswer) => void;
  progress: ReturnType<typeof computeProgress>;
  onNavigateQuestion: (key: string) => void;
  subject?: string;
}) {
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Expose refs for navigation
  useEffect(() => {
    const handler = (e: CustomEvent<{ key: string }>) => {
      const el = sectionRefs.current.get(e.detail.key);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Brief highlight
        el.classList.add("ring-2", "ring-primary/50");
        setTimeout(() => el.classList.remove("ring-2", "ring-primary/50"), 1500);
      }
    };
    window.addEventListener("navigate-question" as string, handler as EventListener);
    return () => window.removeEventListener("navigate-question" as string, handler as EventListener);
  }, []);

  return (
    <div className="space-y-6">
      {/* Mobile progress bar */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur-sm lg:hidden">
        <div className="flex items-center justify-between text-xs">
          <div className="flex gap-2">
            {progress.sections.map((s) => (
              <button
                key={s.sectionNumber}
                type="button"
                onClick={() =>
                  onNavigateQuestion(
                    progress.questions.find(
                      (q) => q.sectionNumber === s.sectionNumber
                    )?.key ?? ""
                  )
                }
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

      {/* Section cards */}
      {rubric.sections.map((section) => (
        <Card
          key={section.number}
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
              const isAnswered = checkIsAnswered(answer);

              return (
                <div
                  key={key}
                  id={`question-${key}`}
                  ref={(el) => {
                    if (el) sectionRefs.current.set(key, el);
                  }}
                  className={cn(
                    "space-y-2 rounded-lg border p-4 transition-all",
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
                      onChange={(value) => onAnswerChange(key, value)}
                      initialValue={
                        answer?.type === "essay"
                          ? (answer as {
                              type: "essay";
                              text?: string;
                              imageUrl?: string;
                            })
                          : undefined
                      }
                      subject={subject}
                    />
                  )}

                  {question.type === "mark_sheet" && (
                    <MarkSheetInput
                      questionNumber={question.number}
                      choices={question.choices}
                      onChange={(value) => onAnswerChange(key, value)}
                      initialValue={
                        answer?.type === "mark_sheet"
                          ? (answer as {
                              type: "mark_sheet";
                              selected: string;
                            })
                          : undefined
                      }
                    />
                  )}

                  {question.type === "fill_in_blank" && (
                    <FillInBlankInput
                      questionNumber={question.number}
                      onChange={(value) => onAnswerChange(key, value)}
                      initialValue={
                        answer?.type === "fill_in_blank"
                          ? (answer as { type: "fill_in_blank"; text: string })
                          : undefined
                      }
                    />
                  )}

                  {question.type === "multiple_choice" && (
                    <MultipleChoiceInput
                      questionNumber={question.number}
                      options={question.options}
                      multiSelect={question.multiSelect}
                      onChange={(value) => onAnswerChange(key, value)}
                      initialValue={
                        answer?.type === "multiple_choice"
                          ? (answer as {
                              type: "multiple_choice";
                              selected: string[];
                            })
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
  subject,
}: {
  problemSetId: string;
  rubric: ProblemSetRubric;
  userId: string;
  problemPdfUrl?: string | null;
  timeLimitMinutes?: number | null;
  subject?: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [result, setResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [unansweredQuestions, setUnansweredQuestions] = useState<string[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [gradingStatus, setGradingStatus] = useState<
    "idle" | "submitting" | "grading" | "complete"
  >("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScrollNav, setShowScrollNav] = useState(false);
  const [mobileTab, setMobileTab] = useState<string>("answers");
  const [dividerPosition, setDividerPosition] = useState(DEFAULT_DIVIDER_POSITION);
  const [initialized, setInitialized] = useState(false);

  const answersRef = useRef<Record<string, QuestionAnswer>>({});
  const draftKey = getDraftKey(problemSetId, userId);

  // ── Draft restoration on mount ──
  useEffect(() => {
    const draft = loadDraft(draftKey);
    if (draft) {
      answersRef.current = draft.answers;
      setAnswers(draft.answers);
      setDraftRestored(true);
      setLastSavedAt(draft.savedAt);
      const savedDate = new Date(draft.savedAt);
      toast.info("下書きを復元しました", {
        description: `保存日時: ${savedDate.toLocaleString("ja-JP")}`,
      });
    }
    setInitialized(true);
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-save every 30 seconds ──
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (Object.keys(answersRef.current).length > 0) {
        saveDraft(draftKey, answersRef.current);
        saveDraftToServer(problemSetId, answersRef.current);
        setLastSavedAt(Date.now());
      }
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [draftKey, problemSetId]);

  // ── Save on tab/window blur ──
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
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(answersRef.current).length > 0) {
        saveDraft(draftKey, answersRef.current);
        // Warn about unsaved changes
        e.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [draftKey]);

  // ── Keyboard shortcuts (Ctrl+S save, Ctrl+Enter submit) ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S: save draft
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (Object.keys(answersRef.current).length > 0) {
          saveDraft(draftKey, answersRef.current);
          saveDraftToServer(problemSetId, answersRef.current);
          setLastSavedAt(Date.now());
          toast.success("下書きを保存しました");
        }
      }
      // Ctrl+Enter / Cmd+Enter: submit
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit(answersRef.current);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, problemSetId]);

  // ── Scroll tracking for back-to-top button ──
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollNav(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Answer change handler ──
  const handleAnswerChange = useCallback(
    (key: string, value: QuestionAnswer) => {
      setAnswers((prev) => {
        const next = { ...prev, [key]: value };
        answersRef.current = next;
        return next;
      });
    },
    []
  );

  // ── Manual save ──
  const handleSaveDraft = useCallback(() => {
    if (Object.keys(answersRef.current).length > 0) {
      saveDraft(draftKey, answersRef.current);
      saveDraftToServer(problemSetId, answersRef.current);
      setLastSavedAt(Date.now());
      toast.success("下書きを保存しました");
    }
  }, [draftKey, problemSetId]);

  // ── Question navigation ──
  const handleNavigateQuestion = useCallback((key: string) => {
    const el = document.getElementById(`question-${key}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Brief highlight effect
      el.classList.add("ring-2", "ring-primary/50");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary/50"), 1500);
    }
  }, []);

  // ── Submission logic ──
  const performSubmit = useCallback(
    async (submittedAnswers: Record<string, QuestionAnswer>) => {
      setError(null);
      setIsSubmitting(true);
      setGradingStatus("submitting");

      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setGradingStatus("grading");

        const res = await fetch("/api/grading", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problemSetId,
            answers: submittedAnswers,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "採点に失敗しました");
          setGradingStatus("idle");
          setIsSubmitting(false);
          return;
        }

        // Clear draft on successful submission
        clearDraft(draftKey);
        setGradingStatus("complete");
        setResult(data.result);

        // Navigate to result page
        if (data.submissionId) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          router.push(`/problem/${problemSetId}/result/${data.submissionId}`);
        }
      } catch {
        setError("採点リクエストに失敗しました。もう一度お試しください。");
        setGradingStatus("idle");
        setIsSubmitting(false);
      }
    },
    [problemSetId, draftKey, router]
  );

  const handleSubmit = useCallback(
    async (submittedAnswers: Record<string, QuestionAnswer>) => {
      const unanswered = getUnansweredQuestions(rubric, submittedAnswers);
      if (unanswered.length > 0) {
        answersRef.current = submittedAnswers;
        setUnansweredQuestions(unanswered);
        setShowValidationDialog(true);
        return;
      }
      await performSubmit(submittedAnswers);
    },
    [rubric, performSubmit]
  );

  const handleSubmitAnyway = useCallback(async () => {
    setShowValidationDialog(false);
    await performSubmit(answersRef.current);
  }, [performSubmit]);

  const handleFormSubmit = useCallback(async () => {
    await handleSubmit(answersRef.current);
  }, [handleSubmit]);

  // ── Timer time-up callback ──
  const handleTimeUp = useCallback(() => {
    toast.warning("制限時間になりました。解答を提出してください。", {
      duration: 10000,
    });
  }, []);

  // ── Progress computation (memoized) ──
  const progress = useMemo(
    () => computeProgress(rubric, answers),
    [rubric, answers]
  );

  // ── Conditional rendering ──

  // Show grading status overlay
  if (gradingStatus !== "idle") {
    return <GradingStatusIndicator status={gradingStatus} />;
  }

  if (result) {
    return null; // Will redirect to result page
  }

  // Wait for draft restoration
  if (!initialized) {
    return null;
  }

  const hasPdf = !!problemPdfUrl;

  // ── Render ──
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

      {/* Header bar */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Progress indicator: "問 X / Y" */}
          <Badge variant="outline" className="text-xs tabular-nums">
            問 {progress.totalAnswered} / {progress.totalQuestions}
          </Badge>
          {/* Progress bar */}
          <Progress
            value={
              progress.totalQuestions > 0
                ? (progress.totalAnswered / progress.totalQuestions) * 100
                : 0
            }
            className="hidden h-2 w-24 sm:block"
            indicatorClassName={
              progress.totalAnswered === progress.totalQuestions
                ? "bg-success"
                : "bg-primary"
            }
          />
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

      {/* Question navigation sidebar (desktop only) */}
      <QuestionNav
        progress={progress}
        onNavigate={handleNavigateQuestion}
        className="hidden lg:fixed lg:right-4 lg:top-20 lg:z-40 lg:block lg:w-48 xl:right-8"
      />

      {/* Main content: split view or single column */}
      {hasPdf ? (
        <>
          {/* Desktop: side-by-side split view with resizable divider */}
          <div className="hidden lg:flex" style={{ minHeight: "calc(100vh - 14rem)" }}>
            {/* Problem sheet (left) */}
            <div
              className="overflow-hidden rounded-lg border border-border"
              style={{ width: `${dividerPosition}%` }}
            >
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

            {/* Resizable divider */}
            <ResizableDivider
              position={dividerPosition}
              onPositionChange={setDividerPosition}
            />

            {/* Answer sheet (right) */}
            <div
              className="min-w-0 overflow-y-auto pr-52"
              style={{ width: `${100 - dividerPosition}%` }}
            >
              <div className="mb-3 flex h-10 items-center rounded-t-lg border border-b-0 border-border bg-muted/50 px-3">
                <Edit3 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  解答用紙
                </span>
              </div>
              <AnswerSection
                rubric={rubric}
                answers={answers}
                onAnswerChange={handleAnswerChange}
                progress={progress}
                onNavigateQuestion={handleNavigateQuestion}
                subject={subject}
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
                  問題文
                </TabsTrigger>
                <TabsTrigger value="answers" className="flex-1">
                  <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                  解答
                  {progress.totalAnswered > 0 && (
                    <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
                      {progress.totalAnswered}/{progress.totalQuestions}
                    </span>
                  )}
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
                <AnswerSection
                  rubric={rubric}
                  answers={answers}
                  onAnswerChange={handleAnswerChange}
                  progress={progress}
                  onNavigateQuestion={handleNavigateQuestion}
                  subject={subject}
                />
              </TabsContent>
            </Tabs>
          </div>
        </>
      ) : (
        // No PDF — single column answer form
        <AnswerSection
          rubric={rubric}
          answers={answers}
          onAnswerChange={handleAnswerChange}
          progress={progress}
          onNavigateQuestion={handleNavigateQuestion}
          subject={subject}
        />
      )}

      {/* Submit button */}
      <div className="mt-6">
        <Button
          className="w-full"
          size="lg"
          onClick={handleFormSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          解答を提出してAI採点
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Ctrl+Enter でも提出できます
        </p>
      </div>

      {/* Scroll to top button */}
      {showScrollNav && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background shadow-md transition-all hover:bg-muted lg:bottom-8 lg:right-8"
          aria-label="トップに戻る"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}

      {/* Unanswered questions warning dialog */}
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
              {unansweredQuestions.length}問が未回答です。このまま提出しますか？
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-muted/50 p-3">
            <p className="mb-2 text-sm font-medium">未回答の問題:</p>
            <div className="flex flex-wrap gap-2">
              {unansweredQuestions.map((qKey) => {
                const [sectionNum, questionNum] = qKey.split("-");
                return (
                  <Badge key={qKey} variant="outline" className="text-xs">
                    大問{sectionNum} - {questionNum}
                  </Badge>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowValidationDialog(false)}
            >
              解答を続ける
            </Button>
            <Button variant="default" onClick={handleSubmitAnyway}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              このまま提出する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
