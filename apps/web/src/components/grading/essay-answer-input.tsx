"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ImagePlus,
  X,
  Type,
  Camera,
  Grid3X3,
  AlignVerticalSpaceAround,
} from "lucide-react";
import { cn } from "@/lib/utils";

type InputMode = "text" | "image";

interface EssayAnswerInputProps {
  questionNumber: string;
  onChange: (value: { type: "essay"; text?: string; imageUrl?: string }) => void;
  initialValue?: { type: "essay"; text?: string; imageUrl?: string };
  /** Maximum character count limit */
  maxLength?: number;
  /** Subject hint — enables vertical text mode toggle for kokugo */
  subject?: string;
}

export function EssayAnswerInput({
  questionNumber,
  onChange,
  initialValue,
  maxLength,
  subject,
}: EssayAnswerInputProps) {
  const [mode, setMode] = useState<InputMode>(
    initialValue?.imageUrl ? "image" : "text"
  );
  const [text, setText] = useState(initialValue?.text ?? "");
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialValue?.imageUrl ?? null
  );
  const [genkoYoshi, setGenkoYoshi] = useState(false);
  const [verticalMode, setVerticalMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaContainerRef = useRef<HTMLDivElement>(null);

  // Detect mobile for camera capture button
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
          ("ontouchstart" in window && window.innerWidth < 768)
      );
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const charCount = text.length;
  const isOverLimit = maxLength ? charCount > maxLength : false;

  const handleTextChange = useCallback(
    (value: string) => {
      setText(value);
      onChange({ type: "essay", text: value });
    },
    [onChange]
  );

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setImagePreview(dataUrl);
        onChange({ type: "essay", imageUrl: dataUrl });
      };
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  const clearImage = useCallback(() => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    onChange({ type: "essay" });
  }, [onChange]);

  const handleCameraCapture = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  // Determine if vertical text toggle should be shown (for kokugo)
  const showVerticalToggle = subject === "japanese";

  return (
    <div className="space-y-3">
      {/* Header with question number and mode toggles */}
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">{questionNumber}</Label>
        <div className="flex items-center gap-1">
          {/* Genko-yoshi toggle (text mode only) */}
          {mode === "text" && (
            <Button
              type="button"
              variant={genkoYoshi ? "default" : "outline"}
              size="sm"
              onClick={() => setGenkoYoshi(!genkoYoshi)}
              title="原稿用紙モード"
              className="h-7 px-2"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Vertical text toggle (kokugo only, text mode only) */}
          {mode === "text" && showVerticalToggle && (
            <Button
              type="button"
              variant={verticalMode ? "default" : "outline"}
              size="sm"
              onClick={() => setVerticalMode(!verticalMode)}
              title="縦書きモード"
              className="h-7 px-2"
            >
              <AlignVerticalSpaceAround className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button
            type="button"
            variant={mode === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("text")}
            className="h-7"
          >
            <Type className="mr-1 h-3.5 w-3.5" />
            テキスト
          </Button>
          <Button
            type="button"
            variant={mode === "image" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("image")}
            className="h-7"
          >
            <Camera className="mr-1 h-3.5 w-3.5" />
            画像
          </Button>
        </div>
      </div>

      {mode === "text" ? (
        <div ref={textareaContainerRef} className="relative">
          {/* Genko-yoshi grid overlay */}
          {genkoYoshi && (
            <div
              className="pointer-events-none absolute inset-0 z-10"
              aria-hidden="true"
              style={{
                backgroundImage: `
                  linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                  linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
                `,
                backgroundSize: "1.5em 1.5em",
                borderRadius: "0.375rem",
              }}
            />
          )}

          <Textarea
            placeholder="解答を入力してください..."
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            rows={8}
            maxLength={maxLength}
            className={cn(
              "resize-y font-sans text-base leading-relaxed",
              genkoYoshi &&
                "font-serif tracking-widest leading-[1.5em] bg-transparent",
              verticalMode &&
                "writing-vertical-rl min-h-[300px] overflow-x-auto text-base",
              isOverLimit && "border-destructive focus-visible:ring-destructive"
            )}
            style={
              verticalMode
                ? { writingMode: "vertical-rl", textOrientation: "upright" }
                : undefined
            }
          />

          {/* Character count */}
          <div className="mt-1 flex items-center justify-end gap-2">
            <span
              className={cn(
                "text-xs tabular-nums",
                isOverLimit
                  ? "font-medium text-destructive"
                  : "text-muted-foreground"
              )}
            >
              {charCount.toLocaleString()}
              {maxLength ? ` / ${maxLength.toLocaleString()}` : ""} 文字
            </span>
          </div>
        </div>
      ) : (
        <div>
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageSelect}
            className="hidden"
            aria-label="解答画像をアップロード"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png"
            capture="environment"
            onChange={handleImageSelect}
            className="hidden"
            aria-label="カメラで撮影"
          />

          {imagePreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL from local file upload, not suitable for next/image */}
              <img
                src={imagePreview}
                alt="解答画像プレビュー"
                className="max-h-80 w-full rounded-lg border border-border object-contain bg-muted/30"
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
            <div className="space-y-2">
              {/* File upload area */}
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

              {/* Camera capture (mobile only) */}
              {isMobile && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleCameraCapture}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  カメラで撮影
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

EssayAnswerInput.displayName = "EssayAnswerInput";
