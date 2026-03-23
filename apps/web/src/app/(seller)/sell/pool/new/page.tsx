"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
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
import { SUBJECTS, DIFFICULTIES, SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import { createQuestion } from "../actions";

const QUESTION_TYPES = [
  { value: "essay", label: "記述式" },
  { value: "mark_sheet", label: "マーク式" },
  { value: "fill_in_blank", label: "穴埋め式" },
  { value: "multiple_choice", label: "選択式" },
] as const;

export default function CreateQuestionPage() {
  const [questionType, setQuestionType] = useState("essay");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mark-sheet state
  const [choices, setChoices] = useState("ア,イ,ウ,エ,オ");
  const [correctAnswers, setCorrectAnswers] = useState("");

  // Fill-in-blank state
  const [blanksCount, setBlanksCount] = useState(1);

  // Multiple choice state
  const [optionCount, setOptionCount] = useState(4);

  // Essay rubric elements
  const [rubricElements, setRubricElements] = useState([
    { description: "", points: 5 },
  ]);

  async function handleSubmit(formData: FormData) {
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
      const blanks = [];
      for (let i = 0; i < blanksCount; i++) {
        const answer = formData.get(`blank_answer_${i}`) as string;
        const pts = parseInt(formData.get(`blank_points_${i}`) as string, 10) || 2;
        if (answer) {
          blanks.push({
            id: `blank-${i}`,
            label: `(${i + 1})`,
            acceptable_answers: answer.split("|").map((a) => a.trim()),
            points: pts,
          });
        }
      }
      formData.set(
        "blanks_json",
        JSON.stringify({ type: "fill_in_blank", blanks })
      );
    } else if (questionType === "multiple_choice") {
      const options = [];
      for (let i = 0; i < optionCount; i++) {
        const text = formData.get(`option_text_${i}`) as string;
        if (text) {
          options.push({ id: String.fromCharCode(97 + i), text });
        }
      }
      const correctIds = formData.get("correct_option_ids") as string;
      formData.set(
        "options_json",
        JSON.stringify(options)
      );
      formData.set("correct_option_ids", correctIds || "");
    }

    try {
      const result = await createQuestion(formData);
      if (result?.error) {
        setError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sell/pool">
            <ArrowLeft className="mr-1 h-4 w-4" />
            問題プール
          </Link>
        </Button>
      </div>

      <h1 className="mb-6 text-2xl font-bold tracking-tight">問題を作成</h1>

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
                placeholder="問題文を入力してください..."
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="vertical_text"
                  name="vertical_text"
                  value="true"
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
                  <Select name="subject" required>
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
                  <Select name="difficulty" defaultValue="medium">
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
                    defaultValue="10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Type-specific rubric */}
          {questionType === "essay" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">採点基準（ルーブリック）</CardTitle>
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
                        next[i] = { ...next[i], points: parseInt(e.target.value, 10) || 0 };
                        setRubricElements(next);
                      }}
                      className="w-20"
                      min="0"
                    />
                    <span className="mt-2 text-sm text-muted-foreground">点</span>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRubricElements([...rubricElements, { description: "", points: 5 }])
                  }
                >
                  要素を追加
                </Button>
              </CardContent>
            </Card>
          )}

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

          {questionType === "fill_in_blank" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">穴埋め設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: blanksCount }, (_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-8 text-sm text-muted-foreground">
                      ({i + 1})
                    </span>
                    <Input
                      name={`blank_answer_${i}`}
                      placeholder="正解（|区切りで複数可）"
                      className="flex-1"
                    />
                    <Input
                      name={`blank_points_${i}`}
                      type="number"
                      defaultValue="2"
                      className="w-20"
                      min="0"
                    />
                    <span className="text-sm text-muted-foreground">点</span>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBlanksCount(blanksCount + 1)}
                >
                  空欄を追加
                </Button>
              </CardContent>
            </Card>
          )}

          {questionType === "multiple_choice" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">選択式設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: optionCount }, (_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-8 text-sm font-medium">
                      {String.fromCharCode(97 + i)}.
                    </span>
                    <Input
                      name={`option_text_${i}`}
                      placeholder={`選択肢 ${String.fromCharCode(65 + i)}`}
                      className="flex-1"
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOptionCount(optionCount + 1)}
                >
                  選択肢を追加
                </Button>
                <div className="space-y-2">
                  <Label>正解のID（カンマ区切り、例: a,b）</Label>
                  <Input name="correct_option_ids" placeholder="a" />
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
                placeholder="模範解答を入力してください（見直しモードで表示されます）"
              />
            </CardContent>
          </Card>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            問題を保存
          </Button>
        </div>
      </form>
    </main>
  );
}
