"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SUBJECTS,
  DIFFICULTIES,
  SUBJECT_LABELS,
  DIFFICULTY_LABELS,
} from "@toinoma/shared/constants";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import type { Subject, Difficulty } from "@/types/database";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface SetMetadata {
  title: string;
  description: string;
  subject: Subject | "";
  difficulty: Difficulty | "";
  price: number;
  timeLimitMinutes: number | null;
  coverImageUrl: string;
  university: string;
}

interface SetMetadataFormProps {
  metadata: SetMetadata;
  onChange: (metadata: SetMetadata) => void;
  /** When provided, enables direct upload to Supabase Storage */
  problemSetId?: string;
  sellerId?: string;
}

export function SetMetadataForm({
  metadata,
  onChange,
  problemSetId,
  sellerId,
}: SetMetadataFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update(patch: Partial<SetMetadata>) {
    onChange({ ...metadata, ...patch });
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError("JPG、PNG、またはWebP形式の画像を選択してください");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setUploadError("画像サイズは5MB以下にしてください");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const storageSellerId = sellerId ?? "temp";
      const storagePsId = problemSetId ?? crypto.randomUUID();
      const path = `${storageSellerId}/${storagePsId}/cover.${ext}`;

      const { error: storageError } = await supabase.storage
        .from("problem-pdfs")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (storageError) {
        setUploadError(`アップロードに失敗しました: ${storageError.message}`);
        return;
      }

      const { data } = supabase.storage
        .from("problem-pdfs")
        .getPublicUrl(path);

      update({ coverImageUrl: data.publicUrl });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    update({ coverImageUrl: "" });
    setUploadError(null);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="set-title">タイトル *</Label>
        <Input
          id="set-title"
          value={metadata.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="例: 2024年度 東大数学 第1問〜第6問"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="set-description">説明</Label>
        <Textarea
          id="set-description"
          value={metadata.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={3}
          placeholder="問題セットの概要や対象レベルなど"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="set-subject">教科 *</Label>
          <Select
            value={metadata.subject}
            onValueChange={(val) => update({ subject: val as Subject })}
          >
            <SelectTrigger id="set-subject">
              <SelectValue placeholder="教科を選択" />
            </SelectTrigger>
            <SelectContent>
              {SUBJECTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {SUBJECT_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="set-difficulty">難易度 *</Label>
          <Select
            value={metadata.difficulty}
            onValueChange={(val) => update({ difficulty: val as Difficulty })}
          >
            <SelectTrigger id="set-difficulty">
              <SelectValue placeholder="難易度を選択" />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map((d) => (
                <SelectItem key={d} value={d}>
                  {DIFFICULTY_LABELS[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="set-university">大学名</Label>
          <Input
            id="set-university"
            value={metadata.university}
            onChange={(e) => update({ university: e.target.value })}
            placeholder="例: 東京大学"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="set-price">価格（円）</Label>
          <Input
            id="set-price"
            type="number"
            min="0"
            step="100"
            value={metadata.price}
            onChange={(e) =>
              update({ price: Math.max(0, parseInt(e.target.value, 10) || 0) })
            }
            placeholder="0（無料）"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="set-time-limit">制限時間（分）</Label>
        <Input
          id="set-time-limit"
          type="number"
          min="0"
          step="5"
          value={metadata.timeLimitMinutes ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            update({
              timeLimitMinutes: val ? parseInt(val, 10) || null : null,
            });
          }}
          placeholder="未設定"
        />
      </div>

      {/* Cover image upload */}
      <div className="space-y-2">
        <Label>カバー画像</Label>

        {uploadError && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {uploadError}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageUpload}
          className="hidden"
          aria-label="カバー画像をアップロード"
        />

        {metadata.coverImageUrl ? (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={metadata.coverImageUrl}
                alt="カバー画像プレビュー"
                className="h-48 w-full object-cover"
              />
              <div className="absolute right-2 top-2 flex gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              JPG / PNG / WebP（最大5MB）
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-6",
              "transition-colors hover:border-primary/50 hover:bg-muted/50",
              isUploading && "pointer-events-none opacity-50"
            )}
          >
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="text-center">
              <p className="text-sm font-medium">
                クリックしてカバー画像をアップロード
              </p>
              <p className="text-xs text-muted-foreground">
                JPG / PNG / WebP（最大5MB）
              </p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
