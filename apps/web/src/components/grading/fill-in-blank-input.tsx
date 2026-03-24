"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface FillInBlankInputProps {
  questionNumber: string;
  onChange: (value: { type: "fill_in_blank"; text: string }) => void;
  initialValue?: { type: "fill_in_blank"; text: string };
  /** Number of blanks (renders multiple inline inputs) */
  blankCount?: number;
  /** Placeholder per blank (defaults to "解答を入力...") */
  placeholders?: string[];
}

// ──────────────────────────────────────────────
// Normalization helpers
// ──────────────────────────────────────────────

/**
 * Detect whether input contains mixed full-width/half-width characters.
 * Returns a localized hint string or null if no issue detected.
 */
function getWidthHint(text: string): string | null {
  const hasFullWidth = /[\uFF01-\uFF5E]/.test(text);
  const hasHalfWidth = /[\u0021-\u007E]/.test(text);

  if (hasFullWidth && hasHalfWidth) {
    return "全角と半角が混在しています";
  }
  return null;
}

// ──────────────────────────────────────────────
// Single blank input sub-component
// ──────────────────────────────────────────────

function BlankInput({
  value,
  placeholder,
  onChange,
  index,
  questionNumber,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  index: number;
  questionNumber: string;
}) {
  const widthHint = getWidthHint(value);

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${questionNumber} 空欄${index + 1}`}
          className={cn(
            "border-b-2 border-t-0 border-l-0 border-r-0 rounded-none bg-transparent transition-colors",
            "px-1 text-center font-medium",
            "focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0",
            value.trim()
              ? "border-primary/60"
              : "border-muted-foreground/40"
          )}
        />
      </div>
      {widthHint && (
        <p className="text-[10px] text-amber-600">
          {widthHint}
        </p>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────

export function FillInBlankInput({
  questionNumber,
  onChange,
  initialValue,
  blankCount = 1,
  placeholders,
}: FillInBlankInputProps) {
  // For multi-blank, store individual blank values separated by "|"
  const [values, setValues] = useState<string[]>(() => {
    if (initialValue?.text) {
      const parts = initialValue.text.split("|");
      // Ensure we always have the right number of blanks
      return Array.from({ length: blankCount }, (_, i) => parts[i] ?? "");
    }
    return Array.from({ length: blankCount }, () => "");
  });

  const handleBlankChange = useCallback(
    (index: number, value: string) => {
      setValues((prev) => {
        const next = [...prev];
        next[index] = value;
        // Emit the combined value with "|" separator
        const combined = next.join("|");
        onChange({ type: "fill_in_blank", text: combined });
        return next;
      });
    },
    [onChange]
  );

  // Single blank — simplified layout
  if (blankCount === 1) {
    const text = values[0] ?? "";
    const widthHint = getWidthHint(text);

    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{questionNumber}</Label>
        <div className="relative">
          <Input
            placeholder={placeholders?.[0] ?? "解答を入力..."}
            value={text}
            onChange={(e) => handleBlankChange(0, e.target.value)}
            className={cn(
              "border-b-2 border-t-0 border-l-0 border-r-0 rounded-none bg-transparent transition-colors",
              "px-1 text-center text-base font-medium",
              "focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0",
              text.trim()
                ? "border-primary/60"
                : "border-muted-foreground/40"
            )}
          />
        </div>
        {/* Width normalization hint */}
        <div className="min-h-[1rem]">
          {widthHint && (
            <p className="text-[10px] text-amber-600">{widthHint}</p>
          )}
        </div>
      </div>
    );
  }

  // Multi-blank layout
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{questionNumber}</Label>

      <div className="flex flex-wrap items-end gap-3">
        {values.map((value, i) => (
          <div key={i} className="min-w-[120px] flex-1">
            <span className="mb-1 block text-[10px] text-muted-foreground">
              空欄{i + 1}
            </span>
            <BlankInput
              value={value}
              placeholder={placeholders?.[i] ?? "解答を入力..."}
              onChange={(v) => handleBlankChange(i, v)}
              index={i}
              questionNumber={questionNumber}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

FillInBlankInput.displayName = "FillInBlankInput";
