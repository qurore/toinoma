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

  const charCount = body.length;
  const isBodyValid = charCount === 0 || charCount >= 10;
  const isOverLimit = charCount > 500;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (rating === 0) {
      toast.error("評価を選択してください");
      return;
    }

    if (charCount > 0 && charCount < 10) {
      toast.error("レビューは10文字以上で入力してください");
      return;
    }

    if (isOverLimit) {
      toast.error("レビューは500文字以内で入力してください");
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

    toast.success(
      existingReview
        ? "レビューを更新しました"
        : "レビューを投稿しました"
    );
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
        {rating > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {rating === 1 && "不満"}
            {rating === 2 && "やや不満"}
            {rating === 3 && "普通"}
            {rating === 4 && "満足"}
            {rating === 5 && "とても満足"}
          </p>
        )}
      </div>

      <div>
        <Label
          htmlFor="review-body"
          className="mb-2 block text-sm font-medium"
        >
          レビュー（任意）
        </Label>
        <Textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="この問題セットについてのレビューを書いてください（10〜500文字）"
          maxLength={500}
          rows={3}
          aria-describedby="review-body-hint"
        />
        <div className="mt-1 flex items-center justify-between">
          <p
            id="review-body-hint"
            className="text-xs text-muted-foreground"
          >
            {charCount > 0 && charCount < 10
              ? "10文字以上で入力してください"
              : "10〜500文字"}
          </p>
          <p
            className={`text-xs ${
              isOverLimit
                ? "text-destructive"
                : charCount > 450
                  ? "text-amber-600"
                  : "text-muted-foreground"
            }`}
          >
            {charCount}/500
          </p>
        </div>
      </div>

      <Button
        type="submit"
        disabled={
          rating === 0 ||
          isPending ||
          !isBodyValid ||
          isOverLimit
        }
        size="sm"
      >
        {isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {existingReview ? "レビューを更新" : "レビューを投稿"}
      </Button>
    </form>
  );
}
