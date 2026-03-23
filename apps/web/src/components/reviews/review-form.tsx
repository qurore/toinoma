"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "./star-rating";
import { submitReview } from "@/app/problem/[id]/actions";

interface ReviewFormProps {
  problemSetId: string;
  existingReview?: {
    id: string;
    rating: number;
    body: string | null;
  };
}

export function ReviewForm({ problemSetId, existingReview }: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [body, setBody] = useState(existingReview?.body ?? "");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (rating === 0) {
      toast.error("評価を選択してください");
      return;
    }

    if (body.length > 0 && body.length < 10) {
      toast.error("レビューは10文字以上で入力してください");
      return;
    }

    setIsPending(true);
    const result = await submitReview({
      problemSetId,
      rating,
      body: body || null,
    });

    if (result?.error) {
      toast.error(result.error);
      setIsPending(false);
      return;
    }

    toast.success(existingReview ? "レビューを更新しました" : "レビューを投稿しました");
    setIsPending(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="mb-2 block text-sm font-medium">評価</Label>
        <StarRating
          rating={rating}
          size="lg"
          interactive
          onChange={setRating}
        />
      </div>

      <div>
        <Label htmlFor="review-body" className="mb-2 block text-sm font-medium">
          レビュー（任意）
        </Label>
        <Textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="この問題セットについてのレビューを書いてください（10〜500文字）"
          maxLength={500}
          rows={3}
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {body.length}/500
        </p>
      </div>

      <Button type="submit" disabled={rating === 0 || isPending} size="sm">
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {existingReview ? "レビューを更新" : "レビューを投稿"}
      </Button>
    </form>
  );
}
