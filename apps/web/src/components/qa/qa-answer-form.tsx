"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, SendHorizonal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createQaAnswer } from "@/app/problem/[id]/qa/actions";

interface QaAnswerFormProps {
  qaQuestionId: string;
  problemSetId: string;
  onCancel?: () => void;
}

export function QaAnswerForm({
  qaQuestionId,
  problemSetId,
  onCancel,
}: QaAnswerFormProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isPending, setIsPending] = useState(false);

  const charCount = body.length;
  const isValid = body.trim().length >= 5;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (body.trim().length < 5) {
      toast.error("回答は5文字以上で入力してください");
      return;
    }

    setIsPending(true);
    const result = await createQaAnswer({
      qaQuestionId,
      problemSetId,
      body: body.trim(),
    });

    if (result?.error) {
      toast.error(result.error);
      setIsPending(false);
      return;
    }

    toast.success("回答を投稿しました");
    setBody("");
    setIsPending(false);
    router.refresh();
    onCancel?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={`qa-answer-${qaQuestionId}`} className="sr-only">
          回答
        </Label>
        <Textarea
          id={`qa-answer-${qaQuestionId}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="回答を入力してください"
          maxLength={2000}
          rows={3}
          aria-describedby={`qa-answer-hint-${qaQuestionId}`}
        />
        <div className="flex justify-between">
          <p
            id={`qa-answer-hint-${qaQuestionId}`}
            className="text-xs text-muted-foreground"
          >
            5〜2000文字
          </p>
          <p
            className={`text-xs ${
              charCount > 1900
                ? "text-amber-600"
                : "text-muted-foreground"
            }`}
          >
            {charCount}/2000
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
          >
            キャンセル
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={isPending || !isValid}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <SendHorizonal className="mr-2 h-4 w-4" />
          )}
          回答を投稿
        </Button>
      </div>
    </form>
  );
}
