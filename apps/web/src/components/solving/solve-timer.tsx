"use client";

import { useState, useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface SolveTimerProps {
  /** Time limit in minutes. null = count-up stopwatch mode */
  timeLimitMinutes: number | null;
  /** Callback when countdown reaches zero */
  onTimeUp?: () => void;
  /** Warning thresholds in seconds [warn, critical] */
  warningThresholds?: [number, number];
}

// ──────────────────────────────────────────────
// Timer display
// ──────────────────────────────────────────────

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────

export function SolveTimer({
  timeLimitMinutes,
  onTimeUp,
  warningThresholds = [300, 60],
}: SolveTimerProps) {
  const isCountdown = timeLimitMinutes !== null && timeLimitMinutes > 0;
  const initialSeconds = isCountdown ? timeLimitMinutes! * 60 : 0;

  const [seconds, setSeconds] = useState(initialSeconds);
  const timeUpTriggered = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (isCountdown) {
          const next = prev - 1;
          if (next <= 0) {
            clearInterval(interval);
            if (!timeUpTriggered.current) {
              timeUpTriggered.current = true;
              onTimeUp?.();
            }
            return 0;
          }
          return next;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isCountdown, onTimeUp]);

  const displaySeconds = Math.abs(seconds);
  const timeStr = formatTime(displaySeconds);

  const [warnAt, criticalAt] = warningThresholds;
  const isWarning = isCountdown && seconds <= warnAt && seconds > criticalAt;
  const isCritical = isCountdown && seconds <= criticalAt;
  const isTimeUp = isCountdown && seconds <= 0;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-mono font-semibold tabular-nums transition-colors",
        isCritical && "bg-destructive/10 text-destructive",
        isWarning && "bg-amber-500/10 text-amber-600",
        !isWarning && !isCritical && "bg-muted text-muted-foreground"
      )}
      role="timer"
      aria-label={isCountdown ? "残り時間" : "経過時間"}
      aria-live={isCritical ? "assertive" : "off"}
    >
      {isCritical && (
        <AlertTriangle className={cn("h-3.5 w-3.5", !isTimeUp && "animate-pulse")} />
      )}
      <span className={cn(isCritical && !isTimeUp && "animate-pulse")}>
        {timeStr}
      </span>
    </div>
  );
}
