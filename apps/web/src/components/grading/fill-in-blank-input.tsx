"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FillInBlankInput({
  questionNumber,
  onChange,
}: {
  questionNumber: string;
  onChange: (value: { type: "fill_in_blank"; text: string }) => void;
}) {
  const [text, setText] = useState("");

  const handleChange = (value: string) => {
    setText(value);
    onChange({ type: "fill_in_blank", text: value });
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {questionNumber}
      </Label>
      <Input
        placeholder="解答を入力..."
        value={text}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
}
