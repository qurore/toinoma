"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Loader2,
  Play,
  Trash2,
  ChevronUp,
  ChevronDown,
  Film,
  X,
  Pencil,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  uploadVideo,
  removeVideo,
  reorderVideos,
  updateVideoTitle,
} from "@/app/(seller)/seller/pool/[qid]/edit/actions";

// ─── Types ────────────────────────────────────────────────────────────

interface VideoMeta {
  url: string;
  path: string;
  title: string;
  size_bytes: number;
  mime_type: string;
  uploaded_at: string;
}

interface VideoUploaderProps {
  questionId: string;
  initialVideos: VideoMeta[];
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const MAX_VIDEOS = 3;
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

// ─── Component ────────────────────────────────────────────────────────

export function VideoUploader({ questionId, initialVideos }: VideoUploaderProps) {
  const [videos, setVideos] = useState<VideoMeta[]>(initialVideos);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [editingTitleIndex, setEditingTitleIndex] = useState<number | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Client-side validation
      const validTypes = ["video/mp4", "video/webm"];
      if (!validTypes.includes(file.type)) {
        toast.error("mp4またはwebm形式のみ対応しています");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error("ファイルサイズは500MB以下にしてください");
        return;
      }

      if (videos.length >= MAX_VIDEOS) {
        toast.error("動画は最大3つまでアップロードできます");
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      // Simulate progress for large files (server action doesn't support progress natively)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) return prev;
          // Logarithmic growth: fast start, slows near 90%
          const increment = Math.max(1, (90 - prev) * 0.1);
          return Math.min(90, prev + increment);
        });
      }, 500);

      try {
        const formData = new FormData();
        formData.set("video", file);
        formData.set("title", "解説動画");

        const result = await uploadVideo(questionId, formData);

        clearInterval(progressInterval);

        if (result.error) {
          toast.error(result.error);
          setUploadProgress(0);
        } else if (result.video) {
          setUploadProgress(100);
          setVideos((prev) => [...prev, result.video!]);
          toast.success("動画をアップロードしました");
          // Reset progress after brief display
          setTimeout(() => setUploadProgress(0), 1000);
        }
      } catch {
        clearInterval(progressInterval);
        toast.error("アップロード中にエラーが発生しました");
        setUploadProgress(0);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [questionId, videos.length]
  );

  const handleRemove = useCallback(
    async (index: number) => {
      const result = await removeVideo(questionId, index);
      if (result.error) {
        toast.error(result.error);
      } else {
        setVideos((prev) => prev.filter((_, i) => i !== index));
        toast.success("動画を削除しました");
      }
      setDeleteConfirmIndex(null);
    },
    [questionId]
  );

  const handleMove = useCallback(
    async (index: number, direction: "up" | "down") => {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= videos.length) return;

      const newOrder = Array.from({ length: videos.length }, (_, i) => i);
      [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];

      // Optimistic update
      const reordered = newOrder.map((idx) => videos[idx]);
      setVideos(reordered);

      const result = await reorderVideos(questionId, newOrder);
      if (result.error) {
        // Revert on failure
        setVideos(videos);
        toast.error(result.error);
      }
    },
    [questionId, videos]
  );

  const handleTitleSave = useCallback(
    async (index: number) => {
      const result = await updateVideoTitle(questionId, index, editingTitleValue);
      if (result.error) {
        toast.error(result.error);
      } else {
        setVideos((prev) =>
          prev.map((v, i) =>
            i === index ? { ...v, title: editingTitleValue.trim() || "解説動画" } : v
          )
        );
      }
      setEditingTitleIndex(null);
      setEditingTitleValue("");
    },
    [questionId, editingTitleValue]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Film className="h-4 w-4" />
          解説動画
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {videos.length}/{MAX_VIDEOS}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Video list */}
        {videos.map((video, index) => (
          <div
            key={`${video.path}-${index}`}
            className="flex items-center gap-3 rounded-lg border border-border p-3"
          >
            {/* Thumbnail / play button */}
            <button
              type="button"
              onClick={() => setPreviewVideoUrl(video.url)}
              className="flex h-14 w-20 shrink-0 items-center justify-center rounded-md bg-muted transition-colors hover:bg-muted/80"
              aria-label={`${video.title}を再生`}
            >
              <Play className="h-6 w-6 text-foreground/60" />
            </button>

            {/* Info */}
            <div className="min-w-0 flex-1">
              {editingTitleIndex === index ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editingTitleValue}
                    onChange={(e) => setEditingTitleValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleTitleSave(index);
                      }
                      if (e.key === "Escape") {
                        setEditingTitleIndex(null);
                      }
                    }}
                    className="h-7 text-sm"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => handleTitleSave(index)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTitleIndex(index);
                    setEditingTitleValue(video.title);
                  }}
                  className="group flex items-center gap-1 text-sm font-medium"
                >
                  <span className="truncate">{video.title}</span>
                  <Pencil className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
                </button>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatFileSize(video.size_bytes)}
                {" · "}
                {video.mime_type === "video/webm" ? "WebM" : "MP4"}
              </p>
            </div>

            {/* Reorder + delete controls */}
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={index === 0}
                onClick={() => handleMove(index, "up")}
                aria-label="上に移動"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={index === videos.length - 1}
                onClick={() => handleMove(index, "down")}
                aria-label="下に移動"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => setDeleteConfirmIndex(index)}
                aria-label="動画を削除"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {/* Upload progress */}
        {isUploading && (
          <div className="space-y-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>アップロード中...</span>
              <span className="ml-auto font-medium">{Math.round(uploadProgress)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="解説動画をアップロード"
        />

        {videos.length < MAX_VIDEOS ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6",
              "transition-colors hover:border-primary/50 hover:bg-muted/50",
              isUploading && "pointer-events-none opacity-50"
            )}
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">
                クリックして動画をアップロード
              </p>
              <p className="text-xs text-muted-foreground">
                MP4 / WebM (最大500MB)
              </p>
            </div>
          </button>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            動画の上限（3本）に達しています
          </p>
        )}

        {/* Preview dialog */}
        <Dialog
          open={!!previewVideoUrl}
          onOpenChange={(open) => {
            if (!open) setPreviewVideoUrl(null);
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>動画プレビュー</DialogTitle>
              <DialogDescription>
                解説動画のプレビューです
              </DialogDescription>
            </DialogHeader>
            {previewVideoUrl && (
              <video
                src={previewVideoUrl}
                controls
                autoPlay
                className="w-full rounded-md"
              >
                <track kind="captions" />
              </video>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        <Dialog
          open={deleteConfirmIndex !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteConfirmIndex(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>動画を削除</DialogTitle>
              <DialogDescription>
                この動画を削除してもよろしいですか？この操作は取り消せません。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteConfirmIndex(null)}
              >
                <X className="mr-1 h-4 w-4" />
                キャンセル
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (deleteConfirmIndex !== null) {
                    handleRemove(deleteConfirmIndex);
                  }
                }}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                削除する
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
