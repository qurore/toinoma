"use client";

import { useState, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface MarkSheetInputProps {
  questionNumber: string;
  choices: string[];
  onChange: (value: { type: "mark_sheet"; selected: string }) => void;
  initialValue?: { type: "mark_sheet"; selected: string };
  /** Group label for grouped questions (e.g. "問1 ~ 問5") */
  groupLabel?: string;
}

// Minimum touch target size (WCAG 2.1 AA)
const BUBBLE_SIZE = 44;

export function MarkSheetInput({
  questionNumber,
  choices,
  onChange,
  initialValue,
  groupLabel,
}: MarkSheetInputProps) {
  const [selected, setSelected] = useState<string | null>(
    initialValue?.selected ?? null
  );

  const handleSelect = useCallback(
    (choice: string) => {
      // Toggle off if already selected
      const newValue = selected === choice ? null : choice;
      setSelected(newValue);
      if (newValue) {
        onChange({ type: "mark_sheet", selected: newValue });
      }
    },
    [selected, onChange]
  );

  // Detect choice set type for styling
  const choiceSetType = detectChoiceSetType(choices);

  return (
    <div className="space-y-3" role="radiogroup" aria-label={questionNumber}>
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{questionNumber}</Label>
        {groupLabel && (
          <span className="text-xs text-muted-foreground">{groupLabel}</span>
        )}
      </div>

      {/* Bubble grid mimicking real mark-sheet format */}
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => {
          const isSelected = selected === choice;

          return (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${questionNumber} ${choice}`}
              onClick={() => handleSelect(choice)}
              className={cn(
                "relative flex items-center justify-center rounded-full border-2 transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                // Size: minimum 44px touch target
                "select-none",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50",
                // Choice set specific sizing
                choiceSetType === "numeric"
                  ? "h-11 w-11"
                  : choiceSetType === "katakana"
                    ? "h-11 w-11"
                    : "h-11 min-w-11 px-3"
              )}
              style={{ minWidth: BUBBLE_SIZE, minHeight: BUBBLE_SIZE }}
            >
              {/* Filled bubble indicator */}
              {isSelected && (
                <span
                  className="absolute inset-1.5 rounded-full bg-primary-foreground/20"
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  "relative z-10 text-sm font-semibold",
                  isSelected ? "text-primary-foreground" : "text-foreground"
                )}
              >
                {choice}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selection indicator text */}
      <div className="h-5">
        {selected && (
          <p className="text-xs text-muted-foreground">
            選択中: <span className="font-medium text-foreground">{selected}</span>
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Detect the type of choice set for optimal layout styling.
 */
function detectChoiceSetType(
  choices: string[]
): "alpha" | "numeric" | "katakana" | "mixed" {
  const allNumeric = choices.every((c) => /^\d+$/.test(c));
  if (allNumeric) return "numeric";

  const allKatakana = choices.every((c) => /^[\u30A0-\u30FF]+$/.test(c));
  if (allKatakana) return "katakana";

  const allAlpha = choices.every((c) => /^[A-Za-z]$/.test(c));
  if (allAlpha) return "alpha";

  return "mixed";
}
