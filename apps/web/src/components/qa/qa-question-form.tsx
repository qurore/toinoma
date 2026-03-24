"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  MessageCirclePlus,
  SendHorizonal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createQaQuestion } from "@/app/problem/[id]/qa/actions";
import { createClient } from "@/lib/supabase/client";

interface QaQuestionFormProps {
  problemSetId: string;
}

export function QaQuestionForm({ problemSetId }: QaQuestionFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  function handleReset() {
    setTitle("");
    setBody("");
    setIsOpen(false);
    setIsPreview(false);
    setImageFile(null);
    setImagePreviewUrl(null);
  }

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type and size
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ];
      if (!validTypes.includes(file.type)) {
        toast.error("JPEG、PNG、WebP、GIF形式の画像を選択してください");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("画像サイズは5MB以下にしてください");
        return;
      }

      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    },
    []
  );

  function handleRemoveImage() {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImageFile(null);
    setImagePreviewUrl(null);
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return null;

    setIsUploading(true);
    try {
      const supabase = createClient();
      const ext = imageFile.name.split(".").pop() ?? "jpg";
      const path = `qa/${problemSetId}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("qa-images")
        .upload(path, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        toast.error("画像のアップロードに失敗しました");
        return null;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("qa-images").getPublicUrl(path);
      return publicUrl;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (title.trim().length < 5) {
      toast.error("タイトルは5文字以上で入力してください");
      return;
    }
    if (body.trim().length < 10) {
      toast.error("質問内容は10文字以上で入力してください");
      return;
    }

    setIsPending(true);

    // Upload image if present
    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await uploadImage();
      // If upload failed, the toast was already shown; allow retry
      if (imageFile && !imageUrl) {
        setIsPending(false);
        return;
      }
    }

    const result = await createQaQuestion({
      problemSetId,
      title: title.trim(),
      body: body.trim(),
    });

    if (result?.error) {
      toast.error(result.error);
      setIsPending(false);
      return;
    }

    toast.success("質問を投稿しました");
    handleReset();
    setIsPending(false);
    router.refresh();
  }

  // Render a simple markdown-like preview (bold, code, line breaks)
  function renderPreview(text: string) {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const formatted = escaped
      // Bold: **text**
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // Inline code: `code`
      .replace(/`(.+?)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-xs">$1</code>')
      // Line breaks
      .replace(/\n/g, "<br />");

    return formatted;
  }

  // Collapsed state -- just a button to open the form
  if (!isOpen) {
    return (
      <Button
        variant="outline"
        className="w-full justify-start gap-2 text-muted-foreground"
        onClick={() => setIsOpen(true)}
      >
        <MessageCirclePlus className="h-4 w-4" />
        質問を投稿する
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-border p-4"
    >
      <div className="space-y-2">
        <Label htmlFor="qa-title" className="text-sm font-medium">
          タイトル
        </Label>
        <Input
          id="qa-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 問3(2)の解法について"
          maxLength={200}
          autoFocus
          aria-describedby="qa-title-hint"
        />
        <div className="flex justify-between">
          <p id="qa-title-hint" className="text-xs text-muted-foreground">
            5〜200文字
          </p>
          <p className="text-xs text-muted-foreground">{title.length}/200</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="qa-body" className="text-sm font-medium">
            質問内容
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => setIsPreview(!isPreview)}
          >
            {isPreview ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
            {isPreview ? "編集に戻る" : "プレビュー"}
          </Button>
        </div>

        {isPreview ? (
          <div
            className="min-h-[96px] rounded-md border border-input bg-muted/30 p-3 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderPreview(body) }}
          />
        ) : (
          <Textarea
            id="qa-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="質問の詳細を記入してください。どの部分がわからないか具体的に書くと回答が得られやすくなります。&#10;&#10;**太字** `コード` に対応しています。"
            maxLength={2000}
            rows={4}
            aria-describedby="qa-body-hint"
          />
        )}

        <div className="flex justify-between">
          <p id="qa-body-hint" className="text-xs text-muted-foreground">
            10〜2000文字（**太字**、`コード` 記法対応）
          </p>
          <p className="text-xs text-muted-foreground">{body.length}/2000</p>
        </div>
      </div>

      {/* Image upload */}
      <div className="space-y-2">
        {imagePreviewUrl ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreviewUrl}
              alt="添付画像プレビュー"
              className="max-h-40 rounded-md border border-border object-contain"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90"
              aria-label="画像を削除"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <label
            htmlFor="qa-image-upload"
            className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ImagePlus className="h-4 w-4" />
            画像を添付（任意、5MB以下）
            <input
              id="qa-image-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageSelect}
              className="sr-only"
            />
          </label>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={isPending}
        >
          キャンセル
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isPending || isUploading}
        >
          {isPending || isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <SendHorizonal className="mr-2 h-4 w-4" />
          )}
          質問を投稿
        </Button>
      </div>
    </form>
  );
}
