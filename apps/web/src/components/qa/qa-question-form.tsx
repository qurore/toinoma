"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCirclePlus, SendHorizonal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createQaQuestion } from "@/app/problem/[id]/qa/actions";

interface QaQuestionFormProps {
  problemSetId: string;
}

export function QaQuestionForm({ problemSetId }: QaQuestionFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPending, setIsPending] = useState(false);

  function handleReset() {
    setTitle("");
    setBody("");
    setIsOpen(false);
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

  // Collapsed state — just a button to open the form
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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
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
          <p className="text-xs text-muted-foreground">
            {title.length}/200
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="qa-body" className="text-sm font-medium">
          質問内容
        </Label>
        <Textarea
          id="qa-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="質問の詳細を記入してください。どの部分がわからないか具体的に書くと回答が得られやすくなります。"
          maxLength={2000}
          rows={4}
          aria-describedby="qa-body-hint"
        />
        <div className="flex justify-between">
          <p id="qa-body-hint" className="text-xs text-muted-foreground">
            10〜2000文字
          </p>
          <p className="text-xs text-muted-foreground">
            {body.length}/2000
          </p>
        </div>
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
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? (
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
