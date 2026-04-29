"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useReducer,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AutoSaveIndicator } from "./auto-save-indicator";
import {
  draftReducer,
  initialDraftState,
} from "@/lib/draft/save-state-machine";
import { useOnlineStatus } from "@/lib/draft/use-online-status";
import {
  retryWithBackoff,
  RetryableError,
} from "@/lib/draft/retry-with-backoff";
import { flushDraftToServer } from "@/lib/draft/send-beacon-flush";
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
  AlertTriangle,
  Clock,
  CheckCircle2,
  Loader2,
  Send,
  ChevronUp,
  GripVertical,
  Download,
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

// Server-side draft autosave is debounced to fire 5s after the last edit.
// localStorage writes happen synchronously on every edit so a tab close /
// crash never loses data even if the debounce hasn't elapsed.
const SERVER_SAVE_DEBOUNCE_MS = 5_000;
// Submit-time flush has a hard timeout — the user-facing submission flow
// must never hang waiting for draft persistence (the answers are about to
// be POSTed to /api/grading anyway, which is canonical).
const SUBMIT_FLUSH_TIMEOUT_MS = 3_000;
const DRAFT_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days — matches server retention
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

// POST /api/draft with retry policy. Throws on exhaustion so the caller can
// drive the state machine into the `error` state and surface the toast.
async function postDraftWithRetry(
  problemSetId: string,
  answers: Record<string, QuestionAnswer>,
  signal: AbortSignal,
  onAttempt: (attempt: number, nextDelayMs: number) => void
): Promise<{ savedAt: string }> {
  return retryWithBackoff(
    async () => {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemSetId, answers }),
        signal,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new RetryableError(
          body.error ?? `HTTP ${res.status}`,
          res.status
        );
      }
      const data = (await res.json()) as { savedAt: string };
      return data;
    },
    {
      maxAttempts: 5,
      baseDelayMs: 1_000,
      maxDelayMs: 16_000,
      onAttempt,
      signal,
    }
  );
}

// GET /api/draft for mount-time reconciliation. No retry — fall back to
// localStorage on any network failure.
async function fetchServerDraft(
  problemSetId: string
): Promise<{ answers: Record<string, QuestionAnswer>; lastActiveAt: string } | null> {
  try {
    const res = await fetch(
      `/api/draft?problemSetId=${encodeURIComponent(problemSetId)}`,
      { credentials: "include" }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      draft: {
        answers: Record<string, QuestionAnswer>;
        lastActiveAt: string;
        expiresAt: string;
      } | null;
    };
    if (!json.draft) return null;
    return {
      answers: json.draft.answers,
      lastActiveAt: json.draft.lastActiveAt,
    };
  } catch {
    return null;
  }
}

// DELETE /api/draft after successful submission — fire-and-forget cleanup.
function deleteServerDraft(problemSetId: string): void {
  void fetch(
    `/api/draft?problemSetId=${encodeURIComponent(problemSetId)}`,
    { method: "DELETE", credentials: "include" }
  ).catch(() => {
    // Best-effort cleanup — server pg_cron will purge anyway.
  });
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
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      {timeStr}
    </div>
  );
}

// AutoSaveIndicator is imported from ./auto-save-indicator (extracted in
// the FR-D6 server-draft refactor — see TDD §8 for the 7-state machine).

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
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
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
          <div className="flex gap-1.5 overflow-x-auto">
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
                  "shrink-0 rounded-md px-2.5 py-1.5 font-medium transition-colors",
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
          <span className="shrink-0 pl-2 font-semibold tabular-nums text-foreground">
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [unansweredQuestions, setUnansweredQuestions] = useState<string[]>([]);
  const [serverDraftBanner, setServerDraftBanner] = useState<{
    serverActiveAt: string;
  } | null>(null);
  const [submitPhase, setSubmitPhase] = useState<
    "idle" | "saving_draft" | "submitting_grade"
  >("idle");
  const [draftState, dispatchDraft] = useReducer(
    draftReducer,
    initialDraftState
  );
  const [gradingStatus, setGradingStatus] = useState<
    "idle" | "submitting" | "grading" | "complete"
  >("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScrollNav, setShowScrollNav] = useState(false);
  const [mobileTab, setMobileTab] = useState<string>(problemPdfUrl ? "problem" : "answers");
  const [dividerPosition, setDividerPosition] = useState(DEFAULT_DIVIDER_POSITION);
  const [initialized, setInitialized] = useState(false);
  const isOnline = useOnlineStatus();

  const answersRef = useRef<Record<string, QuestionAnswer>>({});
  const debounceTimerRef = useRef<number | null>(null);
  const inFlightAbortRef = useRef<AbortController | null>(null);
  const lastPushedSerializedRef = useRef<string>("");
  const wasOfflineRef = useRef<boolean>(false);
  const reconcilingRef = useRef<boolean>(false);
  const draftKey = getDraftKey(problemSetId, userId);

  // ── Mount: localStorage-first paint, server reconcile in background ──
  // The first paint MUST NOT block on the network. localStorage hydrates
  // synchronously; the server fetch runs in parallel and reconciles via
  // newer-wins without remounting.
  useEffect(() => {
    const localDraft = loadDraft(draftKey);
    if (localDraft) {
      answersRef.current = localDraft.answers;
      setAnswers(localDraft.answers);
      setDraftRestored(true);
      lastPushedSerializedRef.current = JSON.stringify(localDraft.answers);
      dispatchDraft({
        type: "SAVE_SUCCESS",
        savedAt: new Date(localDraft.savedAt).toISOString(),
      });
    }
    setInitialized(true); // <- first paint happens here

    // Background server reconciliation
    void (async () => {
      const serverDraft = await fetchServerDraft(problemSetId);
      if (!serverDraft) return;
      const serverMs = new Date(serverDraft.lastActiveAt).getTime();
      const localMs = localDraft?.savedAt ?? 0;
      // 5s buffer absorbs trivial clock skew between client and server
      if (serverMs > localMs + 5_000) {
        reconcilingRef.current = true;
        answersRef.current = serverDraft.answers;
        setAnswers(serverDraft.answers);
        setDraftRestored(false);
        setServerDraftBanner({ serverActiveAt: serverDraft.lastActiveAt });
        saveDraft(draftKey, serverDraft.answers);
        lastPushedSerializedRef.current = JSON.stringify(serverDraft.answers);
        dispatchDraft({
          type: "SAVE_SUCCESS",
          savedAt: serverDraft.lastActiveAt,
        });
        reconcilingRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Debounced server save pipeline ──
  const pushDraftToServer = useCallback(async () => {
    if (reconcilingRef.current) return;
    if (Object.keys(answersRef.current).length === 0) return;
    const serialized = JSON.stringify(answersRef.current);
    if (serialized === lastPushedSerializedRef.current) return;
    if (!isOnline) {
      dispatchDraft({ type: "WENT_OFFLINE" });
      return;
    }
    // Cancel any in-flight save before starting a new one
    inFlightAbortRef.current?.abort();
    const controller = new AbortController();
    inFlightAbortRef.current = controller;
    dispatchDraft({ type: "SAVE_START" });
    try {
      const result = await postDraftWithRetry(
        problemSetId,
        answersRef.current,
        controller.signal,
        (attempt, nextDelayMs) => {
          dispatchDraft({
            type: "SAVE_RETRY",
            attempt,
            nextDelayMs,
          });
        }
      );
      lastPushedSerializedRef.current = serialized;
      dispatchDraft({ type: "SAVE_SUCCESS", savedAt: result.savedAt });
    } catch (err) {
      if (controller.signal.aborted) return;
      dispatchDraft({
        type: "SAVE_ERROR",
        message: err instanceof Error ? err.message : "unknown",
      });
      toast.error("下書きの保存に失敗しました", {
        description: "ローカルには保存されています。再試行してください。",
        action: {
          label: "再試行",
          onClick: () => void pushDraftToServer(),
        },
        duration: 30_000,
      });
    } finally {
      if (inFlightAbortRef.current === controller) {
        inFlightAbortRef.current = null;
      }
    }
  }, [problemSetId, isOnline]);

  // Schedule a debounced server save. Called from onAnswerChange.
  const scheduleServerSave = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      void pushDraftToServer();
    }, SERVER_SAVE_DEBOUNCE_MS);
  }, [pushDraftToServer]);

  // Flush any pending or in-flight save with a hard timeout.
  // Returns true if flush completed (or no flush was needed); false on timeout.
  const flushPendingDraft = useCallback(async (): Promise<boolean> => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const flushPromise = pushDraftToServer();
    const timeout = new Promise<"timeout">((resolve) =>
      window.setTimeout(() => resolve("timeout"), SUBMIT_FLUSH_TIMEOUT_MS)
    );
    const winner = await Promise.race([flushPromise.then(() => "ok" as const), timeout]);
    return winner === "ok";
  }, [pushDraftToServer]);

  // ── Online/offline transitions ──
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      dispatchDraft({ type: "WENT_OFFLINE" });
      return;
    }
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      const hasPending =
        JSON.stringify(answersRef.current) !== lastPushedSerializedRef.current;
      if (hasPending) {
        dispatchDraft({ type: "CAME_ONLINE_WITH_PENDING" });
        void pushDraftToServer();
      } else {
        dispatchDraft({ type: "CAME_ONLINE_NO_PENDING" });
      }
    }
  }, [isOnline, pushDraftToServer]);

  // ── visibilitychange flush via sendBeacon (synchronous-best-effort) ──
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "hidden" &&
        Object.keys(answersRef.current).length > 0
      ) {
        if (debounceTimerRef.current !== null) {
          window.clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        saveDraft(draftKey, answersRef.current);
        const serialized = JSON.stringify(answersRef.current);
        if (serialized !== lastPushedSerializedRef.current) {
          flushDraftToServer({
            problemSetId,
            answers: answersRef.current,
          });
        }
      }
    };
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(answersRef.current).length > 0) {
        saveDraft(draftKey, answersRef.current);
        const serialized = JSON.stringify(answersRef.current);
        if (serialized !== lastPushedSerializedRef.current) {
          flushDraftToServer({
            problemSetId,
            answers: answersRef.current,
          });
        }
        e.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [draftKey, problemSetId]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      inFlightAbortRef.current?.abort();
    };
  }, []);

  // ── Keyboard shortcuts (Ctrl+S save, Ctrl+Enter submit) ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S: save draft (immediate flush of pending debounce)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (Object.keys(answersRef.current).length > 0) {
          saveDraft(draftKey, answersRef.current);
          if (debounceTimerRef.current !== null) {
            window.clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
          }
          void pushDraftToServer();
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
  }, [draftKey, problemSetId, pushDraftToServer]);

  // ── Scroll tracking for back-to-top button ──
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollNav(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Answer change handler ──
  // localStorage write is synchronous; server save is debounced via
  // scheduleServerSave (5s after the last edit).
  const handleAnswerChange = useCallback(
    (key: string, value: QuestionAnswer) => {
      setAnswers((prev) => {
        const next = { ...prev, [key]: value };
        answersRef.current = next;
        saveDraft(draftKey, next);
        scheduleServerSave();
        return next;
      });
    },
    [draftKey, scheduleServerSave]
  );

  // ── Manual save (toolbar button) ──
  // Indicator drives the visual feedback; no toast on success — only
  // the indicator's saving → saved transition is shown.
  const handleSaveDraft = useCallback(() => {
    if (Object.keys(answersRef.current).length > 0) {
      saveDraft(draftKey, answersRef.current);
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      void pushDraftToServer();
    }
  }, [draftKey, pushDraftToServer]);

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

  // ── Submission logic (two-phase: flush draft → grade) ──
  const performSubmit = useCallback(
    async (submittedAnswers: Record<string, QuestionAnswer>) => {
      setError(null);
      setIsSubmitting(true);
      setGradingStatus("submitting");

      // Phase A — flush the pending draft with a hard 3s timeout.
      // Submission proceeds whether or not the flush completes; /api/grading
      // is the canonical persistence path.
      setSubmitPhase("saving_draft");
      try {
        await flushPendingDraft();
      } catch {
        // Never block submit on draft persistence
      }

      // Phase B — actual grading submission
      setSubmitPhase("submitting_grade");
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
          setSubmitPhase("idle");
          return;
        }

        // Clear draft on successful submission — both local and server
        clearDraft(draftKey);
        deleteServerDraft(problemSetId);
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
        setSubmitPhase("idle");
      }
    },
    [problemSetId, draftKey, router, flushPendingDraft]
  );

  const handleSubmit = useCallback(
    (submittedAnswers: Record<string, QuestionAnswer>) => {
      answersRef.current = submittedAnswers;
      const unanswered = getUnansweredQuestions(rubric, submittedAnswers);
      setUnansweredQuestions(unanswered);
      setShowConfirmDialog(true);
    },
    [rubric]
  );

  const handleConfirmSubmit = useCallback(async () => {
    setShowConfirmDialog(false);
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
    return <GradingStatusIndicator status={gradingStatus} role="status" />;
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

      {draftRestored && !serverDraftBanner && (
        <div className="mb-4 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
          前回の下書きを復元しました。続きから解答できます。
        </div>
      )}

      {serverDraftBanner && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
          <div>
            <p className="font-medium">別の端末で進めた解答を復元しました。</p>
            <p className="mt-1 text-xs text-primary/80">
              最終更新:{" "}
              {new Date(serverDraftBanner.serverActiveAt).toLocaleString(
                "ja-JP"
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setServerDraftBanner(null)}
            className="text-xs text-primary/80 hover:text-primary"
            aria-label="復元の通知を閉じる"
          >
            閉じる
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
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
          {/* Canonical instance — owns aria-live region */}
          <AutoSaveIndicator
            state={draftState}
            onRetry={() => void pushDraftToServer()}
            ownsAriaLive={true}
          />
          <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-0" onClick={handleSaveDraft}>
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
              className="flex flex-col overflow-hidden rounded-lg border border-border"
              style={{ width: `${dividerPosition}%` }}
            >
              <div className="flex h-10 shrink-0 items-center border-b border-border bg-muted/50 px-3">
                <span className="text-xs font-medium text-muted-foreground">
                  問題用紙
                </span>
              </div>
              <iframe
                src={problemPdfUrl!}
                className="w-full flex-1"
                title="問題PDF"
                // Prevent Supabase signed-URL tokens (in the query string) from
                // leaking via outbound links the embedded PDF may contain.
                referrerPolicy="no-referrer"
              />
              <p className="shrink-0 border-t border-border bg-muted/30 px-3 py-1.5 text-center text-xs text-muted-foreground">
                PDFを表示できない場合は{" "}
                <a
                  href={problemPdfUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  <Download className="h-3 w-3" aria-hidden="true" />
                  ダウンロード
                </a>
                {" "}してください
              </p>
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
                  問題文
                </TabsTrigger>
                <TabsTrigger value="answers" className="flex-1">
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
                    // Prevent Supabase signed-URL tokens from leaking via
                    // outbound links inside the embedded PDF.
                    referrerPolicy="no-referrer"
                  />
                  <p className="border-t border-border bg-muted/30 px-3 py-1.5 text-center text-xs text-muted-foreground">
                    PDFを表示できない場合は{" "}
                    <a
                      href={problemPdfUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      <Download className="h-3 w-3" aria-hidden="true" />
                      ダウンロード
                    </a>
                    {" "}してください
                  </p>
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

      {/* Submit section — prominent with progress summary */}
      <div className="mt-8 rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">
              解答状況
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
                progress.totalAnswered === progress.totalQuestions
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {progress.totalAnswered} / {progress.totalQuestions}問 回答済み
            </span>
          </div>
          {/* Decorative — header instance owns aria-live to avoid double announcements */}
          <div aria-hidden="true">
            <AutoSaveIndicator
              state={draftState}
              onRetry={() => void pushDraftToServer()}
              ownsAriaLive={false}
            />
          </div>
        </div>
        <Progress
          value={
            progress.totalQuestions > 0
              ? (progress.totalAnswered / progress.totalQuestions) * 100
              : 0
          }
          className="mb-4 h-2"
          indicatorClassName={
            progress.totalAnswered === progress.totalQuestions
              ? "bg-success"
              : "bg-primary"
          }
        />
        {/* min-width locks button width across the three label variants
            (per CLAUDE.md Button Layout Stability — text MAY change to
            communicate progress, width MUST NOT). */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleFormSubmit}
          disabled={isSubmitting}
          style={{ minWidth: "16rem" }}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          {submitPhase === "saving_draft"
            ? "下書きを保存しています…"
            : submitPhase === "submitting_grade"
              ? "採点を開始しています…"
              : "解答を提出してAI採点"}
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          ※ AI採点は参考スコアです。最終判断はご自身で行ってください。
        </p>
      </div>

      {/* Scroll to top button -- positioned above mobile tab bar on small screens */}
      {showScrollNav && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-20 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background shadow-md transition-all hover:bg-muted md:bottom-8 md:right-8 md:h-10 md:w-10"
          aria-label="トップに戻る"
        >
          <ChevronUp className="h-5 w-5" aria-hidden="true" />
        </button>
      )}

      {/* Submission confirmation dialog */}
      <Dialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {unansweredQuestions.length > 0 ? (
                <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
              )}
              {unansweredQuestions.length > 0
                ? "未回答の問題があります"
                : "解答を提出しますか？"}
            </DialogTitle>
            <DialogDescription>
              {unansweredQuestions.length > 0
                ? "未回答のまま提出すると、該当の問題は0点になります。"
                : "すべての問題に回答済みです。提出するとAI採点が開始されます。"}
            </DialogDescription>
          </DialogHeader>

          {/* Answer summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-4 py-3">
              <span className="text-sm text-muted-foreground">回答済み</span>
              <span className="text-sm font-semibold tabular-nums">
                <span className={progress.totalAnswered === progress.totalQuestions ? "text-success" : "text-foreground"}>
                  {progress.totalAnswered}
                </span>
                <span className="text-muted-foreground"> / {progress.totalQuestions}問</span>
              </span>
            </div>

            {unansweredQuestions.length > 0 && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="mb-2 text-xs font-medium text-amber-600">
                  未回答の問題 ({unansweredQuestions.length}問)
                </p>
                <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                  {unansweredQuestions.map((qKey) => {
                    const [sectionNum, questionNum] = qKey.split("-");
                    return (
                      <Badge
                        key={qKey}
                        variant="outline"
                        className="border-amber-500/40 bg-amber-500/10 text-xs text-amber-700"
                      >
                        大問{sectionNum} - {questionNum}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Per-section breakdown */}
            <div className="space-y-1.5">
              {progress.sections.map((s) => (
                <div key={s.sectionNumber} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">大問{s.sectionNumber}</span>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={s.total > 0 ? (s.answered / s.total) * 100 : 0}
                      className="h-1.5 w-20"
                      indicatorClassName={s.answered === s.total ? "bg-success" : "bg-primary"}
                    />
                    <span className={cn(
                      "w-12 text-right tabular-nums font-medium",
                      s.answered === s.total ? "text-success" : "text-muted-foreground"
                    )}>
                      {s.answered}/{s.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              戻る
            </Button>
            <Button variant="default" onClick={handleConfirmSubmit}>
              <Send className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              提出する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
