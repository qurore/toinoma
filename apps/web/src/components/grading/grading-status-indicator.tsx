"use client";

import { useEffect, useState } from "react";
import { Send, Brain, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────
// SLV-025: Grading status indicator
// ──────────────────────────────────────────────
// Shows animated transitions between grading states:
//   "submitting" → "grading" → "complete"

interface GradingStatusIndicatorProps {
  status: "submitting" | "grading" | "complete" | "idle";
}

const STATUS_CONFIG = {
  idle: {
    icon: Send,
    label: "",
    description: "",
    color: "text-muted-foreground",
    bgColor: "bg-muted/30",
    animate: false,
  },
  submitting: {
    icon: Send,
    label: "送信中...",
    description: "解答データを送信しています",
    color: "text-primary",
    bgColor: "bg-primary/5",
    animate: true,
  },
  grading: {
    icon: Brain,
    label: "AI採点中",
    description: "AIが解答を分析し、ルーブリックに基づいて採点しています",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    animate: true,
  },
  complete: {
    icon: CheckCircle2,
    label: "採点完了！結果を表示します",
    description: "結果ページに移動します...",
    color: "text-success",
    bgColor: "bg-success/5",
    animate: false,
  },
} as const;

export function GradingStatusIndicator({
  status,
}: GradingStatusIndicatorProps) {
  const [dots, setDots] = useState("");

  // Animated dots for grading state
  useEffect(() => {
    if (status !== "grading") {
      setDots("");
      return;
    }

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    return () => clearInterval(interval);
  }, [status]);

  if (status === "idle") return null;

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="flex min-h-[300px] items-center justify-center py-12">
      <div
        className={cn(
          "mx-auto max-w-sm rounded-xl border border-border p-8 text-center shadow-sm transition-all duration-500",
          config.bgColor
        )}
      >
        {/* Animated icon */}
        <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center">
          {/* Pulsing background ring */}
          {config.animate && (
            <div
              className={cn(
                "absolute inset-0 rounded-full opacity-20 animate-ping",
                status === "submitting" ? "bg-primary" : "bg-amber-500"
              )}
            />
          )}

          {/* Spinning border for active states */}
          {config.animate && (
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-current opacity-30" />
          )}

          {/* Icon */}
          <Icon
            className={cn(
              "h-8 w-8 transition-all duration-500",
              config.color,
              config.animate && "animate-pulse"
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

        {/* Description */}
        <p className="mt-2 text-sm text-muted-foreground">
          {config.description}
        </p>

        {/* Progress bar for grading */}
        {status === "grading" && <GradingProgressBar />}

        {/* Success checkmark animation */}
        {status === "complete" && (
          <div className="mt-4">
            <div className="mx-auto h-1 w-32 overflow-hidden rounded-full bg-success/20">
              <div className="h-full w-full bg-success" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Indeterminate progress bar for grading state
// ──────────────────────────────────────────────

function GradingProgressBar() {
  return (
    <div className="mt-6 overflow-hidden rounded-full bg-amber-100">
      <div
        className="h-1.5 w-1/3 rounded-full bg-amber-500"
        style={{
          animation: "grading-progress 2s ease-in-out infinite",
        }}
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes grading-progress {
              0% { transform: translateX(-100%); }
              50% { transform: translateX(200%); }
              100% { transform: translateX(-100%); }
            }
          `,
        }}
      />
    </div>
  );
}
