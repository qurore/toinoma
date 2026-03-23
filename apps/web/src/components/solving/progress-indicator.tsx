"use client";

import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  totalQuestions: number;
  answeredQuestions: number;
  currentQuestion: number;
  onQuestionClick?: (index: number) => void;
}

export function ProgressIndicator({
  totalQuestions,
  answeredQuestions,
  currentQuestion,
  onQuestionClick,
}: ProgressIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {answeredQuestions}/{totalQuestions}
      </span>
      <div className="flex items-center gap-1">
        {Array.from({ length: totalQuestions }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onQuestionClick?.(i)}
            className={cn(
              "h-2.5 w-2.5 rounded-full transition-colors",
              i === currentQuestion && "ring-2 ring-primary ring-offset-1",
              i < answeredQuestions
                ? "bg-primary"
                : "bg-muted-foreground/20"
            )}
            aria-label={`問${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
