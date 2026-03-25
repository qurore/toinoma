"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Brain, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Grading status indicator with animated transitions:
//   "submitting" → "grading" → "complete"
// The "complete" state shows a score count-up animation when score is provided.

interface GradingStatusIndicatorProps {
  status: "submitting" | "grading" | "complete" | "idle";
  /** Final score to display in the complete state (0-100 percent) */
  scorePercent?: number;
  role?: React.AriaRole;
}

const STATUS_CONFIG = {
  idle: {
    icon: Send,
    label: "",
    description: "",
    color: "text-muted-foreground",
    bgColor: "bg-muted/30",
    ringColor: "border-muted",
  },
  submitting: {
    icon: Send,
    label: "送信中...",
    description: "解答データを送信しています",
    color: "text-primary",
    bgColor: "bg-primary/5",
    ringColor: "border-primary/30",
  },
  grading: {
    icon: Brain,
    label: "AI採点中",
    description: "AIが解答を分析し、ルーブリックに基づいて採点しています",
    color: "text-warning",
    bgColor: "bg-warning/5",
    ringColor: "border-warning/30",
  },
  complete: {
    icon: CheckCircle2,
    label: "採点完了！",
    description: "結果ページに移動します...",
    color: "text-success",
    bgColor: "bg-success/5",
    ringColor: "border-success/30",
  },
} as const;

const GRADING_STEPS = [
  "解答を受信しています",
  "ルーブリックを照合しています",
  "AIが分析しています",
  "スコアを算出しています",
];

function useCountUp(target: number, duration: number, enabled: boolean): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled || target <= 0) return;

    // Respect prefers-reduced-motion: skip animation, show final value immediately
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setValue(target);
      return;
    }

    const start = performance.now();
    let rafId: number;
    let cancelled = false;
    const step = (now: number) => {
      if (cancelled) return;
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => { cancelled = true; cancelAnimationFrame(rafId); };
  }, [target, duration, enabled]);
  return value;
}

export function GradingStatusIndicator({
  status,
  scorePercent,
  role,
}: GradingStatusIndicatorProps) {
  const [dots, setDots] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const dotsRef = useRef("");
  const displayScore = useCountUp(scorePercent ?? 0, 1200, status === "complete");

  // Animated dots for grading state (respects prefers-reduced-motion)
  useEffect(() => {
    if (status !== "grading") {
      dotsRef.current = "";
      const resetTimer = setTimeout(() => setDots(""), 0);
      return () => clearTimeout(resetTimer);
    }

    // Skip animation for reduced motion preference — show static ellipsis
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDots("...");
      return;
    }

    const interval = setInterval(() => {
      dotsRef.current = dotsRef.current.length >= 3 ? "" : dotsRef.current + ".";
      setDots(dotsRef.current);
    }, 500);

    return () => clearInterval(interval);
  }, [status]);

  // Cycle through grading step descriptions
  useEffect(() => {
    if (status !== "grading") {
      const timer = setTimeout(() => setActiveStep(0), 0);
      return () => clearTimeout(timer);
    }

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % GRADING_STEPS.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [status]);

  if (status === "idle") return null;

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const isAnimating = status === "submitting" || status === "grading";
  const showScore = status === "complete" && scorePercent != null;

  return (
    <div className="flex min-h-[400px] items-center justify-center py-16" role={role} aria-live={role === "status" ? "polite" : undefined}>
      <div
        className={cn(
          "mx-auto w-full max-w-sm rounded-2xl border p-8 text-center shadow-lg transition-all duration-500",
          config.bgColor,
          config.ringColor
        )}
      >
        {/* Animated icon with spinner ring */}
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          {/* Spinning ring */}
          {isAnimating && (
            <svg
              className="absolute inset-0 h-20 w-20 animate-spin"
              viewBox="0 0 80 80"
              style={{ animationDuration: "3s" }}
              aria-hidden="true"
            >
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="60 170"
                strokeLinecap="round"
                className={cn(
                  "opacity-40",
                  status === "submitting" ? "text-primary" : "text-warning"
                )}
              />
            </svg>
          )}

          {/* Pulsing background */}
          {isAnimating && (
            <div
              className={cn(
                "absolute inset-2 animate-pulse rounded-full opacity-20",
                status === "submitting" ? "bg-primary" : "bg-warning"
              )}
            />
          )}

          {/* Success ring */}
          {status === "complete" && (
            <svg
              className="absolute inset-0 h-20 w-20 -rotate-90"
              viewBox="0 0 80 80"
              aria-hidden="true"
            >
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-success/20"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-success transition-all duration-1000"
                strokeDasharray="226"
                strokeDashoffset="0"
                strokeLinecap="round"
              />
            </svg>
          )}

          {/* Icon */}
          <Icon
            className={cn(
              "relative z-10 h-8 w-8 transition-all duration-500",
              config.color,
              status === "complete" && "animate-[scale-in_0.3s_ease-out]"
            )}
            aria-hidden="true"
          />
        </div>

        {/* Score count-up display */}
        {showScore && (
          <div className="mb-2 animate-[fade-up_0.5s_ease-out]">
            <p className="font-display text-5xl font-bold tabular-nums text-foreground">
              {displayScore}
              <span className="text-2xl text-muted-foreground">%</span>
            </p>
          </div>
        )}

        {/* Status label */}
        <p
          className={cn(
            "text-lg font-semibold transition-all duration-500",
            config.color
          )}
        >
          {config.label}
          {status === "grading" && (
            <span className="inline-block w-6 text-left">{dots}</span>
          )}
        </p>

        {/* Encouragement message based on score tier */}
        {showScore && (
          <p className="mt-1 text-sm font-medium text-muted-foreground animate-[fade-in_0.8s_ease-out_0.5s_both]">
            {scorePercent >= 80 ? (
              <span className="flex items-center justify-center gap-1 text-success">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                素晴らしい成績です！
              </span>
            ) : scorePercent >= 50 ? (
              "いい調子です！復習で更に伸ばしましょう"
            ) : (
              "まだ伸びしろがあります。結果を確認しましょう"
            )}
          </p>
        )}

        {/* Description / rotating step text */}
        <p className="mt-2 h-5 text-sm text-muted-foreground transition-all">
          {status === "grading" ? GRADING_STEPS[activeStep] : config.description}
        </p>

        {/* Indeterminate progress bar for grading */}
        {status === "grading" && (
          <div className="mt-6 overflow-hidden rounded-full bg-warning/15">
            <div className="h-1.5 w-1/3 animate-[grading-slide_2s_ease-in-out_infinite] rounded-full bg-warning" />
          </div>
        )}

        {/* Success bar */}
        {status === "complete" && (
          <div className="mt-6">
            <div className="mx-auto h-1.5 w-32 overflow-hidden rounded-full bg-success/20">
              <div className="h-full w-full rounded-full bg-success transition-all duration-500" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
