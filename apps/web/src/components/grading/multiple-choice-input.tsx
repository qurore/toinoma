"use client";

import { useState, useCallback, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface MultipleChoiceOption {
  label: string;
  value: string;
}

interface MultipleChoiceInputProps {
  questionNumber: string;
  options: MultipleChoiceOption[];
  multiSelect: boolean;
  onChange: (value: { type: "multiple_choice"; selected: string[] }) => void;
  initialValue?: { type: "multiple_choice"; selected: string[] };
}

// ──────────────────────────────────────────────
// Option item sub-component
// ──────────────────────────────────────────────

function OptionItem({
  option,
  isSelected,
  isMultiSelect,
  onClick,
  tabIndex,
}: {
  option: MultipleChoiceOption;
  isSelected: boolean;
  isMultiSelect: boolean;
  onClick: () => void;
  tabIndex: number;
}) {
  return (
    <button
      type="button"
      role={isMultiSelect ? "checkbox" : "radio"}
      aria-checked={isSelected}
      aria-label={`${option.label}: ${option.value}`}
      onClick={onClick}
      tabIndex={tabIndex}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        // Minimum touch target (44px height via py-3)
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-primary/30 hover:bg-muted/30"
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center transition-all",
          isMultiSelect ? "rounded-md" : "rounded-full",
          isSelected
            ? "border-2 border-primary bg-primary text-primary-foreground"
            : "border-2 border-muted-foreground/30 bg-background"
        )}
      >
        {isSelected && <Check className="h-3.5 w-3.5" />}
      </div>

      {/* Option label and value */}
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold",
            isSelected
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {option.label}
        </span>
        {option.value !== option.label && (
          <span
            className={cn(
              "ml-2 text-sm",
              isSelected ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {option.value}
          </span>
        )}
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────

export function MultipleChoiceInput({
  questionNumber,
  options,
  multiSelect,
  onChange,
  initialValue,
}: MultipleChoiceInputProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialValue?.selected ?? [])
  );

  const handleToggle = useCallback(
    (value: string) => {
      setSelected((prev) => {
        const next = new Set(prev);

        if (multiSelect) {
          // Toggle: add or remove
          if (next.has(value)) {
            next.delete(value);
          } else {
            next.add(value);
          }
        } else {
          // Single select: clear previous, set new (or deselect if same)
          if (next.has(value)) {
            next.clear();
          } else {
            next.clear();
            next.add(value);
          }
        }

        // Always emit change including empty selection
        const selectedArray = Array.from(next);
        onChange({ type: "multiple_choice", selected: selectedArray });

        return next;
      });
    },
    [multiSelect, onChange]
  );

  const handleClear = useCallback(() => {
    setSelected(new Set());
    onChange({ type: "multiple_choice", selected: [] });
  }, [onChange]);

  const selectedCount = selected.size;
  const optionsContainerRef = useRef<HTMLDivElement>(null);

  // Roving tabIndex: determine which option gets tabIndex={0}
  const focusableLabel = (() => {
    if (multiSelect) return null; // All checkboxes are independently focusable
    // For radio: selected option gets focus, or first if none selected
    const selectedLabels = Array.from(selected);
    if (selectedLabels.length > 0) return selectedLabels[0];
    return options[0]?.label ?? null;
  })();

  // Arrow key navigation for radiogroup (roving tabIndex pattern)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (multiSelect) return; // Checkboxes use natural tab order

      const keys = ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"];
      if (!keys.includes(e.key)) return;

      e.preventDefault();
      const container = optionsContainerRef.current;
      if (!container) return;

      const buttons = Array.from(
        container.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      );
      const currentIdx = buttons.findIndex(
        (btn) => btn === document.activeElement
      );
      if (currentIdx === -1) return;

      let nextIdx: number;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        nextIdx = (currentIdx + 1) % buttons.length;
      } else {
        nextIdx = (currentIdx - 1 + buttons.length) % buttons.length;
      }

      buttons[nextIdx].focus();
      // Select the option on arrow key navigation (standard radiogroup behavior)
      const optionLabel = options[nextIdx]?.label;
      if (optionLabel) handleToggle(optionLabel);
    },
    [multiSelect, options, handleToggle]
  );

  return (
    <div
      className="space-y-3"
      role={multiSelect ? "group" : "radiogroup"}
      aria-label={questionNumber}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{questionNumber}</Label>
          {multiSelect && (
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              複数選択可
            </span>
          )}
        </div>

        {/* Clear selection button */}
        {selectedCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 px-2 text-xs text-muted-foreground"
          >
            <RotateCcw className="mr-1 h-3 w-3" aria-hidden="true" />
            選択解除
          </Button>
        )}
      </div>

      {/* Options list */}
      <div
        className="space-y-2"
        ref={optionsContainerRef}
        onKeyDown={handleKeyDown}
      >
        {options.map((option) => (
          <OptionItem
            key={option.label}
            option={option}
            isSelected={selected.has(option.label)}
            isMultiSelect={multiSelect}
            onClick={() => handleToggle(option.label)}
            tabIndex={
              multiSelect
                ? 0
                : option.label === focusableLabel
                  ? 0
                  : -1
            }
          />
        ))}
      </div>

      {/* Selection state indicator — fixed height to prevent layout shift */}
      <div className="h-5">
        {selectedCount > 0 ? (
          <p className="text-xs text-muted-foreground">
            選択中:{" "}
            <span className="font-medium text-foreground">
              {Array.from(selected).join(", ")}
            </span>
            {multiSelect && (
              <span className="ml-1 text-muted-foreground">
                ({selectedCount}件)
              </span>
            )}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {multiSelect ? "1つ以上選択してください" : "1つ選択してください"}
          </p>
        )}
      </div>
    </div>
  );
}

MultipleChoiceInput.displayName = "MultipleChoiceInput";
