"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { SUBJECTS, DIFFICULTIES, SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";

interface ProblemSetData {
  title: string;
  description: string | null;
  subject: Subject;
  university: string | null;
  difficulty: Difficulty;
  price: number;
}

export function ProblemSetForm({
  initialData,
  onSubmit,
  submitLabel = "保存",
}: {
  initialData?: ProblemSetData;
  onSubmit: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  submitLabel?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await onSubmit(formData);
      if (result?.error) {
        setError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form action={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>問題セット情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">タイトル *</Label>
            <Input
              id="title"
              name="title"
              required
              defaultValue={initialData?.title ?? ""}
              placeholder="例: 2024年度 東大数学 第1問〜第6問"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={initialData?.description ?? ""}
              placeholder="問題セットの概要や対象レベルなど"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="subject">教科 *</Label>
              <Select name="subject" defaultValue={initialData?.subject}>
                <SelectTrigger>
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
              <Label htmlFor="difficulty">難易度 *</Label>
              <Select name="difficulty" defaultValue={initialData?.difficulty}>
                <SelectTrigger>
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
              <Label htmlFor="university">大学名</Label>
              <Input
                id="university"
                name="university"
                defaultValue={initialData?.university ?? ""}
                placeholder="例: 東京大学"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">価格（円）</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                step="100"
                defaultValue={initialData?.price ?? 0}
                placeholder="0（無料）"
              />
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {submitLabel}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
