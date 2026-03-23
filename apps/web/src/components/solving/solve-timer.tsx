"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SolveTimerProps {
  timeLimitMinutes: number | null;
  onTimeUp?: () => void;
}

export function SolveTimer({ timeLimitMinutes, onTimeUp }: SolveTimerProps) {
  const isCountdown = timeLimitMinutes !== null && timeLimitMinutes > 0;
  const initialSeconds = isCountdown ? timeLimitMinutes! * 60 : 0;

  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (isCountdown) {
          const next = prev - 1;
          if (next <= 0) {
            clearInterval(interval);
            onTimeUp?.();
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
  const hours = Math.floor(displaySeconds / 3600);
  const mins = Math.floor((displaySeconds % 3600) / 60);
  const secs = displaySeconds % 60;

  const timeStr = hours > 0
    ? `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${mins}:${String(secs).padStart(2, "0")}`;

  const isWarning = isCountdown && seconds <= 300 && seconds > 60;
  const isCritical = isCountdown && seconds <= 60;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-mono font-medium",
        isCritical && "bg-destructive/10 text-destructive animate-pulse",
        isWarning && "bg-amber-500/10 text-amber-600",
        !isWarning && !isCritical && "text-muted-foreground"
      )}
      role="timer"
      aria-label={isCountdown ? "残り時間" : "経過時間"}
    >
      <Clock className="h-3.5 w-3.5" />
      {timeStr}
    </div>
  );
}
