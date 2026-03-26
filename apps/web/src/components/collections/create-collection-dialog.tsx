"use client";

import { useState, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createCollection } from "@/app/(dashboard)/dashboard/collections/actions";

export function CreateCollectionDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createCollection(formData);
      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }
      // createCollection redirects on success, but we also toast
      toast.success("コレクションを作成しました");
    } catch {
      setError("コレクションの作成に失敗しました");
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      // Reset form state when dialog closes
      setError(null);
      setIsSubmitting(false);
      formRef.current?.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          新規作成
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>コレクションを作成</DialogTitle>
          <DialogDescription>
            問題セットをまとめて管理・学習するためのコレクションを作成します。
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">コレクション名</Label>
            <Input
              id="name"
              name="name"
              placeholder="例: 数学の基礎問題"
              required
              maxLength={100}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              100文字以内で入力してください
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">説明（任意）</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="このコレクションの説明を入力"
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              作成
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
