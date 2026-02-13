"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function MarkSheetInput({
  questionNumber,
  choices,
  onChange,
}: {
  questionNumber: string;
  choices: string[];
  onChange: (value: { type: "mark_sheet"; selected: string }) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (choice: string) => {
    setSelected(choice);
    onChange({ type: "mark_sheet", selected: choice });
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">
        {questionNumber}
      </Label>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => handleSelect(choice)}
            className={cn(
              "flex h-10 min-w-10 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-all",
              selected === choice
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}
