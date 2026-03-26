"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SUBJECTS,
  DIFFICULTIES,
  SUBJECT_LABELS,
  DIFFICULTY_LABELS,
} from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";
import type { ExtractedQuestion } from "@/app/api/pdf-import/route";

const QUESTION_TYPES = [
  { value: "essay", label: "記述式" },
  { value: "mark_sheet", label: "マーク式" },
  { value: "fill_in_blank", label: "穴埋め式" },
  { value: "multiple_choice", label: "選択式" },
] as const;

const TYPE_LABELS: Record<string, string> = {
  essay: "記述式",
  mark_sheet: "マーク式",
  fill_in_blank: "穴埋め式",
  multiple_choice: "選択式",
};

const CONFIDENCE_CONFIG = {
  high: {
    label: "高",
    className: "text-green-600",
  },
  medium: {
    label: "中",
    className: "text-amber-600",
  },
  low: {
    label: "低",
    className: "text-red-600",
  },
};

interface ExtractedQuestionCardProps {
  question: ExtractedQuestion & { accepted: boolean };
  index: number;
  onUpdate: (
    tempId: string,
    updates: Partial<ExtractedQuestion & { accepted: boolean }>
  ) => void;
}

export function ExtractedQuestionCard({
  question,
  index,
  onUpdate,
}: ExtractedQuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Track original values to detect edits
  const [originalText] = useState(question.questionText);
  const [originalType] = useState(question.questionType);

  const hasEdits =
    question.questionText !== originalText ||
    question.questionType !== originalType;

  const confidenceConfig = CONFIDENCE_CONFIG[question.confidence];

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        !question.accepted && "opacity-50"
      )}
    >
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Accept checkbox */}
          <div className="pt-0.5">
            <Checkbox
              id={`accept-${question.tempId}`}
              checked={question.accepted}
              onCheckedChange={(checked) =>
                onUpdate(question.tempId, { accepted: !!checked })
              }
              aria-label={`問題 ${index + 1} を選択`}
            />
          </div>

          {/* Question preview */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">
                Q{index + 1}
              </span>
              <span className="text-xs text-muted-foreground">
                {[
                  TYPE_LABELS[question.questionType] ?? question.questionType,
                  question.subject && (SUBJECT_LABELS[question.subject as Subject] ?? question.subject),
                  question.difficulty && (DIFFICULTY_LABELS[question.difficulty as Difficulty] ?? question.difficulty),
                  `${question.points}点`,
                ].filter(Boolean).join(" · ")}
              </span>

              {/* Confidence label */}
              <span className={cn("ml-auto text-xs", confidenceConfig.className)}>
                確信度: {confidenceConfig.label}
              </span>

              {/* Edit indicator */}
              {hasEdits && (
                <span className="text-xs text-primary">
                  編集済み
                </span>
              )}
            </div>

            <p className="mt-1.5 text-sm leading-relaxed text-foreground/80 line-clamp-2">
              {question.questionText}
            </p>

            {question.extractionNotes && !isExpanded && (
              <p className="mt-1 text-xs text-muted-foreground italic">
                AI: {question.extractionNotes}
              </p>
            )}
          </div>

          {/* Expand/collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="shrink-0"
            aria-label={isExpanded ? "折りたたむ" : "展開する"}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Expanded detail panel */}
        {isExpanded && (
          <div className="mt-4 ml-12 space-y-4 border-t border-border pt-4">
            {/* Editing toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">詳細</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "編集を完了" : "編集する"}
              </Button>
            </div>

            {/* Question type */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                問題タイプ
              </Label>
              {isEditing ? (
                <Select
                  value={question.questionType}
                  onValueChange={(v) =>
                    onUpdate(question.tempId, {
                      questionType:
                        v as ExtractedQuestion["questionType"],
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
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
              ) : (
                <p className="text-sm">
                  {TYPE_LABELS[question.questionType] ?? question.questionType}
                </p>
              )}
            </div>

            {/* Question text */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">問題文</Label>
              {isEditing ? (
                <Textarea
                  value={question.questionText}
                  onChange={(e) =>
                    onUpdate(question.tempId, {
                      questionText: e.target.value,
                    })
                  }
                  rows={4}
                  className="text-sm"
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed rounded-md bg-muted/50 p-3">
                  {question.questionText}
                </p>
              )}
            </div>

            {/* Subject and difficulty row */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">教科</Label>
                {isEditing ? (
                  <Select
                    value={question.subject ?? ""}
                    onValueChange={(v) =>
                      onUpdate(question.tempId, { subject: v || null })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
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
                ) : (
                  <p className="text-sm">
                    {question.subject
                      ? (SUBJECT_LABELS[question.subject as Subject] ??
                        question.subject)
                      : "未設定"}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">難易度</Label>
                {isEditing ? (
                  <Select
                    value={question.difficulty ?? ""}
                    onValueChange={(v) =>
                      onUpdate(question.tempId, { difficulty: v || null })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map((d) => (
                        <SelectItem key={d} value={d}>
                          {DIFFICULTY_LABELS[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm">
                    {question.difficulty
                      ? (DIFFICULTY_LABELS[question.difficulty as Difficulty] ??
                        question.difficulty)
                      : "未設定"}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">配点</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    min={1}
                    value={question.points}
                    onChange={(e) =>
                      onUpdate(question.tempId, {
                        points: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="h-8 text-sm"
                  />
                ) : (
                  <p className="text-sm">{question.points}点</p>
                )}
              </div>
            </div>

            {/* Model answer */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                模範解答
              </Label>
              {isEditing ? (
                <Textarea
                  value={question.modelAnswer ?? ""}
                  onChange={(e) =>
                    onUpdate(question.tempId, {
                      modelAnswer: e.target.value || null,
                    })
                  }
                  rows={3}
                  placeholder="模範解答がある場合は入力してください"
                  className="text-sm"
                />
              ) : question.modelAnswer ? (
                <p className="whitespace-pre-wrap text-sm rounded-md bg-muted/50 p-3">
                  {question.modelAnswer}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">なし</p>
              )}
            </div>

            {/* Rubric preview */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                ルーブリック
              </Label>
              <RubricPreview
                rubric={question.rubric}
                questionType={question.questionType}
              />
            </div>

            {/* AI extraction notes */}
            {question.extractionNotes && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  AIメモ
                </Label>
                <p className="text-xs text-muted-foreground italic rounded-md bg-muted/30 p-2">
                  {question.extractionNotes}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Rubric preview sub-component
function RubricPreview({
  rubric,
  questionType,
}: {
  rubric: Record<string, unknown>;
  questionType: string;
}) {
  if (!rubric || Object.keys(rubric).length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        ルーブリックが抽出されませんでした
      </p>
    );
  }

  if (questionType === "essay") {
    const elements = (rubric.rubric_elements ?? []) as Array<{
      description: string;
      points: number;
    }>;
    if (elements.length === 0) {
      return (
        <p className="text-sm text-muted-foreground italic">
          採点要素なし
        </p>
      );
    }
    return (
      <div className="space-y-1 rounded-md bg-muted/50 p-3">
        {elements.map((el, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span>{el.description}</span>
            <span className="text-muted-foreground">{el.points}点</span>
          </div>
        ))}
      </div>
    );
  }

  if (questionType === "mark_sheet") {
    const choices = (rubric.choices ?? []) as string[];
    const correct = (rubric.correct_answers ?? []) as string[];
    return (
      <div className="space-y-1 rounded-md bg-muted/50 p-3 text-sm">
        <div>
          <span className="text-muted-foreground">選択肢: </span>
          {choices.join(", ")}
        </div>
        <div>
          <span className="text-muted-foreground">正解: </span>
          {correct.join(", ")}
        </div>
      </div>
    );
  }

  if (questionType === "fill_in_blank") {
    const blanks = (rubric.blanks ?? []) as Array<{
      label: string;
      acceptable_answers: string[];
      points: number;
    }>;
    if (blanks.length === 0) {
      return (
        <p className="text-sm text-muted-foreground italic">
          空欄情報なし
        </p>
      );
    }
    return (
      <div className="space-y-1 rounded-md bg-muted/50 p-3">
        {blanks.map((blank, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span>
              {blank.label}: {blank.acceptable_answers.join(" / ")}
            </span>
            <span className="text-muted-foreground">{blank.points}点</span>
          </div>
        ))}
      </div>
    );
  }

  if (questionType === "multiple_choice") {
    const options = (rubric.options ?? []) as Array<{
      id: string;
      text: string;
    }>;
    const correctIds = (rubric.correct_option_ids ?? []) as string[];
    return (
      <div className="space-y-1 rounded-md bg-muted/50 p-3 text-sm">
        {options.map((opt) => (
          <div
            key={opt.id}
            className={cn(
              "flex items-center gap-2",
              correctIds.includes(opt.id) && "font-medium text-green-700"
            )}
          >
            <span>{opt.id}.</span>
            <span>{opt.text}</span>
            {correctIds.includes(opt.id) && (
              <span className="text-xs text-green-600">✓</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Fallback: show raw JSON
  return (
    <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs">
      {JSON.stringify(rubric, null, 2)}
    </pre>
  );
}
