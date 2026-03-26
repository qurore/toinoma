"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ExtractedQuestionCard } from "@/components/seller/extracted-question-card";
import { confirmImport } from "@/app/(seller)/seller/pool/import/actions";
import type { ExtractedQuestion } from "@/app/api/pdf-import/route";

type QuestionWithAccepted = ExtractedQuestion & { accepted: boolean };

const STEPS = [
  { label: "PDFアップロード" },
  { label: "AI解析中" },
  { label: "問題の確認" },
  { label: "インポート完了" },
] as const;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export function PdfImportWizard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [questions, setQuestions] = useState<QuestionWithAccepted[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [importResult, setImportResult] = useState<{
    inserted: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Simulated progress during AI extraction
  useEffect(() => {
    if (currentStep !== 1) {
      setProcessingProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProcessingProgress((prev) => {
        // Asymptotic progress: gets slower as it approaches 90%
        if (prev >= 90) return prev;
        const increment = Math.max(0.5, (90 - prev) * 0.05);
        return Math.min(90, prev + increment);
      });
    }, 500);

    return () => clearInterval(interval);
  }, [currentStep]);

  // File validation
  const validateFile = useCallback((f: File): string | null => {
    if (f.type !== "application/pdf") {
      return "PDFファイルのみアップロードできます";
    }
    if (f.size > MAX_FILE_SIZE) {
      return "ファイルサイズは50MB以下にしてください";
    }
    return null;
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(
    (f: File) => {
      const validationError = validateFile(f);
      if (validationError) {
        toast.error(validationError);
        return;
      }
      setFile(f);
      setError(null);
    },
    [validateFile]
  );

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) {
        handleFileSelect(selected);
      }
    },
    [handleFileSelect]
  );

  // Start AI extraction
  const handleStartExtraction = useCallback(async () => {
    if (!file) return;

    setCurrentStep(1);
    setError(null);
    setProcessingProgress(0);
    setProcessingMessage("PDFをアップロードしています...");

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      setProcessingMessage("AIが問題を解析しています...");

      const response = await fetch("/api/pdf-import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ?? `Extraction failed with status ${response.status}`
        );
      }

      // Jump progress to 100% on success
      setProcessingProgress(100);

      const data = await response.json();

      if (!data.questions || data.questions.length === 0) {
        setError(
          "PDFから問題を抽出できませんでした。問題が含まれているPDFかご確認ください。"
        );
        setCurrentStep(0);
        return;
      }

      // Mark all questions as accepted by default
      const withAccepted: QuestionWithAccepted[] = data.questions.map(
        (q: ExtractedQuestion) => ({
          ...q,
          accepted: true,
        })
      );

      setQuestions(withAccepted);
      setCurrentStep(2);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "不明なエラーが発生しました";
      setError(message);
      toast.error("AI解析に失敗しました");
      setCurrentStep(0);
    }
  }, [file]);

  // Update a question
  const handleUpdateQuestion = useCallback(
    (tempId: string, updates: Partial<QuestionWithAccepted>) => {
      setQuestions((prev) =>
        prev.map((q) => (q.tempId === tempId ? { ...q, ...updates } : q))
      );
    },
    []
  );

  // Toggle all accept/reject
  const handleToggleAll = useCallback((accepted: boolean) => {
    setQuestions((prev) => prev.map((q) => ({ ...q, accepted })));
  }, []);

  // Confirm import
  const handleConfirmImport = useCallback(async () => {
    setIsConfirming(true);
    setError(null);

    try {
      const result = await confirmImport(questions);

      if (result.error) {
        toast.error(result.error);
        setError(result.error);
        return;
      }

      setImportResult({ inserted: result.inserted });
      setCurrentStep(3);
      toast.success(`${result.inserted}問をインポートしました`);
    } catch {
      toast.error("インポートに失敗しました");
      setError("インポート処理中にエラーが発生しました");
    } finally {
      setIsConfirming(false);
    }
  }, [questions]);

  // Reset entire wizard to step 1
  const resetWizard = useCallback(() => {
    setCurrentStep(0);
    setFile(null);
    setQuestions([]);
    setImportResult(null);
    setError(null);
    setProcessingProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const acceptedCount = questions.filter((q) => q.accepted).length;
  const totalCount = questions.length;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <nav aria-label="インポートの進捗">
        <ol className="flex items-center gap-2">
          {STEPS.map((step, i) => {
            const isActive = i === currentStep;
            const isComplete = i < currentStep;

            return (
              <li key={i} className="flex items-center gap-2">
                {i > 0 && (
                  <div
                    className={cn(
                      "hidden h-px w-8 sm:block",
                      isComplete ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive && "bg-primary text-primary-foreground",
                    isComplete && "bg-primary/10 text-primary",
                    !isActive &&
                      !isComplete &&
                      "bg-muted text-muted-foreground"
                  )}
                >
                  <span className="flex h-4 w-4 items-center justify-center text-[10px]">
                    {isComplete ? "✓" : i + 1}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Error display */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ================================================================
          Step 1: File upload (drag and drop)
      ================================================================ */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">PDFファイルを選択</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleInputChange}
              className="hidden"
              aria-label="PDFファイルを選択"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12",
                "transition-colors",
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <div className="text-center">
                <p className="text-sm font-medium">
                  クリックまたはドラッグ&ドロップでPDFをアップロード
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PDF形式 (最大50MB)
                </p>
              </div>
            </button>

            {/* Selected file preview */}
            {file && (
              <div className="mt-4 flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    削除
                  </Button>
                  <Button size="sm" onClick={handleStartExtraction}>
                    AI解析を開始
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================
          Step 2: AI extraction progress with progress bar
      ================================================================ */}
      {currentStep === 1 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-6 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-lg font-semibold">
                AIが問題を解析しています
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {processingMessage}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                通常30秒〜1分程度かかります
              </p>
            </div>

            {/* Real progress bar */}
            <div className="w-full max-w-xs space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {Math.round(processingProgress)}%
              </p>
            </div>

            {/* Processing phases */}
            <div className="flex w-full max-w-sm flex-col gap-2">
              <ProcessingPhaseRow
                label="PDFのアップロード"
                done={processingProgress > 10}
                active={processingProgress <= 10}
              />
              <ProcessingPhaseRow
                label="テキスト抽出"
                done={processingProgress > 30}
                active={
                  processingProgress > 10 && processingProgress <= 30
                }
              />
              <ProcessingPhaseRow
                label="問題構造の解析"
                done={processingProgress > 60}
                active={
                  processingProgress > 30 && processingProgress <= 60
                }
              />
              <ProcessingPhaseRow
                label="ルーブリック生成"
                done={processingProgress > 85}
                active={
                  processingProgress > 60 && processingProgress <= 85
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================
          Step 3: Review extracted questions
      ================================================================ */}
      {currentStep === 2 && (
        <>
          {/* Summary bar */}
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm text-muted-foreground">
                {totalCount}問を抽出 · {acceptedCount}問を選択中
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleAll(true)}
                >
                  すべて選択
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleAll(false)}
                >
                  すべて解除
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Question list with editing capability */}
          <div className="space-y-3">
            {questions.map((q, i) => (
              <ExtractedQuestionCard
                key={q.tempId}
                question={q}
                index={i}
                onUpdate={handleUpdateQuestion}
              />
            ))}
          </div>

          {/* Navigation */}
          <Separator />
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={resetWizard}>
              やり直す
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={acceptedCount === 0 || isConfirming}
            >
              {isConfirming && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              {acceptedCount}問をインポート
            </Button>
          </div>
        </>
      )}

      {/* ================================================================
          Step 4: Success confirmation
      ================================================================ */}
      {currentStep === 3 && importResult && (
        <Card>
          <CardContent className="flex flex-col items-center gap-6 py-16">
            <div className="text-center">
              <p className="text-lg font-semibold">
                インポートが完了しました
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {importResult.inserted}問が問題プールに追加されました
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={resetWizard}>
                別のPDFをインポート
              </Button>
              <Button onClick={() => router.push("/seller/pool")}>
                問題プールを表示
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ========================================================================
// Processing phase row indicator
// ========================================================================
function ProcessingPhaseRow({
  label,
  done,
  active,
}: {
  label: string;
  done: boolean;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center">
        {done ? (
          <span className="text-xs text-green-600">✓</span>
        ) : active ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        )}
      </div>
      <span
        className={cn(
          "text-sm",
          done && "text-green-700",
          active && "font-medium text-foreground",
          !done && !active && "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
}
