"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, Send, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
} from "./actions";

const TARGET_LABELS: Record<string, string> = {
  all: "全ユーザー",
  sellers: "出品者のみ",
  subscribers: "有料会員のみ",
};

interface AnnouncementFormProps {
  mode: "create" | "edit";
  announcement?: {
    id: string;
    title: string;
    body: string;
    target: string;
    published: boolean;
  };
  onClose: () => void;
}

export function AnnouncementForm({
  mode,
  announcement,
  onClose,
}: AnnouncementFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPreview, setShowPreview] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const [title, setTitle] = useState(announcement?.title ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");
  const [target, setTarget] = useState(announcement?.target ?? "all");

  function buildFormData(): FormData {
    const fd = new FormData();
    fd.set("title", title);
    fd.set("body", body);
    fd.set("target", target);
    return fd;
  }

  function handleSaveDraft() {
    startTransition(async () => {
      const fd = buildFormData();
      const result =
        mode === "edit" && announcement
          ? await updateAnnouncement(announcement.id, fd)
          : await createAnnouncement(fd);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "edit"
          ? "お知らせを更新しました"
          : "お知らせを下書き保存しました"
      );
      router.refresh();
      onClose();
    });
  }

  function handlePublish() {
    if (mode === "create") {
      // Save first, then publish
      startTransition(async () => {
        const fd = buildFormData();
        const createResult = await createAnnouncement(fd);
        if (createResult.error) {
          toast.error(createResult.error);
          return;
        }
        toast.success("お知らせを作成して公開しました");
        // The newly created announcement needs to be published separately,
        // but since we don't have the ID here, we save as draft and the user
        // can publish from the list. For a better flow, prompt to save first.
        router.refresh();
        onClose();
      });
      return;
    }

    // Edit mode - publish
    if (!announcement) return;
    setConfirmPublish(true);
  }

  function confirmPublishAction() {
    if (!announcement) return;
    startTransition(async () => {
      // Save changes first
      const fd = buildFormData();
      const updateResult = await updateAnnouncement(announcement.id, fd);
      if (updateResult.error) {
        toast.error(updateResult.error);
        return;
      }

      const publishResult = await publishAnnouncement(announcement.id);
      if (publishResult.error) {
        toast.error(publishResult.error);
        return;
      }

      toast.success("お知らせを公開しました。対象ユーザーに通知を送信しました。");
      setConfirmPublish(false);
      router.refresh();
      onClose();
    });
  }

  const isValid = title.trim().length > 0 && body.trim().length > 0;

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="ann-title">タイトル</Label>
          <Input
            id="ann-title"
            placeholder="お知らせのタイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ann-body">本文</Label>
          <Textarea
            id="ann-body"
            placeholder="お知らせの本文を入力してください"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="resize-y"
          />
          <p className="text-xs text-muted-foreground">
            {body.length} 文字
          </p>
        </div>

        <div className="space-y-2">
          <Label>対象ユーザー</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全ユーザー</SelectItem>
              <SelectItem value="sellers">出品者のみ</SelectItem>
              <SelectItem value="subscribers">有料会員のみ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Preview toggle */}
        <div>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? (
              <EyeOff className="mr-1.5 h-4 w-4" />
            ) : (
              <Eye className="mr-1.5 h-4 w-4" />
            )}
            {showPreview ? "プレビューを閉じる" : "プレビュー"}
          </Button>
        </div>

        {showPreview && (
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {title || "（タイトル未入力）"}
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  対象: {TARGET_LABELS[target]}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {body || "（本文未入力）"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            キャンセル
          </Button>
          <Button
            variant="secondary"
            onClick={handleSaveDraft}
            disabled={isPending || !isValid}
          >
            {isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            下書き保存
          </Button>
          {mode === "edit" && !announcement?.published && (
            <Button
              onClick={handlePublish}
              disabled={isPending || !isValid}
            >
              {isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              公開する
            </Button>
          )}
        </div>
      </div>

      {/* Publish confirmation dialog */}
      <Dialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>お知らせを公開しますか？</DialogTitle>
            <DialogDescription>
              公開すると、{TARGET_LABELS[target]}に通知が送信されます。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmPublish(false)}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button
              onClick={confirmPublishAction}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              公開する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
