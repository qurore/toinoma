/**
 * ParseJobUploader — upload a PDF/DOCX and watch it parse to AST.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Subject, Database } from "@toinoma/shared/types";
import type { StructuredContent } from "@toinoma/shared/schemas";

type ParseJobRow = Database["public"]["Tables"]["parse_jobs"]["Row"];

interface Props {
  problemSetId?: string;
  subject?: Subject;
  /** Called when a parse job completes successfully. */
  onComplete?: (ast: StructuredContent, jobId: string) => void;
  /** Called when a parse job fails. */
  onFail?: (message: string, jobId: string) => void;
  /** Existing inflight job to resume polling (e.g., page reloaded mid-parse). */
  initialJobId?: string;
}

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 200; // ~5 minutes

export function ParseJobUploader({
  problemSetId,
  subject,
  onComplete,
  onFail,
  initialJobId,
}: Props) {
  const [job, setJob] = useState<ParseJobRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | undefined>(initialJobId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollAttempts = useRef(0);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      pollAttempts.current = 0;
      try {
        const fd = new FormData();
        fd.append("file", file);
        if (problemSetId) fd.append("problemSetId", problemSetId);
        if (subject) fd.append("subject", subject);
        const res = await fetch("/api/parse-jobs", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? `アップロードに失敗しました (${res.status})`);
        }
        const j = (await res.json()) as { jobId: string; job: ParseJobRow };
        setJobId(j.jobId);
        setJob(j.job);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setUploading(false);
      }
    },
    [problemSetId, subject],
  );

  // Poll status
  useEffect(() => {
    if (!jobId) return;
    if (job?.status === "succeeded" || job?.status === "failed") return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (cancelled) return;
      pollAttempts.current += 1;
      if (pollAttempts.current > MAX_POLL_ATTEMPTS) {
        setError("解析がタイムアウトしました");
        return;
      }
      try {
        const res = await fetch(`/api/parse-jobs/${jobId}`);
        if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`);
        const data = (await res.json()) as { job: ParseJobRow };
        if (cancelled) return;
        setJob(data.job);
        if (data.job.status === "succeeded") {
          if (data.job.result_ast) {
            onComplete?.(
              data.job.result_ast as unknown as StructuredContent,
              data.job.id,
            );
          }
          return;
        }
        if (data.job.status === "failed") {
          onFail?.(data.job.error_message ?? "解析に失敗しました", data.job.id);
          return;
        }
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    timer = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, job?.status, onComplete, onFail]);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  const renderStatus = () => {
    if (uploading) return { icon: <Loader2 className="h-5 w-5 animate-spin" />, text: "アップロード中…" };
    if (!job) return null;
    switch (job.status) {
      case "queued":
        return { icon: <Loader2 className="h-5 w-5 animate-spin text-amber-600" />, text: "解析待機中…" };
      case "running":
        return { icon: <Loader2 className="h-5 w-5 animate-spin text-blue-600" />, text: `解析中… (${job.progress}%)` };
      case "succeeded":
        return { icon: <CheckCircle2 className="h-5 w-5 text-primary" />, text: "解析完了" };
      case "failed":
        return { icon: <AlertCircle className="h-5 w-5 text-red-600" />, text: job.error_message ?? "解析に失敗しました" };
      case "cancelled":
        return { icon: <AlertCircle className="h-5 w-5 text-foreground/60" />, text: "キャンセルされました" };
    }
  };

  const status = renderStatus();

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="border-2 border-dashed rounded-lg p-6 text-center bg-foreground/[0.02]"
      >
        <Upload className="h-10 w-10 mx-auto mb-2 text-foreground/40" />
        <p className="text-sm mb-3">
          PDFまたはDOCXファイルをここにドロップするか、ボタンから選択してください
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || job?.status === "running" || job?.status === "queued"}
        >
          <Upload className="h-4 w-4 me-2" />
          ファイルを選択
        </Button>
      </div>

      {status && (
        <div className="flex items-center gap-2 p-3 border rounded bg-card">
          {status.icon}
          <span className="text-sm">{status.text}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 border rounded bg-red-50 text-red-800 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
