"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Save,
  FileText,
  CheckSquare,
  Type,
  ListChecks,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ImagePlus,
  Video,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  SUBJECTS,
  DIFFICULTIES,
  SUBJECT_LABELS,
  DIFFICULTY_LABELS,
} from "@toinoma/shared/constants";
import { createQuestion } from "../actions";

// ========================================================================
// Question type configuration
// ========================================================================
const QUESTION_TYPES = [
  { value: "essay", label: "記述式", icon: FileText, description: "自由記述型の問題" },
  { value: "mark_sheet", label: "マーク式", icon: CheckSquare, description: "選択肢から正解を選ぶ" },
  { value: "fill_in_blank", label: "穴埋め式", icon: Type, description: "正確な解答を求める" },
  { value: "multiple_choice", label: "選択式", icon: ListChecks, description: "複数の選択肢から選ぶ" },
] as const;

// ========================================================================
// Rubric element interfaces
// ========================================================================
interface EssayRubricElement {
  description: string;
  points: number;
}

interface BlankItem {
  label: string;
  acceptableAnswers: string[];
  points: number;
  caseSensitive: boolean;
}

interface MultipleChoiceOption {
  id: string;
  text: string;
}

// ========================================================================
// Main page component
// ========================================================================
export default function CreateQuestionPage() {
  // Core state
  const [questionType, setQuestionType] = useState("essay");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Question text
  const [questionText, setQuestionText] = useState("");
  const [verticalText, setVerticalText] = useState(false);

  // Metadata
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [points, setPoints] = useState(10);
  const [tags, setTags] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null);

  // Model answer
  const [modelAnswer, setModelAnswer] = useState("");

  // Video URLs (up to 3)
  const [videoUrls, setVideoUrls] = useState<string[]>([""]);

  // Essay rubric state
  const [rubricElements, setRubricElements] = useState<EssayRubricElement[]>([
    { description: "", points: 5 },
  ]);

  // Mark-sheet state
  const [choices, setChoices] = useState("ア,イ,ウ,エ,オ");
  const [correctAnswers, setCorrectAnswers] = useState("");
  const [groupedScoring, setGroupedScoring] = useState(true);

  // Fill-in-blank state
  const [blanks, setBlanks] = useState<BlankItem[]>([
    {
      label: "(1)",
      acceptableAnswers: [""],
      points: 2,
      caseSensitive: false,
    },
  ]);

  // Multiple choice state
  const [mcOptions, setMcOptions] = useState<MultipleChoiceOption[]>([
    { id: "a", text: "" },
    { id: "b", text: "" },
    { id: "c", text: "" },
    { id: "d", text: "" },
  ]);
  const [correctOptionIds, setCorrectOptionIds] = useState("");

  // Computed: essay rubric point total
  const essayPointTotal = useMemo(
    () => rubricElements.reduce((acc, e) => acc + e.points, 0),
    [rubricElements]
  );

  // Computed: fill-in-blank point total
  const blankPointTotal = useMemo(
    () => blanks.reduce((acc, b) => acc + b.points, 0),
    [blanks]
  );

  // ======================================================================
  // Handlers
  // ======================================================================

  const addRubricElement = useCallback(() => {
    setRubricElements((prev) => [...prev, { description: "", points: 0 }]);
  }, []);

  const removeRubricElement = useCallback((index: number) => {
    setRubricElements((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addBlank = useCallback(() => {
    setBlanks((prev) => [
      ...prev,
      {
        label: `(${prev.length + 1})`,
        acceptableAnswers: [""],
        points: 2,
        caseSensitive: false,
      },
    ]);
  }, []);

  const removeBlank = useCallback((index: number) => {
    setBlanks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addBlankAnswer = useCallback((blankIndex: number) => {
    setBlanks((prev) =>
      prev.map((b, i) =>
        i === blankIndex
          ? { ...b, acceptableAnswers: [...b.acceptableAnswers, ""] }
          : b
      )
    );
  }, []);

  const removeBlankAnswer = useCallback(
    (blankIndex: number, answerIndex: number) => {
      setBlanks((prev) =>
        prev.map((b, i) =>
          i === blankIndex
            ? {
                ...b,
                acceptableAnswers: b.acceptableAnswers.filter(
                  (_, j) => j !== answerIndex
                ),
              }
            : b
        )
      );
    },
    []
  );

  const addMcOption = useCallback(() => {
    setMcOptions((prev) => [
      ...prev,
      { id: String.fromCharCode(97 + prev.length), text: "" },
    ]);
  }, []);

  const removeMcOption = useCallback((index: number) => {
    setMcOptions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addVideoUrl = useCallback(() => {
    setVideoUrls((prev) => (prev.length < 3 ? [...prev, ""] : prev));
  }, []);

  const removeVideoUrl = useCallback((index: number) => {
    setVideoUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ======================================================================
  // Submit handler
  // ======================================================================
  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);

    // Set core fields
    formData.set("question_type", questionType);
    formData.set("question_text", questionText);
    formData.set("subject", subject);
    formData.set("difficulty", difficulty);
    formData.set("points", String(points));
    formData.set("model_answer", modelAnswer);
    formData.set("vertical_text", verticalText ? "true" : "false");

    // Set optional metadata
    if (tags.trim()) {
      formData.set("topic_tags", tags);
    }
    if (estimatedMinutes !== null) {
      formData.set("estimated_minutes", String(estimatedMinutes));
    }

    // Set video URLs
    const validVideoUrls = videoUrls.filter((u) => u.trim());
    if (validVideoUrls.length > 0) {
      formData.set("video_urls", JSON.stringify(validVideoUrls));
    }

    // Build type-specific rubric data
    if (questionType === "essay") {
      formData.set(
        "rubric_json",
        JSON.stringify({
          type: "essay",
          rubric_elements: rubricElements.filter((e) => e.description.trim()),
        })
      );
    } else if (questionType === "mark_sheet") {
      formData.set("choices", choices);
      formData.set("correct_answers", correctAnswers);
    } else if (questionType === "fill_in_blank") {
      const blankData = blanks.map((b) => ({
        id: `blank-${b.label}`,
        label: b.label,
        acceptable_answers: b.acceptableAnswers.filter((a) => a.trim()),
        points: b.points,
        case_sensitive: b.caseSensitive,
      }));
      formData.set(
        "blanks_json",
        JSON.stringify({ type: "fill_in_blank", blanks: blankData })
      );
    } else if (questionType === "multiple_choice") {
      const options = mcOptions
        .filter((o) => o.text.trim())
        .map((o) => ({ id: o.id, text: o.text }));
      formData.set("options_json", JSON.stringify(options));
      formData.set("correct_option_ids", correctOptionIds);
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

  // ======================================================================
  // Render
  // ======================================================================
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      {/* Back navigation */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sell/pool">
            <ArrowLeft className="mr-1 h-4 w-4" />
            問題プール
          </Link>
        </Button>
      </div>

      {/* Page title with preview toggle */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">問題を作成</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? (
            <EyeOff className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <Eye className="mr-1.5 h-3.5 w-3.5" />
          )}
          {showPreview ? "編集に戻る" : "プレビュー"}
        </Button>
      </div>

      {/* Preview mode */}
      {showPreview ? (
        <QuestionPreview
          questionType={questionType}
          questionText={questionText}
          subject={subject}
          difficulty={difficulty}
          points={points}
          verticalText={verticalText}
          modelAnswer={modelAnswer}
          rubricElements={rubricElements}
          choices={choices}
          correctAnswers={correctAnswers}
          blanks={blanks}
          mcOptions={mcOptions}
          correctOptionIds={correctOptionIds}
        />
      ) : (
        /* Edit mode */
        <form action={handleSubmit}>
          <div className="space-y-6">
            {/* Error display */}
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* =========================================================
                Question type selector (tab buttons)
            ========================================================= */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">問題タイプ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {QUESTION_TYPES.map((t) => {
                    const TypeIcon = t.icon;
                    const isActive = questionType === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setQuestionType(t.value)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-colors",
                          isActive
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30 hover:bg-muted/50"
                        )}
                      >
                        <TypeIcon
                          className={cn(
                            "h-5 w-5",
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm font-medium",
                            isActive ? "text-primary" : ""
                          )}
                        >
                          {t.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {t.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* =========================================================
                Question text editor
            ========================================================= */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">問題文</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  required
                  rows={6}
                  placeholder="問題文を入力してください..."
                  className={cn(
                    verticalText && "writing-vertical-rl"
                  )}
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="vertical_text"
                    checked={verticalText}
                    onCheckedChange={(checked) =>
                      setVerticalText(!!checked)
                    }
                  />
                  <Label htmlFor="vertical_text" className="text-sm">
                    縦書き表示（国語向け）
                  </Label>
                </div>

                {/* Image upload area placeholder */}
                <div>
                  <Label className="text-xs text-muted-foreground">
                    問題画像（任意）
                  </Label>
                  <button
                    type="button"
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted/30"
                  >
                    <ImagePlus className="h-5 w-5" />
                    クリックまたはドラッグで画像をアップロード
                  </button>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG / PNG / WebP（最大5MB）
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* =========================================================
                Metadata
            ========================================================= */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">メタデータ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>教科 *</Label>
                    <Select value={subject} onValueChange={setSubject}>
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
                    <Select value={difficulty} onValueChange={setDifficulty}>
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
                      type="number"
                      min="1"
                      value={points}
                      onChange={(e) =>
                        setPoints(parseInt(e.target.value, 10) || 10)
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>トピックタグ</Label>
                    <Input
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="カンマ区切り（例: 微分, 極限）"
                    />
                    <p className="text-xs text-muted-foreground">
                      カンマ区切りで入力
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>推定解答時間（分）</Label>
                    <Input
                      type="number"
                      min="1"
                      value={estimatedMinutes ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEstimatedMinutes(
                          val ? parseInt(val, 10) || null : null
                        );
                      }}
                      placeholder="未設定"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* =========================================================
                Type-specific rubric sections
            ========================================================= */}

            {/* Essay rubric */}
            {questionType === "essay" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      採点基準（ルーブリック）
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                      {essayPointTotal !== points && (
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      <span
                        className={cn(
                          "text-xs font-medium",
                          essayPointTotal !== points
                            ? "text-amber-600"
                            : "text-muted-foreground"
                        )}
                      >
                        合計: {essayPointTotal}点 / 配点: {points}点
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rubricElements.map((elem, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="mt-2 w-6 shrink-0 text-center text-xs text-muted-foreground">
                        {i + 1}
                      </span>
                      <Input
                        value={elem.description}
                        onChange={(e) => {
                          const next = [...rubricElements];
                          next[i] = {
                            ...next[i],
                            description: e.target.value,
                          };
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRubricElement(i)}
                        disabled={rubricElements.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRubricElement}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    要素を追加
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Mark-sheet rubric */}
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
                    <p className="text-xs text-muted-foreground">
                      選択肢をカンマ区切りで入力してください
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>正解（カンマ区切り）</Label>
                    <Input
                      value={correctAnswers}
                      onChange={(e) => setCorrectAnswers(e.target.value)}
                      placeholder="ア"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="grouped_scoring"
                      checked={groupedScoring}
                      onCheckedChange={(checked) =>
                        setGroupedScoring(!!checked)
                      }
                    />
                    <Label htmlFor="grouped_scoring" className="text-sm">
                      グループ採点（全問正解で配点、1問でも不正解なら0点）
                    </Label>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fill-in-blank rubric */}
            {questionType === "fill_in_blank" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">穴埋め設定</CardTitle>
                    <span className="text-xs text-muted-foreground">
                      合計: {blankPointTotal}点
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {blanks.map((blank, blankIdx) => (
                    <div
                      key={blankIdx}
                      className="rounded-lg border border-border p-3 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {blank.label}
                          </Badge>
                          <Input
                            type="number"
                            value={blank.points}
                            onChange={(e) => {
                              const next = [...blanks];
                              next[blankIdx] = {
                                ...next[blankIdx],
                                points:
                                  parseInt(e.target.value, 10) || 0,
                              };
                              setBlanks(next);
                            }}
                            className="w-20"
                            min="0"
                          />
                          <span className="text-xs text-muted-foreground">
                            点
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`case_${blankIdx}`}
                            checked={blank.caseSensitive}
                            onCheckedChange={(checked) => {
                              const next = [...blanks];
                              next[blankIdx] = {
                                ...next[blankIdx],
                                caseSensitive: !!checked,
                              };
                              setBlanks(next);
                            }}
                          />
                          <Label
                            htmlFor={`case_${blankIdx}`}
                            className="text-xs text-muted-foreground"
                          >
                            大文字小文字区別
                          </Label>
                          {blanks.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeBlank(blankIdx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Accepted answers list */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          正解
                        </Label>
                        {blank.acceptableAnswers.map(
                          (ans, ansIdx) => (
                            <div
                              key={ansIdx}
                              className="flex items-center gap-2"
                            >
                              <Input
                                value={ans}
                                onChange={(e) => {
                                  const next = [...blanks];
                                  const answers = [
                                    ...next[blankIdx]
                                      .acceptableAnswers,
                                  ];
                                  answers[ansIdx] =
                                    e.target.value;
                                  next[blankIdx] = {
                                    ...next[blankIdx],
                                    acceptableAnswers: answers,
                                  };
                                  setBlanks(next);
                                }}
                                placeholder={
                                  ansIdx === 0
                                    ? "正解"
                                    : "別解"
                                }
                                className="flex-1"
                              />
                              {ansIdx > 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    removeBlankAnswer(
                                      blankIdx,
                                      ansIdx
                                    )
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          )
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => addBlankAnswer(blankIdx)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          別解を追加
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBlank}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    空欄を追加
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Multiple choice rubric */}
            {questionType === "multiple_choice" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">選択式設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mcOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-8 shrink-0 text-center text-sm font-medium">
                        {opt.id}.
                      </span>
                      <Input
                        value={opt.text}
                        onChange={(e) => {
                          const next = [...mcOptions];
                          next[i] = { ...next[i], text: e.target.value };
                          setMcOptions(next);
                        }}
                        placeholder={`選択肢 ${opt.id.toUpperCase()}`}
                        className="flex-1"
                      />
                      {mcOptions.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMcOption(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMcOption}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    選択肢を追加
                  </Button>
                  <Separator />
                  <div className="space-y-2">
                    <Label>正解のID（カンマ区切り、例: a,b）</Label>
                    <Input
                      value={correctOptionIds}
                      onChange={(e) => setCorrectOptionIds(e.target.value)}
                      placeholder="a"
                    />
                    <p className="text-xs text-muted-foreground">
                      正解が複数ある場合はカンマ区切りで入力
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* =========================================================
                Model answer
            ========================================================= */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">模範解答（任意）</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={modelAnswer}
                  onChange={(e) => setModelAnswer(e.target.value)}
                  rows={4}
                  placeholder="模範解答を入力してください（見直しモードで表示されます）"
                />
              </CardContent>
            </Card>

            {/* =========================================================
                Video URLs
            ========================================================= */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">解説動画URL（任意）</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {videoUrls.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Video className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Input
                      value={url}
                      onChange={(e) => {
                        const next = [...videoUrls];
                        next[i] = e.target.value;
                        setVideoUrls(next);
                      }}
                      placeholder="https://youtube.com/watch?v=..."
                      className="flex-1"
                    />
                    {videoUrls.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVideoUrl(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                {videoUrls.length < 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addVideoUrl}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    URLを追加
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  最大3つまで
                </p>
              </CardContent>
            </Card>

            {/* =========================================================
                Submit buttons
            ========================================================= */}
            <div className="flex gap-3">
              <Button
                type="submit"
                variant="outline"
                disabled={isSubmitting}
                className="flex-1"
                onClick={() => setIsDraft(true)}
              >
                {isSubmitting && isDraft ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                下書き保存
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
                onClick={() => setIsDraft(false)}
              >
                {isSubmitting && !isDraft ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                問題を保存
              </Button>
            </div>
          </div>
        </form>
      )}
    </main>
  );
}

// ========================================================================
// Question Preview component
// ========================================================================
function QuestionPreview({
  questionType,
  questionText,
  subject,
  difficulty,
  points,
  verticalText,
  modelAnswer,
  rubricElements,
  choices,
  correctAnswers,
  blanks,
  mcOptions,
  correctOptionIds,
}: {
  questionType: string;
  questionText: string;
  subject: string;
  difficulty: string;
  points: number;
  verticalText: boolean;
  modelAnswer: string;
  rubricElements: EssayRubricElement[];
  choices: string;
  correctAnswers: string;
  blanks: BlankItem[];
  mcOptions: MultipleChoiceOption[];
  correctOptionIds: string;
}) {
  const typeLabel =
    QUESTION_TYPES.find((t) => t.value === questionType)?.label ?? questionType;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">プレビュー</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{typeLabel}</Badge>
              {subject && (
                <Badge variant="secondary">
                  {SUBJECT_LABELS[subject as keyof typeof SUBJECT_LABELS] ??
                    subject}
                </Badge>
              )}
              {difficulty && (
                <Badge variant="secondary">
                  {DIFFICULTY_LABELS[
                    difficulty as keyof typeof DIFFICULTY_LABELS
                  ] ?? difficulty}
                </Badge>
              )}
              <Badge variant="secondary">{points}点</Badge>
              {verticalText && <Badge variant="outline">縦書き</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Question text */}
          <div
            className={cn(
              "rounded-lg bg-muted/50 p-4",
              verticalText && "writing-vertical-rl min-h-[200px]"
            )}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {questionText || "（問題文未入力）"}
            </p>
          </div>

          {/* Type-specific preview */}
          <div className="mt-4">
            {questionType === "essay" && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  採点要素:
                </p>
                {rubricElements
                  .filter((e) => e.description.trim())
                  .map((e, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{e.description}</span>
                      <span className="text-muted-foreground">
                        {e.points}点
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {questionType === "mark_sheet" && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  選択肢:
                </p>
                <div className="flex flex-wrap gap-2">
                  {choices
                    .split(",")
                    .filter((c) => c.trim())
                    .map((c) => {
                      const trimmed = c.trim();
                      const isCorrect = correctAnswers
                        .split(",")
                        .map((a) => a.trim())
                        .includes(trimmed);
                      return (
                        <Badge
                          key={trimmed}
                          variant={isCorrect ? "default" : "outline"}
                        >
                          {trimmed}
                          {isCorrect && " (正解)"}
                        </Badge>
                      );
                    })}
                </div>
              </div>
            )}

            {questionType === "fill_in_blank" && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  空欄:
                </p>
                {blanks.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {b.label}:{" "}
                      {b.acceptableAnswers
                        .filter((a) => a.trim())
                        .join(" / ")}
                    </span>
                    <span className="text-muted-foreground">
                      {b.points}点
                    </span>
                  </div>
                ))}
              </div>
            )}

            {questionType === "multiple_choice" && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  選択肢:
                </p>
                {mcOptions
                  .filter((o) => o.text.trim())
                  .map((o) => {
                    const isCorrect = correctOptionIds
                      .split(",")
                      .map((id) => id.trim())
                      .includes(o.id);
                    return (
                      <div
                        key={o.id}
                        className={cn(
                          "flex items-center gap-2 text-sm",
                          isCorrect && "font-medium text-green-700"
                        )}
                      >
                        <span>{o.id}.</span>
                        <span>{o.text}</span>
                        {isCorrect && (
                          <Badge
                            variant="outline"
                            className="text-xs text-green-600"
                          >
                            正解
                          </Badge>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Model answer */}
          {modelAnswer && (
            <div className="mt-4">
              <Separator className="mb-3" />
              <p className="text-xs font-medium text-muted-foreground">
                模範解答:
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm rounded-md bg-green-50 p-3 text-green-800">
                {modelAnswer}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
