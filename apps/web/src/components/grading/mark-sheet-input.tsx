"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

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

// Fill animation duration in ms
const FILL_DURATION = 200;

// ──────────────────────────────────────────────
// Choice set detection
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// Bubble component with fill animation
// ──────────────────────────────────────────────

function Bubble({
  choice,
  isSelected,
  onClick,
  ariaLabel,
  choiceSetType,
}: {
  choice: string;
  isSelected: boolean;
  onClick: () => void;
  ariaLabel: string;
  choiceSetType: "alpha" | "numeric" | "katakana" | "mixed";
}) {
  const [animating, setAnimating] = useState(false);
  const prevSelected = useRef(isSelected);

  // Trigger fill animation when selection changes to this bubble.
  // Use requestAnimationFrame to avoid synchronous setState in effect.
  useEffect(() => {
    if (isSelected && !prevSelected.current) {
      const rafId = requestAnimationFrame(() => {
        setAnimating(true);
      });
      const timer = setTimeout(() => setAnimating(false), FILL_DURATION);
      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(timer);
      };
    }
    prevSelected.current = isSelected;
  }, [isSelected]);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center rounded-full border-2 transition-all select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isSelected
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50",
        // Choice set specific sizing — always meet minimum touch target
        choiceSetType === "numeric" || choiceSetType === "katakana"
          ? "h-11 w-11"
          : "h-11 min-w-11 px-3",
        // Fill animation
        animating && "scale-110"
      )}
      style={{
        minWidth: BUBBLE_SIZE,
        minHeight: BUBBLE_SIZE,
        transitionDuration: `${FILL_DURATION}ms`,
      }}
    >
      {/* Inner fill ring for selected state */}
      {isSelected && (
        <span
          className={cn(
            "absolute inset-1.5 rounded-full bg-primary-foreground/20",
            animating && "animate-pulse"
          )}
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
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────

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

  const handleClear = useCallback(() => {
    setSelected(null);
  }, []);

  const choiceSetType = detectChoiceSetType(choices);

  return (
    <div className="space-y-3" role="radiogroup" aria-label={questionNumber}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{questionNumber}</Label>
          {groupLabel && (
            <span className="text-xs text-muted-foreground">{groupLabel}</span>
          )}
        </div>

        {/* Clear selection button */}
        {selected && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 px-2 text-xs text-muted-foreground"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            選択解除
          </Button>
        )}
      </div>

      {/* Bubble grid mimicking real mark-sheet format */}
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => (
          <Bubble
            key={choice}
            choice={choice}
            isSelected={selected === choice}
            onClick={() => handleSelect(choice)}
            ariaLabel={`${questionNumber} ${choice}`}
            choiceSetType={choiceSetType}
          />
        ))}
      </div>

      {/* Selection indicator text — fixed height to prevent layout shift */}
      <div className="h-5">
        {selected ? (
          <p className="text-xs text-muted-foreground">
            選択中:{" "}
            <span className="font-medium text-foreground">{selected}</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            選択肢をタップしてください
          </p>
        )}
      </div>
    </div>
  );
}

MarkSheetInput.displayName = "MarkSheetInput";
