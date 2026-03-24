"use client";

import { cn } from "@/lib/utils";

const DAILY_LIMIT = 50;

interface UsageIndicatorProps {
  used: number;
  className?: string;
}

export function UsageIndicator({ used, className }: UsageIndicatorProps) {
  const remaining = Math.max(0, DAILY_LIMIT - used);
  const percentage = (used / DAILY_LIMIT) * 100;
  const isWarning = percentage >= 80;
  const isExhausted = percentage >= 100;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>AI アシスタント利用状況</span>
        <span
          className={cn(
            isExhausted && "font-medium text-destructive",
            isWarning && !isExhausted && "font-medium text-warning"
          )}
        >
          残り {remaining} 回 / {DAILY_LIMIT} 回
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={DAILY_LIMIT}
        aria-label={`本日の利用回数: ${used} / ${DAILY_LIMIT}`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            isExhausted
              ? "bg-destructive"
              : isWarning
                ? "bg-warning"
                : "bg-primary"
          )}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}
