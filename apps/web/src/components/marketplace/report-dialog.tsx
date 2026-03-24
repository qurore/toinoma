"use client";

import { useState, useCallback, type ReactElement } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { ReportReason } from "@/types/database";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type TargetType = "problem_set" | "review" | "qa_question";

interface ReportDialogProps {
  /** The type of content being reported */
  targetType: TargetType;
  /** UUID of the content being reported */
  targetId: string;
  /** Trigger element (e.g., a button) */
  trigger: ReactElement;
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const REASON_LABELS: Record<ReportReason, string> = {
  copyright: "著作権侵害",
  inappropriate: "不適切なコンテンツ",
  spam: "スパム・迷惑行為",
  other: "その他",
};

const TARGET_LABELS: Record<TargetType, string> = {
  problem_set: "問題セット",
  review: "レビュー",
  qa_question: "質問",
};

// Map target type to the report column
const TARGET_COLUMN: Record<TargetType, string> = {
  problem_set: "problem_set_id",
  review: "review_id",
  qa_question: "qa_question_id",
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function ReportDialog({
  targetType,
  targetId,
  trigger,
}: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | "">("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = useCallback(() => {
    setReason("");
    setDescription("");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!reason) {
      toast.error("報告理由を選択してください");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      // Verify authentication
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("報告するにはログインが必要です");
        return;
      }

      // Check for duplicate report from this user
      const { data: existing } = await supabase
        .from("reports")
        .select("id")
        .eq("reporter_id", user.id)
        .eq(TARGET_COLUMN[targetType], targetId)
        .limit(1);

      if (existing && existing.length > 0) {
        toast.info("この内容は既に報告済みです");
        setOpen(false);
        reset();
        return;
      }

      // Build insert payload
      const payload: Record<string, unknown> = {
        reporter_id: user.id,
        reason,
        description: description.trim() || null,
        [TARGET_COLUMN[targetType]]: targetId,
      };

      const { error } = await supabase
        .from("reports")
        .insert(payload as never);

      if (error) throw error;

      toast.success("報告を送信しました。ご協力ありがとうございます。");
      setOpen(false);
      reset();
    } catch {
      toast.error("報告の送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }, [reason, description, targetType, targetId, reset]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {TARGET_LABELS[targetType]}を報告
          </DialogTitle>
          <DialogDescription>
            不適切なコンテンツを報告してください。運営チームが確認します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Reason select */}
          <div className="space-y-1.5">
            <Label htmlFor="report-reason">
              報告理由 <span className="text-destructive">*</span>
            </Label>
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as ReportReason)}
            >
              <SelectTrigger id="report-reason">
                <SelectValue placeholder="理由を選択してください" />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(REASON_LABELS) as [ReportReason, string][]
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional description */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="report-description">詳細（任意）</Label>
              <span className="text-xs text-muted-foreground">
                {description.length}/500
              </span>
            </div>
            <Textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="具体的な内容があればご記入ください"
              maxLength={500}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting || !reason}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="mr-2 h-4 w-4" />
            )}
            報告する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
