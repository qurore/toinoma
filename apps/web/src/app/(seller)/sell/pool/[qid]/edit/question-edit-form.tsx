"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  SUBJECTS,
  DIFFICULTIES,
  SUBJECT_LABELS,
  DIFFICULTY_LABELS,
} from "@toinoma/shared/constants";
import { VideoUploader } from "@/components/seller/video-uploader";
import {
  updateQuestion,
  deleteQuestion,
} from "./actions";

// ─── Types ────────────────────────────────────────────────────────────

interface VideoMeta {
  url: string;
  path: string;
  title: string;
  size_bytes: number;
  mime_type: string;
  uploaded_at: string;
}

interface RubricElement {
  description: string;
  points: number;
}

interface BlankEntry {
  id: string;
  label: string;
  acceptable_answers: string[];
  points: number;
}

interface OptionEntry {
  id: string;
  text: string;
}

interface QuestionData {
  id: string;
  question_type: string;
  question_text: string;
  subject: string;
  difficulty: string;
  points: number;
  model_answer: string | null;
  vertical_text: boolean;
  rubric: Record<string, unknown>;
  video_urls: VideoMeta[];
  estimated_minutes: number | null;
  topic_tags: string[];
}

interface QuestionEditFormProps {
  question: QuestionData;
}

// ─── Constants ────────────────────────────────────────────────────────

const QUESTION_TYPES = [
  { value: "essay", label: "記述式" },
  { value: "mark_sheet", label: "マーク式" },
  { value: "fill_in_blank", label: "穴埋め式" },
  { value: "multiple_choice", label: "選択式" },
] as const;

// ─── Rubric state extraction helpers ──────────────────────────────────

function extractEssayRubric(rubric: Record<string, unknown>): RubricElement[] {
  const elements = rubric.rubric_elements as RubricElement[] | undefined;
  if (Array.isArray(elements) && elements.length > 0) {
    return elements.map((e) => ({
      description: e.description ?? "",
      points: e.points ?? 5,
    }));
  }
  return [{ description: "", points: 5 }];
}

function extractMarkSheetChoices(rubric: Record<string, unknown>): string {
  const choices = rubric.choices as string[] | undefined;
  return Array.isArray(choices) ? choices.join(",") : "ア,イ,ウ,エ,オ";
}

function extractMarkSheetCorrect(rubric: Record<string, unknown>): string {
  const correct = rubric.correct_answers as string[] | undefined;
  return Array.isArray(correct) ? correct.join(",") : "";
}

function extractBlanks(rubric: Record<string, unknown>): BlankEntry[] {
  const blanks = rubric.blanks as BlankEntry[] | undefined;
  if (Array.isArray(blanks) && blanks.length > 0) {
    return blanks;
  }
  return [{ id: "blank-0", label: "(1)", acceptable_answers: [""], points: 2 }];
}

function extractOptions(rubric: Record<string, unknown>): OptionEntry[] {
  const options = rubric.options as OptionEntry[] | undefined;
  if (Array.isArray(options) && options.length > 0) {
    return options;
  }
  return Array.from({ length: 4 }, (_, i) => ({
    id: String.fromCharCode(97 + i),
    text: "",
  }));
}

function extractCorrectOptionIds(rubric: Record<string, unknown>): string {
  const ids = rubric.correct_option_ids as string[] | undefined;
  return Array.isArray(ids) ? ids.join(",") : "";
}

// ─── Component ────────────────────────────────────────────────────────

export function QuestionEditForm({ question }: QuestionEditFormProps) {
  const router = useRouter();

  // Form state
  const [questionType, setQuestionType] = useState(question.question_type);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Essay rubric elements
  const [rubricElements, setRubricElements] = useState<RubricElement[]>(
    question.question_type === "essay"
      ? extractEssayRubric(question.rubric)
      : [{ description: "", points: 5 }]
  );

  // Mark-sheet state
  const [choices, setChoices] = useState(
    question.question_type === "mark_sheet"
      ? extractMarkSheetChoices(question.rubric)
      : "ア,イ,ウ,エ,オ"
  );
  const [correctAnswers, setCorrectAnswers] = useState(
    question.question_type === "mark_sheet"
      ? extractMarkSheetCorrect(question.rubric)
      : ""
  );

  // Fill-in-blank state
  const [blanks, setBlanks] = useState<BlankEntry[]>(
    question.question_type === "fill_in_blank"
      ? extractBlanks(question.rubric)
      : [{ id: "blank-0", label: "(1)", acceptable_answers: [""], points: 2 }]
  );

  // Multiple choice state
  const [options, setOptions] = useState<OptionEntry[]>(
    question.question_type === "multiple_choice"
      ? extractOptions(question.rubric)
      : Array.from({ length: 4 }, (_, i) => ({
          id: String.fromCharCode(97 + i),
          text: "",
        }))
  );
  const [correctOptionIds, setCorrectOptionIds] = useState(
    question.question_type === "multiple_choice"
      ? extractCorrectOptionIds(question.rubric)
      : ""
  );

  const handleSubmit = useCallback(
    async (formData: FormData) => {
      setIsSubmitting(true);
      setError(null);

      // Attach type-specific rubric data
      if (questionType === "essay") {
        formData.set(
          "rubric_json",
          JSON.stringify({
            type: "essay",
            rubric_elements: rubricElements.filter((e) => e.description),
          })
        );
      } else if (questionType === "mark_sheet") {
        formData.set("choices", choices);
        formData.set("correct_answers", correctAnswers);
      } else if (questionType === "fill_in_blank") {
        const blankData = blanks
          .filter((b) => b.acceptable_answers.some((a) => a.trim()))
          .map((b, i) => ({
            id: `blank-${i}`,
            label: `(${i + 1})`,
            acceptable_answers: b.acceptable_answers,
            points: b.points,
          }));
        formData.set(
          "blanks_json",
          JSON.stringify({ type: "fill_in_blank", blanks: blankData })
        );
      } else if (questionType === "multiple_choice") {
        formData.set("options_json", JSON.stringify(options.filter((o) => o.text)));
        formData.set("correct_option_ids", correctOptionIds);
      }

      try {
        const result = await updateQuestion(question.id, formData);
        if (result?.error) {
          setError(result.error);
        } else {
          toast.success("問題を更新しました");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      questionType,
      rubricElements,
      choices,
      correctAnswers,
      blanks,
      options,
      correctOptionIds,
      question.id,
    ]
  );

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const result = await deleteQuestion(question.id);
      if (result?.error) {
        toast.error(result.error);
        setShowDeleteDialog(false);
      }
      // On success, deleteQuestion redirects to /sell/pool
    } catch {
      toast.error("削除中にエラーが発生しました");
    } finally {
      setIsDeleting(false);
    }
  }, [question.id]);

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sell/pool">
            <ArrowLeft className="mr-1 h-4 w-4" />
            問題プール
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">問題を編集</h1>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          削除
        </Button>
      </div>

      <form action={handleSubmit}>
        <div className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Question type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">問題タイプ</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                name="question_type"
                value={questionType}
                onValueChange={setQuestionType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Question text */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">問題文</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                name="question_text"
                required
                rows={6}
                defaultValue={question.question_text}
                placeholder="問題文を入力してください..."
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="vertical_text"
                  name="vertical_text"
                  value="true"
                  defaultChecked={question.vertical_text}
                />
                <Label htmlFor="vertical_text" className="text-sm">
                  縦書き表示（国語向け）
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">メタデータ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>教科 *</Label>
                  <Select name="subject" defaultValue={question.subject}>
                    <SelectTrigger>
                      <SelectValue placeholder="選択" />
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
                  <Label>難易度 *</Label>
                  <Select name="difficulty" defaultValue={question.difficulty}>
                    <SelectTrigger>
                      <SelectValue />
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
                <div className="space-y-2">
                  <Label>配点</Label>
                  <Input
                    name="points"
                    type="number"
                    min="1"
                    defaultValue={question.points}
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>目安時間（分）</Label>
                  <Input
                    name="estimated_minutes"
                    type="number"
                    min="1"
                    defaultValue={question.estimated_minutes ?? ""}
                    placeholder="例: 15"
                  />
                </div>
                <div className="space-y-2">
                  <Label>トピックタグ（カンマ区切り）</Label>
                  <Input
                    name="topic_tags"
                    defaultValue={
                      Array.isArray(question.topic_tags)
                        ? question.topic_tags.join(", ")
                        : ""
                    }
                    placeholder="例: 微分, 積分"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Type-specific rubric: Essay */}
          {questionType === "essay" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  採点基準（ルーブリック）
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {rubricElements.map((elem, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Input
                      value={elem.description}
                      onChange={(e) => {
                        const next = [...rubricElements];
                        next[i] = { ...next[i], description: e.target.value };
                        setRubricElements(next);
                      }}
                      placeholder={`採点要素 ${i + 1}`}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={elem.points}
                      onChange={(e) => {
                        const next = [...rubricElements];
                        next[i] = {
                          ...next[i],
                          points: parseInt(e.target.value, 10) || 0,
                        };
                        setRubricElements(next);
                      }}
                      className="w-20"
                      min="0"
                    />
                    <span className="mt-2 text-sm text-muted-foreground">
                      点
                    </span>
                    {rubricElements.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setRubricElements(
                            rubricElements.filter((_, idx) => idx !== i)
                          )
                        }
                        aria-label="採点要素を削除"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRubricElements([
                      ...rubricElements,
                      { description: "", points: 5 },
                    ])
                  }
                >
                  要素を追加
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Type-specific rubric: Mark sheet */}
          {questionType === "mark_sheet" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">マーク式設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>選択肢（カンマ区切り）</Label>
                  <Input
                    value={choices}
                    onChange={(e) => setChoices(e.target.value)}
                    placeholder="ア,イ,ウ,エ,オ"
                  />
                </div>
                <div className="space-y-2">
                  <Label>正解（カンマ区切り）</Label>
                  <Input
                    value={correctAnswers}
                    onChange={(e) => setCorrectAnswers(e.target.value)}
                    placeholder="ア"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Type-specific rubric: Fill-in-blank */}
          {questionType === "fill_in_blank" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">穴埋め設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {blanks.map((blank, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-8 text-sm text-muted-foreground">
                      ({i + 1})
                    </span>
                    <Input
                      value={blank.acceptable_answers.join("|")}
                      onChange={(e) => {
                        const next = [...blanks];
                        next[i] = {
                          ...next[i],
                          acceptable_answers: e.target.value
                            .split("|")
                            .map((a) => a.trim()),
                        };
                        setBlanks(next);
                      }}
                      placeholder="正解（|区切りで複数可）"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={blank.points}
                      onChange={(e) => {
                        const next = [...blanks];
                        next[i] = {
                          ...next[i],
                          points: parseInt(e.target.value, 10) || 0,
                        };
                        setBlanks(next);
                      }}
                      className="w-20"
                      min="0"
                    />
                    <span className="text-sm text-muted-foreground">点</span>
                    {blanks.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setBlanks(blanks.filter((_, idx) => idx !== i))
                        }
                        aria-label="空欄を削除"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setBlanks([
                      ...blanks,
                      {
                        id: `blank-${blanks.length}`,
                        label: `(${blanks.length + 1})`,
                        acceptable_answers: [""],
                        points: 2,
                      },
                    ])
                  }
                >
                  空欄を追加
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Type-specific rubric: Multiple choice */}
          {questionType === "multiple_choice" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">選択式設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-8 text-sm font-medium">
                      {String.fromCharCode(97 + i)}.
                    </span>
                    <Input
                      value={opt.text}
                      onChange={(e) => {
                        const next = [...options];
                        next[i] = { ...next[i], text: e.target.value };
                        setOptions(next);
                      }}
                      placeholder={`選択肢 ${String.fromCharCode(65 + i)}`}
                      className="flex-1"
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setOptions(options.filter((_, idx) => idx !== i))
                        }
                        aria-label="選択肢を削除"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setOptions([
                      ...options,
                      {
                        id: String.fromCharCode(97 + options.length),
                        text: "",
                      },
                    ])
                  }
                >
                  選択肢を追加
                </Button>
                <div className="space-y-2">
                  <Label>正解のID（カンマ区切り、例: a,b）</Label>
                  <Input
                    value={correctOptionIds}
                    onChange={(e) => setCorrectOptionIds(e.target.value)}
                    placeholder="a"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Model answer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">模範解答（任意）</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                name="model_answer"
                rows={4}
                defaultValue={question.model_answer ?? ""}
                placeholder="模範解答を入力してください（見直しモードで表示されます）"
              />
            </CardContent>
          </Card>

          {/* Video uploader */}
          <VideoUploader
            questionId={question.id}
            initialVideos={question.video_urls ?? []}
          />

          {/* Submit */}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            変更を保存
          </Button>
        </div>
      </form>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>問題を削除</DialogTitle>
            <DialogDescription>
              この問題を削除してもよろしいですか？問題セットで使用されている場合は削除できません。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              <X className="mr-1 h-4 w-4" />
              キャンセル
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-4 w-4" />
              )}
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
