"use client";

import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Type, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

type InputMode = "text" | "image";

export function EssayAnswerInput({
  questionNumber,
  onChange,
}: {
  questionNumber: string;
  onChange: (value: { type: "essay"; text?: string; imageUrl?: string }) => void;
}) {
  const [mode, setMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (value: string) => {
    setText(value);
    onChange({ type: "essay", text: value });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      onChange({ type: "essay", imageUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onChange({ type: "essay" });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {questionNumber}
        </Label>
        <div className="flex gap-1">
          <Button
            type="button"
            variant={mode === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("text")}
          >
            <Type className="mr-1 h-3.5 w-3.5" />
            テキスト
          </Button>
          <Button
            type="button"
            variant={mode === "image" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("image")}
          >
            <Camera className="mr-1 h-3.5 w-3.5" />
            画像
          </Button>
        </div>
      </div>

      {mode === "text" ? (
        <Textarea
          placeholder="解答を入力してください..."
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={6}
          className="resize-y"
        />
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageSelect}
            className="hidden"
            aria-label="解答画像をアップロード"
          />

          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="解答画像プレビュー"
                className="max-h-80 w-full rounded-lg border border-border object-contain"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute right-2 top-2"
                onClick={clearImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-8",
                "transition-colors hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  クリックして画像をアップロード
                </p>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, WebP (最大10MB)
                </p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Expose file for parent to upload */}
      {imageFile && (
        <input type="hidden" name={`file-${questionNumber}`} value="" />
      )}
    </div>
  );
}

// Expose the file getter for upload
EssayAnswerInput.displayName = "EssayAnswerInput";
