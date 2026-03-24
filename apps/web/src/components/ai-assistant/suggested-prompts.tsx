"use client";

import { cn } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  { label: "この問題のヒントをください", icon: "💡" },
  { label: "この概念を説明してください", icon: "📖" },
  { label: "解法のアプローチを教えてください", icon: "🧭" },
  { label: "似た問題を出してください", icon: "📝" },
] as const;

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
  className?: string;
}

export function SuggestedPrompts({ onSelect, className }: SuggestedPromptsProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2", className)}>
      {SUGGESTED_PROMPTS.map((prompt) => (
        <button
          key={prompt.label}
          type="button"
          onClick={() => onSelect(prompt.label)}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="shrink-0 text-base" aria-hidden="true">
            {prompt.icon}
          </span>
          <span>{prompt.label}</span>
        </button>
      ))}
    </div>
  );
}
