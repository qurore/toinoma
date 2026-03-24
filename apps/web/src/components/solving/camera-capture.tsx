"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera,
  RotateCw,
  RotateCcw,
  Trash2,
  Check,
  Sun,
  Crop,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────
// MOB-005: Image crop/rotate for camera capture
// ──────────────────────────────────────────────

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  className?: string;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function CameraCapture({ onCapture, className }: CameraCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [showEditor, setShowEditor] = useState(false);
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
    setShowEditor(true);
  }

  function handleEditorConfirm(editedFile: File) {
    setShowEditor(false);
    onCapture(editedFile);
  }

  function handleEditorRetake() {
    setShowEditor(false);
    handleReset();
  }

  function handleReset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setCapturedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  // If editor is dismissed without confirming, show basic preview
  function handleEditorClose() {
    setShowEditor(false);
  }

  return (
    <div className={cn("space-y-3", className)}>
      {preview && !showEditor ? (
        <>
          {/* Preview (after editor was dismissed) */}
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
              variant="outline"
              size="sm"
              onClick={() => setShowEditor(true)}
            >
              <Crop className="mr-1.5 h-3.5 w-3.5" />
              編集
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (capturedFile) onCapture(capturedFile);
              }}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              この画像を使用
            </Button>
          </div>
        </>
      ) : !showEditor ? (
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
      ) : null}

      {/* Image editor modal */}
      {showEditor && preview && capturedFile && (
        <ImageEditorDialog
          imageUrl={preview}
          originalFile={capturedFile}
          onConfirm={handleEditorConfirm}
          onRetake={handleEditorRetake}
          onClose={handleEditorClose}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// ImageEditorDialog — Rotate, brightness, crop
// ──────────────────────────────────────────────

function ImageEditorDialog({
  imageUrl,
  originalFile,
  onConfirm,
  onRetake,
  onClose,
}: {
  imageUrl: string;
  originalFile: File;
  onConfirm: (file: File) => void;
  onRetake: () => void;
  onClose: () => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [cropActive, setCropActive] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [processing, setProcessing] = useState(false);

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const cropStartRef = useRef<{ x: number; y: number } | null>(null);

  const rotateLeft = () => setRotation((r) => (r - 90 + 360) % 360);
  const rotateRight = () => setRotation((r) => (r + 90) % 360);

  const resetCrop = () => {
    setCropArea(null);
    setCropActive(false);
  };

  // Crop interaction handlers
  const handleCropPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!cropActive) return;
      const rect = imageContainerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      cropStartRef.current = { x, y };
      setCropArea({ x, y, width: 0, height: 0 });

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [cropActive]
  );

  const handleCropPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!cropActive || !cropStartRef.current) return;
      const rect = imageContainerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const currentX = Math.max(
        0,
        Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)
      );
      const currentY = Math.max(
        0,
        Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)
      );

      const start = cropStartRef.current;
      setCropArea({
        x: Math.min(start.x, currentX),
        y: Math.min(start.y, currentY),
        width: Math.abs(currentX - start.x),
        height: Math.abs(currentY - start.y),
      });
    },
    [cropActive]
  );

  const handleCropPointerUp = useCallback(() => {
    cropStartRef.current = null;
    // If crop area is too small, remove it
    if (cropArea && (cropArea.width < 3 || cropArea.height < 3)) {
      setCropArea(null);
    }
  }, [cropArea]);

  // Apply transformations via Canvas API and produce the final file
  const handleConfirm = async () => {
    setProcessing(true);
    try {
      const file = await applyTransformations(
        imageUrl,
        rotation,
        brightness,
        cropArea
      );
      onConfirm(file);
    } catch {
      // Fall back to original file if canvas fails
      onConfirm(originalFile);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>画像を編集</DialogTitle>
        </DialogHeader>

        {/* Image preview with transforms */}
        <div
          ref={imageContainerRef}
          className="relative mx-auto max-h-[50vh] w-full overflow-hidden rounded-md border border-border bg-muted/30"
          onPointerDown={handleCropPointerDown}
          onPointerMove={handleCropPointerMove}
          onPointerUp={handleCropPointerUp}
          style={{ touchAction: cropActive ? "none" : "auto" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="編集中の画像"
            className="max-h-[50vh] w-full object-contain transition-transform duration-200"
            style={{
              transform: `rotate(${rotation}deg)`,
              filter: `brightness(${brightness}%)`,
            }}
            draggable={false}
          />

          {/* Crop overlay */}
          {cropActive && cropArea && cropArea.width > 0 && (
            <>
              {/* Darkened outer area */}
              <div
                className="pointer-events-none absolute inset-0 bg-black/50"
                style={{
                  clipPath: `polygon(
                    0% 0%, 100% 0%, 100% 100%, 0% 100%,
                    0% ${cropArea.y}%,
                    ${cropArea.x}% ${cropArea.y}%,
                    ${cropArea.x}% ${cropArea.y + cropArea.height}%,
                    ${cropArea.x + cropArea.width}% ${cropArea.y + cropArea.height}%,
                    ${cropArea.x + cropArea.width}% ${cropArea.y}%,
                    0% ${cropArea.y}%
                  )`,
                }}
              />
              {/* Crop border */}
              <div
                className="pointer-events-none absolute border-2 border-white shadow-sm"
                style={{
                  left: `${cropArea.x}%`,
                  top: `${cropArea.y}%`,
                  width: `${cropArea.width}%`,
                  height: `${cropArea.height}%`,
                }}
              >
                {/* Corner indicators */}
                <div className="absolute -left-1 -top-1 h-3 w-3 border-l-2 border-t-2 border-white" />
                <div className="absolute -right-1 -top-1 h-3 w-3 border-r-2 border-t-2 border-white" />
                <div className="absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 border-white" />
                <div className="absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 border-white" />
              </div>
            </>
          )}

          {/* Crop mode indicator */}
          {cropActive && !cropArea && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <p className="rounded-md bg-black/60 px-3 py-1.5 text-sm text-white">
                ドラッグして切り取り範囲を選択
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Rotation controls */}
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={rotateLeft}
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              左へ90°
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={rotateRight}
            >
              <RotateCw className="mr-1 h-3.5 w-3.5" />
              右へ90°
            </Button>
            <Button
              type="button"
              variant={cropActive ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (cropActive) {
                  resetCrop();
                } else {
                  setCropActive(true);
                }
              }}
            >
              {cropActive ? (
                <>
                  <X className="mr-1 h-3.5 w-3.5" />
                  切り取り解除
                </>
              ) : (
                <>
                  <Crop className="mr-1 h-3.5 w-3.5" />
                  切り取り
                </>
              )}
            </Button>
          </div>

          {/* Brightness slider */}
          <div className="flex items-center gap-3 px-2">
            <Sun className="h-4 w-4 shrink-0 text-muted-foreground" />
            <label className="sr-only" htmlFor="brightness-slider">
              明るさ
            </label>
            <input
              id="brightness-slider"
              type="range"
              min={50}
              max={200}
              step={5}
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
            <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">
              {brightness}%
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onRetake}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            撮り直す
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={processing}>
            {processing ? (
              <span className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            )}
            確定する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Canvas transformation helpers
// ──────────────────────────────────────────────

async function applyTransformations(
  imageUrl: string,
  rotation: number,
  brightness: number,
  cropArea: CropArea | null
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context unavailable");

        const isRotated90 = rotation === 90 || rotation === 270;

        // Determine source dimensions after rotation
        const srcW = isRotated90 ? img.height : img.width;
        const srcH = isRotated90 ? img.width : img.height;

        // Set canvas size — full image first, then crop
        canvas.width = srcW;
        canvas.height = srcH;

        // Apply rotation
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        // Apply brightness via compositing
        if (brightness !== 100) {
          ctx.globalCompositeOperation = "multiply";
          const brightnessValue = brightness / 100;
          if (brightnessValue > 1) {
            // For brightness > 100%, use screen blending with white
            ctx.globalCompositeOperation = "screen";
            const alpha = 1 - 1 / brightnessValue;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          } else {
            ctx.fillStyle = `rgba(0, 0, 0, ${1 - brightnessValue})`;
          }
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.globalCompositeOperation = "source-over";
        }

        // Apply crop
        if (cropArea && cropArea.width > 0 && cropArea.height > 0) {
          const cropX = Math.round((cropArea.x / 100) * canvas.width);
          const cropY = Math.round((cropArea.y / 100) * canvas.height);
          const cropW = Math.round((cropArea.width / 100) * canvas.width);
          const cropH = Math.round((cropArea.height / 100) * canvas.height);

          const croppedData = ctx.getImageData(cropX, cropY, cropW, cropH);
          canvas.width = cropW;
          canvas.height = cropH;
          ctx.putImageData(croppedData, 0, 0);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas toBlob failed"));
              return;
            }
            const file = new File([blob], "answer-image.jpg", {
              type: "image/jpeg",
            });
            resolve(file);
          },
          "image/jpeg",
          0.9
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error("Image load failed"));
    img.src = imageUrl;
  });
}
