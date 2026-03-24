"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Send, CheckCircle2, Megaphone } from "lucide-react";
import { sendAnnouncementToPurchasers } from "./actions";

export function AnnouncementForm({
  problemSetId,
  purchaserCount,
}: {
  problemSetId: string;
  purchaserCount: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canSubmit =
    title.trim().length >= 3 && body.trim().length >= 10 && !isPending;

  function handleSubmit() {
    if (!canSubmit) return;

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await sendAnnouncementToPurchasers({
        problemSetId,
        title: title.trim(),
        body: body.trim(),
      });

      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setSuccessMessage(
          `${result.recipientCount}人の購入者にお知らせを送信しました`
        );
        setTitle("");
        setBody("");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-4 w-4" />
          お知らせ作成
        </CardTitle>
        <CardDescription>
          購入者の通知一覧にお知らせが表示されます
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMessage}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="announce-title">タイトル *</Label>
          <Input
            id="announce-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 解説動画を追加しました"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">
            3〜200文字
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="announce-body">本文 *</Label>
          <Textarea
            id="announce-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="お知らせの内容を入力してください"
            rows={5}
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground">
            10〜2000文字（現在 {body.length} 文字）
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            送信対象: {purchaserCount}人
          </p>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || purchaserCount === 0}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            送信する
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
