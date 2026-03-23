"use client";

import { useState, useRef } from "react";
import { Camera, RotateCw, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  className?: string;
}

export function CameraCapture({ onCapture, className }: CameraCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) return; // 10MB max

    setCapturedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  function handleConfirm() {
    if (capturedFile) {
      onCapture(capturedFile);
    }
  }

  function handleReset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setCapturedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={cn("space-y-3", className)}>
      {preview ? (
        <>
          {/* Preview */}
          <div className="relative overflow-hidden rounded-md border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="撮影した解答"
              className="max-h-[400px] w-full object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              撮り直す
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              この画像を使用
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Capture button */}
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-border px-4 py-6 transition-colors hover:border-primary/30 hover:bg-muted/30">
            <Camera className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              タップして撮影
            </span>
            <span className="text-xs text-muted-foreground/60">
              JPEG / PNG (最大10MB)
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={handleFileChange}
              className="sr-only"
              aria-label="解答を撮影"
            />
          </label>
        </>
      )}
    </div>
  );
}
