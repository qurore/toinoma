"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Brain, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────
// Grading status indicator
// ──────────────────────────────────────────────
// Shows animated transitions between grading states:
//   "submitting" → "grading" → "complete"

interface GradingStatusIndicatorProps {
  status: "submitting" | "grading" | "complete" | "idle";
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
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    ringColor: "border-amber-500/30",
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

// ──────────────────────────────────────────────
// Grading step indicators
// ──────────────────────────────────────────────

const GRADING_STEPS = [
  "解答を受信しています",
  "ルーブリックを照合しています",
  "AIが分析しています",
  "スコアを算出しています",
];

export function GradingStatusIndicator({
  status,
  role,
}: GradingStatusIndicatorProps) {
  const [dots, setDots] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const dotsRef = useRef("");

  // Animated dots for grading state
  useEffect(() => {
    if (status !== "grading") {
      dotsRef.current = "";
      const resetTimer = setTimeout(() => setDots(""), 0);
      return () => clearTimeout(resetTimer);
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
                  status === "submitting" ? "text-primary" : "text-amber-500"
                )}
              />
            </svg>
          )}

          {/* Pulsing background */}
          {isAnimating && (
            <div
              className={cn(
                "absolute inset-2 animate-pulse rounded-full opacity-20",
                status === "submitting" ? "bg-primary" : "bg-amber-500"
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
                className="text-success"
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
              config.color
            )}
          />
        </div>

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

        {/* Description / rotating step text */}
        <p className="mt-2 h-5 text-sm text-muted-foreground transition-all">
          {status === "grading" ? GRADING_STEPS[activeStep] : config.description}
        </p>

        {/* Indeterminate progress bar for grading */}
        {status === "grading" && (
          <div className="mt-6 overflow-hidden rounded-full bg-amber-100">
            <div className="h-1.5 w-1/3 animate-[grading-slide_2s_ease-in-out_infinite] rounded-full bg-amber-500" />
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
