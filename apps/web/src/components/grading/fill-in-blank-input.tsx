"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FillInBlankInputProps {
  questionNumber: string;
  onChange: (value: { type: "fill_in_blank"; text: string }) => void;
  initialValue?: { type: "fill_in_blank"; text: string };
}

export function FillInBlankInput({
  questionNumber,
  onChange,
  initialValue,
}: FillInBlankInputProps) {
  const [text, setText] = useState(initialValue?.text ?? "");

  const handleChange = useCallback(
    (value: string) => {
      setText(value);
      onChange({ type: "fill_in_blank", text: value });
    },
    [onChange]
  );

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{questionNumber}</Label>
      <Input
        placeholder="解答を入力..."
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        className={cn(
          "transition-colors",
          text.trim() && "border-success/50 focus-visible:ring-success/30"
        )}
      />
    </div>
  );
}
