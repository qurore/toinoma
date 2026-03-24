"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface QuestionState {
  /** Zero-based index */
  index: number;
  /** Display label (e.g. "(1)", "問2") */
  label: string;
  /** Whether the student has provided an answer */
  answered: boolean;
}

interface ProgressIndicatorProps {
  /** Question state list with answered flags */
  questions: QuestionState[];
  /** Index of the currently focused question (-1 if none) */
  currentQuestion: number;
  /** Callback when a question dot/chip is clicked */
  onQuestionClick?: (index: number) => void;
  /** Compact mode: dots only (default). false = numbered chips */
  compact?: boolean;
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────

export function ProgressIndicator({
  questions,
  currentQuestion,
  onQuestionClick,
  compact = true,
}: ProgressIndicatorProps) {
  const answeredCount = questions.filter((q) => q.answered).length;

  return (
    <div className="flex items-center gap-2.5">
      {/* Counter badge */}
      <span
        className={cn(
          "shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
          answeredCount === questions.length
            ? "bg-success/10 text-success"
            : "bg-muted text-muted-foreground"
        )}
      >
        {answeredCount}/{questions.length}
      </span>

      {/* Question indicators */}
      <TooltipProvider delayDuration={200}>
        <div
          className={cn(
            "flex flex-wrap items-center",
            compact ? "gap-1" : "gap-1.5"
          )}
        >
          {questions.map((q) => {
            const isCurrent = q.index === currentQuestion;

            return compact ? (
              /* ── Dot mode ── */
              <Tooltip key={q.index}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onQuestionClick?.(q.index)}
                    className={cn(
                      "h-2.5 w-2.5 rounded-full transition-all",
                      isCurrent &&
                        "ring-2 ring-primary ring-offset-1 ring-offset-background",
                      q.answered
                        ? "bg-primary"
                        : "bg-muted-foreground/20 hover:bg-muted-foreground/40"
                    )}
                    aria-label={`${q.label}${q.answered ? "（回答済）" : "（未回答）"}`}
                    aria-current={isCurrent ? "step" : undefined}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {q.label}
                  {q.answered ? " — 回答済" : " — 未回答"}
                </TooltipContent>
              </Tooltip>
            ) : (
              /* ── Chip mode (numbered) ── */
              <Tooltip key={q.index}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onQuestionClick?.(q.index)}
                    className={cn(
                      "flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-xs font-medium transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isCurrent &&
                        "ring-2 ring-primary ring-offset-1 ring-offset-background",
                      q.answered
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                    aria-label={`${q.label}${q.answered ? "（回答済）" : "（未回答）"}`}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    {q.index + 1}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {q.label}
                  {q.answered ? " — 回答済" : " — 未回答"}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Progress bar (compact inline) */}
      <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            answeredCount === questions.length ? "bg-success" : "bg-primary"
          )}
          style={{
            width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%`,
          }}
        />
      </div>
    </div>
  );
}
