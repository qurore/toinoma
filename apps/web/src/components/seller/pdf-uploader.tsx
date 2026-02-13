"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { updateProblemPdfUrl } from "@/app/(seller)/sell/actions";

export function PdfUploader({
  problemSetId,
  sellerId,
  type,
  currentUrl,
}: {
  problemSetId: string;
  sellerId: string;
  type: "problem" | "solution";
  currentUrl: string | null;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [url, setUrl] = useState<string | null>(currentUrl);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const label = type === "problem" ? "問題PDF" : "解答PDF";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("PDFファイルのみアップロードできます");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("ファイルサイズは50MB以下にしてください");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const path = `${sellerId}/${problemSetId}/${type}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("problem-pdfs")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });

      if (uploadError) {
        setError(`アップロードに失敗しました: ${uploadError.message}`);
        return;
      }

      const { data } = supabase.storage
        .from("problem-pdfs")
        .getPublicUrl(path);

      const result = await updateProblemPdfUrl(
        problemSetId,
        data.publicUrl,
        type
      );

      if (result?.error) {
        setError(result.error);
        return;
      }

      setUrl(data.publicUrl);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleUpload}
          className="hidden"
          aria-label={`${label}をアップロード`}
        />

        {url ? (
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">アップロード済み</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                  表示
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="mr-1 h-3.5 w-3.5" />
                )}
                差し替え
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-8",
              "transition-colors hover:border-primary/50 hover:bg-muted/50",
              isUploading && "pointer-events-none opacity-50"
            )}
          >
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="text-center">
              <p className="text-sm font-medium">
                クリックして{label}をアップロード
              </p>
              <p className="text-xs text-muted-foreground">
                PDF形式 (最大50MB)
              </p>
            </div>
          </button>
        )}
      </CardContent>
    </Card>
  );
}
