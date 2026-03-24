"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  GripVertical,
  AlertCircle,
  CheckCircle2,
  FileText,
  CheckSquare,
  Type,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
// Constants imported for type labels in the type tab configuration
import type { ProblemSetRubric } from "@toinoma/shared/schemas";
import { saveRubric } from "@/app/(seller)/seller/actions";

type AnswerType = "essay" | "mark_sheet" | "fill_in_blank" | "multiple_choice";

// Type tab configuration with icons
const TYPE_TABS: Array<{
  value: AnswerType;
  label: string;
  icon: typeof FileText;
}> = [
  { value: "essay", label: "記述式", icon: FileText },
  { value: "mark_sheet", label: "マークシート", icon: CheckSquare },
  { value: "fill_in_blank", label: "穴埋め", icon: Type },
  { value: "multiple_choice", label: "選択式", icon: ListChecks },
];

interface EditableQuestion {
  number: string;
  points: number;
  type: AnswerType;
  // Essay fields
  rubricElements: Array<{ element: string; points: number }>;
  modelAnswer: string;
  // Mark sheet fields
  choices: string[];
  correctAnswer: string;
  groupedScoring: boolean;
  // Fill in blank fields
  acceptedAnswers: string[];
  caseSensitive: boolean;
  // Multiple choice fields
  multipleChoiceOptions: Array<{ label: string; value: string }>;
  correctAnswers: string[];
  multiSelect: boolean;
}

interface EditableSection {
  number: number;
  points: number;
  questions: EditableQuestion[];
}

function createEmptyQuestion(number: string): EditableQuestion {
  return {
    number,
    points: 10,
    type: "essay",
    rubricElements: [{ element: "", points: 5 }],
    modelAnswer: "",
    choices: ["ア", "イ", "ウ", "エ"],
    correctAnswer: "ア",
    groupedScoring: true,
    acceptedAnswers: [""],
    caseSensitive: false,
    multipleChoiceOptions: [
      { label: "A", value: "a" },
      { label: "B", value: "b" },
      { label: "C", value: "c" },
      { label: "D", value: "d" },
    ],
    correctAnswers: ["a"],
    multiSelect: false,
  };
}

function rubricToEditable(
  rubric: ProblemSetRubric | null
): EditableSection[] {
  if (!rubric) {
    return [
      {
        number: 1,
        points: 100,
        questions: [createEmptyQuestion("(1)")],
      },
    ];
  }

  return rubric.sections.map((section) => ({
    number: section.number,
    points: section.points,
    questions: section.questions.map((q) => {
      const base: EditableQuestion = {
        number: q.number,
        points: q.points,
        type: q.type,
        rubricElements: [],
        modelAnswer: "",
        choices: ["ア", "イ", "ウ", "エ"],
        correctAnswer: "ア",
        groupedScoring: true,
        acceptedAnswers: [""],
        caseSensitive: false,
        multipleChoiceOptions: [
          { label: "A", value: "a" },
          { label: "B", value: "b" },
          { label: "C", value: "c" },
          { label: "D", value: "d" },
        ],
        correctAnswers: ["a"],
        multiSelect: false,
      };

      if (q.type === "essay") {
        base.rubricElements = q.rubricElements.map((e) => ({
          element: e.element,
          points: e.points,
        }));
        base.modelAnswer = q.modelAnswer ?? "";
      } else if (q.type === "mark_sheet") {
        base.choices = q.choices;
        base.correctAnswer = q.correctAnswer;
      } else if (q.type === "fill_in_blank") {
        base.acceptedAnswers = q.acceptedAnswers;
        base.caseSensitive = q.caseSensitive ?? false;
      } else if (q.type === "multiple_choice") {
        base.multipleChoiceOptions = q.options;
        base.correctAnswers = q.correctAnswers;
        base.multiSelect = q.multiSelect;
      }

      return base;
    }),
  }));
}

function editableToRubric(sections: EditableSection[]): ProblemSetRubric {
  return {
    sections: sections.map((section) => ({
      number: section.number,
      points: section.points,
      questions: section.questions.map((q) => {
        if (q.type === "essay") {
          return {
            number: q.number,
            points: q.points,
            type: "essay" as const,
            rubricElements: q.rubricElements.filter(
              (e) => e.element.trim()
            ),
            modelAnswer: q.modelAnswer || undefined,
          };
        } else if (q.type === "mark_sheet") {
          return {
            number: q.number,
            points: q.points,
            type: "mark_sheet" as const,
            choices: q.choices.filter((c) => c.trim()),
            correctAnswer: q.correctAnswer,
          };
        } else if (q.type === "multiple_choice") {
          return {
            number: q.number,
            points: q.points,
            type: "multiple_choice" as const,
            options: q.multipleChoiceOptions.filter(
              (o) => o.label.trim() && o.value.trim()
            ),
            correctAnswers: q.correctAnswers.filter((a) => a.trim()),
            multiSelect: q.multiSelect,
          };
        } else {
          return {
            number: q.number,
            points: q.points,
            type: "fill_in_blank" as const,
            acceptedAnswers: q.acceptedAnswers.filter((a) => a.trim()),
            caseSensitive: q.caseSensitive,
          };
        }
      }),
    })),
  };
}

// ========================================================================
// Essay rubric fields with point total indicator
// ========================================================================
function EssayFields({
  question,
  onChange,
}: {
  question: EditableQuestion;
  onChange: (q: EditableQuestion) => void;
}) {
  const elementPointTotal = question.rubricElements.reduce(
    (acc, e) => acc + e.points,
    0
  );
  const pointsMismatch = elementPointTotal !== question.points;

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">採点要素</Label>
          <div className="flex items-center gap-1.5">
            {pointsMismatch && (
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                pointsMismatch
                  ? "text-amber-600"
                  : "text-muted-foreground"
              )}
            >
              要素合計: {elementPointTotal}点 / 配点: {question.points}点
            </span>
          </div>
        </div>
        <div className="mt-1 space-y-2">
          {question.rubricElements.map((elem, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-center text-xs text-muted-foreground">
                {i + 1}
              </span>
              <Input
                value={elem.element}
                onChange={(e) => {
                  const updated = [...question.rubricElements];
                  updated[i] = {
                    ...updated[i],
                    element: e.target.value,
                  };
                  onChange({ ...question, rubricElements: updated });
                }}
                placeholder="採点要素"
                className="flex-1"
              />
              <Input
                type="number"
                min="0"
                value={elem.points}
                onChange={(e) => {
                  const updated = [...question.rubricElements];
                  updated[i] = {
                    ...updated[i],
                    points: parseInt(e.target.value) || 0,
                  };
                  onChange({ ...question, rubricElements: updated });
                }}
                className="w-20"
              />
              <span className="text-xs text-muted-foreground">点</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="削除"
                onClick={() => {
                  const updated = question.rubricElements.filter(
                    (_, j) => j !== i
                  );
                  onChange({ ...question, rubricElements: updated });
                }}
                disabled={question.rubricElements.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onChange({
                ...question,
                rubricElements: [
                  ...question.rubricElements,
                  { element: "", points: 0 },
                ],
              });
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            要素を追加
          </Button>
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-xs text-muted-foreground">模範解答</Label>
        <Textarea
          value={question.modelAnswer}
          onChange={(e) =>
            onChange({ ...question, modelAnswer: e.target.value })
          }
          rows={3}
          placeholder="模範解答（任意）"
          className="mt-1"
        />
      </div>
    </div>
  );
}

// ========================================================================
// Mark-sheet rubric fields with choice set config and grouped scoring
// ========================================================================
function MarkSheetFields({
  question,
  onChange,
}: {
  question: EditableQuestion;
  onChange: (q: EditableQuestion) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Choice set configuration */}
      <div>
        <Label className="text-xs text-muted-foreground">選択肢</Label>
        <div className="mt-1 space-y-2">
          {question.choices.map((choice, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-center text-xs font-medium text-muted-foreground">
                {i + 1}
              </span>
              <Input
                value={choice}
                onChange={(e) => {
                  const updated = [...question.choices];
                  updated[i] = e.target.value;
                  onChange({ ...question, choices: updated });
                }}
                placeholder={`選択肢 ${i + 1}`}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="削除"
                onClick={() => {
                  const updated = question.choices.filter(
                    (_, j) => j !== i
                  );
                  onChange({ ...question, choices: updated });
                }}
                disabled={question.choices.length <= 2}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onChange({
                ...question,
                choices: [...question.choices, ""],
              });
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            選択肢を追加
          </Button>
        </div>
      </div>

      <Separator />

      {/* Correct answer selector */}
      <div>
        <Label className="text-xs text-muted-foreground">正解</Label>
        <Select
          value={question.correctAnswer}
          onValueChange={(val) =>
            onChange({ ...question, correctAnswer: val })
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="正解を選択" />
          </SelectTrigger>
          <SelectContent>
            {question.choices
              .filter((c) => c.trim())
              .map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Grouped scoring toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`groupedScoring-${question.number}`}
          checked={question.groupedScoring}
          onChange={(e) =>
            onChange({ ...question, groupedScoring: e.target.checked })
          }
          className="rounded border-border"
        />
        <Label
          htmlFor={`groupedScoring-${question.number}`}
          className="text-xs text-muted-foreground"
        >
          グループ採点（全問正解で配点、1問でも不正解なら0点）
        </Label>
      </div>
    </div>
  );
}

// ========================================================================
// Fill-in-blank rubric fields with accepted answers management
// ========================================================================
function FillInBlankFields({
  question,
  onChange,
}: {
  question: EditableQuestion;
  onChange: (q: EditableQuestion) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground">
          正解（複数可）
        </Label>
        <div className="mt-1 space-y-2">
          {question.acceptedAnswers.map((ans, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-center text-xs text-muted-foreground">
                {i + 1}
              </span>
              <Input
                value={ans}
                onChange={(e) => {
                  const updated = [...question.acceptedAnswers];
                  updated[i] = e.target.value;
                  onChange({
                    ...question,
                    acceptedAnswers: updated,
                  });
                }}
                placeholder={i === 0 ? "正解" : "別解"}
                className="flex-1"
              />
              {i > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="削除"
                  onClick={() => {
                    const updated = question.acceptedAnswers.filter(
                      (_, j) => j !== i
                    );
                    onChange({
                      ...question,
                      acceptedAnswers: updated,
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onChange({
                ...question,
                acceptedAnswers: [...question.acceptedAnswers, ""],
              });
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            別解を追加
          </Button>
        </div>
      </div>

      <Separator />

      {/* Case sensitivity toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`caseSensitive-${question.number}`}
          checked={question.caseSensitive}
          onChange={(e) =>
            onChange({ ...question, caseSensitive: e.target.checked })
          }
          className="rounded border-border"
        />
        <Label
          htmlFor={`caseSensitive-${question.number}`}
          className="text-xs text-muted-foreground"
        >
          大文字・小文字を区別する
        </Label>
      </div>
    </div>
  );
}

// ========================================================================
// Multiple choice rubric fields with options and correct answers
// ========================================================================
function MultipleChoiceFields({
  question,
  onChange,
}: {
  question: EditableQuestion;
  onChange: (q: EditableQuestion) => void;
}) {
  const hasEmptyOptions = question.multipleChoiceOptions.some(
    (o) => !o.label.trim() || !o.value.trim()
  );
  const hasNoCorrect = question.correctAnswers.length === 0;

  return (
    <div className="space-y-3">
      {/* Options configuration */}
      <div>
        <Label className="text-xs text-muted-foreground">選択肢</Label>
        {hasEmptyOptions && (
          <p className="mt-0.5 text-xs text-destructive">
            すべての選択肢にラベルと値を入力してください
          </p>
        )}
        <div className="mt-1 space-y-2">
          {question.multipleChoiceOptions.map((option, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-center text-xs font-medium text-muted-foreground">
                {i + 1}
              </span>
              <Input
                value={option.label}
                onChange={(e) => {
                  const updated = [...question.multipleChoiceOptions];
                  updated[i] = { ...updated[i], label: e.target.value };
                  onChange({ ...question, multipleChoiceOptions: updated });
                }}
                placeholder="ラベル"
                className={cn(
                  "w-28",
                  !option.label.trim() && "border-destructive"
                )}
              />
              <Input
                value={option.value}
                onChange={(e) => {
                  const updated = [...question.multipleChoiceOptions];
                  updated[i] = { ...updated[i], value: e.target.value };
                  onChange({ ...question, multipleChoiceOptions: updated });
                }}
                placeholder="値"
                className={cn(
                  "flex-1",
                  !option.value.trim() && "border-destructive"
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="削除"
                onClick={() => {
                  const updated = question.multipleChoiceOptions.filter(
                    (_, j) => j !== i
                  );
                  // Also remove from correctAnswers if the value was selected
                  const removedValue = option.value;
                  const updatedCorrect = question.correctAnswers.filter(
                    (a) => a !== removedValue
                  );
                  onChange({
                    ...question,
                    multipleChoiceOptions: updated,
                    correctAnswers: updatedCorrect,
                  });
                }}
                disabled={question.multipleChoiceOptions.length <= 2}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onChange({
                ...question,
                multipleChoiceOptions: [
                  ...question.multipleChoiceOptions,
                  { label: "", value: "" },
                ],
              });
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            選択肢を追加
          </Button>
        </div>
      </div>

      <Separator />

      {/* Correct answers selector */}
      <div>
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">正解</Label>
          {hasNoCorrect && (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              正解を選択してください
            </span>
          )}
        </div>
        <div className="mt-1.5 space-y-1">
          {question.multipleChoiceOptions
            .filter((o) => o.value.trim())
            .map((o) => {
              const isCorrect = question.correctAnswers.includes(o.value);
              return (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                >
                  <input
                    type={question.multiSelect ? "checkbox" : "radio"}
                    name={`correct-${question.number}`}
                    checked={isCorrect}
                    onChange={() => {
                      if (question.multiSelect) {
                        const updated = isCorrect
                          ? question.correctAnswers.filter(
                              (a) => a !== o.value
                            )
                          : [...question.correctAnswers, o.value];
                        onChange({
                          ...question,
                          correctAnswers: updated,
                        });
                      } else {
                        onChange({
                          ...question,
                          correctAnswers: [o.value],
                        });
                      }
                    }}
                    className="rounded border-border"
                  />
                  <span>
                    {o.label}
                    <span className="ml-1 text-muted-foreground">
                      ({o.value})
                    </span>
                  </span>
                </label>
              );
            })}
        </div>
      </div>

      <Separator />

      {/* Multi-select toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`multiSelect-${question.number}`}
          checked={question.multiSelect}
          onChange={(e) =>
            onChange({ ...question, multiSelect: e.target.checked })
          }
          className="rounded border-border"
        />
        <Label
          htmlFor={`multiSelect-${question.number}`}
          className="text-xs text-muted-foreground"
        >
          複数選択を許可する
        </Label>
      </div>
    </div>
  );
}

// ========================================================================
// Validation helper to check if a question has incomplete rubric data
// ========================================================================
function getQuestionValidationIssues(q: EditableQuestion): string[] {
  const issues: string[] = [];

  if (!q.number.trim()) {
    issues.push("問番号が入力されていません");
  }
  if (q.points <= 0) {
    issues.push("配点が0です");
  }

  if (q.type === "essay") {
    const nonEmptyElements = q.rubricElements.filter(
      (e) => e.element.trim()
    );
    if (nonEmptyElements.length === 0) {
      issues.push("採点要素が入力されていません");
    }
  } else if (q.type === "mark_sheet") {
    const nonEmptyChoices = q.choices.filter((c) => c.trim());
    if (nonEmptyChoices.length < 2) {
      issues.push("選択肢を2つ以上入力してください");
    }
    if (!q.correctAnswer.trim()) {
      issues.push("正解が選択されていません");
    }
  } else if (q.type === "fill_in_blank") {
    const nonEmpty = q.acceptedAnswers.filter((a) => a.trim());
    if (nonEmpty.length === 0) {
      issues.push("正解が入力されていません");
    }
  } else if (q.type === "multiple_choice") {
    const validOptions = q.multipleChoiceOptions.filter(
      (o) => o.label.trim() && o.value.trim()
    );
    if (validOptions.length < 2) {
      issues.push("選択肢を2つ以上入力してください");
    }
    if (q.correctAnswers.filter((a) => a.trim()).length === 0) {
      issues.push("正解が選択されていません");
    }
  }

  return issues;
}

// ========================================================================
// Main RubricEditor component
// ========================================================================
export function RubricEditor({
  problemSetId,
  initialRubric,
}: {
  problemSetId: string;
  initialRubric: ProblemSetRubric | null;
}) {
  const [sections, setSections] = useState<EditableSection[]>(() =>
    rubricToEditable(initialRubric)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Count total validation issues across all questions
  const totalValidationIssues = useMemo(() => {
    return sections.reduce(
      (acc, section) =>
        acc +
        section.questions.reduce(
          (qAcc, q) => qAcc + getQuestionValidationIssues(q).length,
          0
        ),
      0
    );
  }, [sections]);

  // Calculate total points across all sections
  const totalPoints = useMemo(() => {
    return sections.reduce(
      (acc, section) =>
        acc +
        section.questions.reduce((qAcc, q) => qAcc + q.points, 0),
      0
    );
  }, [sections]);

  // Overall section-level point totals for display
  const sectionPointTotals = useMemo(() => {
    return sections.map((section) =>
      section.questions.reduce((acc, q) => acc + q.points, 0)
    );
  }, [sections]);

  const updateQuestion = useCallback(
    (
      sectionIdx: number,
      questionIdx: number,
      question: EditableQuestion
    ) => {
      setSections((prev) => {
        const updated = [...prev];
        updated[sectionIdx] = {
          ...updated[sectionIdx],
          questions: updated[sectionIdx].questions.map((q, i) =>
            i === questionIdx ? question : q
          ),
        };
        return updated;
      });
    },
    []
  );

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const rubric = editableToRubric(sections);
      const result = await saveRubric(
        problemSetId,
        JSON.stringify(rubric)
      );
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({
          type: "success",
          text: "ルーブリックを保存しました",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status messages */}
      {message && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-md p-3 text-sm",
            message.type === "success"
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive"
          )}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Points summary bar */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-xs text-muted-foreground">
              合計配点
            </span>
            <p className="text-lg font-bold text-primary">
              {totalPoints}点
            </p>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div>
            <span className="text-xs text-muted-foreground">
              大問数
            </span>
            <p className="text-lg font-bold">{sections.length}</p>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div>
            <span className="text-xs text-muted-foreground">
              小問数
            </span>
            <p className="text-lg font-bold">
              {sections.reduce(
                (acc, s) => acc + s.questions.length,
                0
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Sections */}
      {sections.map((section, sectionIdx) => (
        <Card key={sectionIdx}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                大問{section.number}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  小問合計: {sectionPointTotals[sectionIdx]}点
                </Badge>
                <Label className="text-xs text-muted-foreground">
                  配点
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={section.points}
                  onChange={(e) => {
                    const updated = [...sections];
                    updated[sectionIdx] = {
                      ...updated[sectionIdx],
                      points: parseInt(e.target.value) || 0,
                    };
                    setSections(updated);
                  }}
                  className="w-20"
                />
                {sections.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="削除"
                    onClick={() => {
                      setSections(
                        sections.filter(
                          (_, i) => i !== sectionIdx
                        )
                      );
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {section.questions.map((question, questionIdx) => {
              const validationIssues =
                getQuestionValidationIssues(question);
              const hasIssues = validationIssues.length > 0;

              return (
              <div
                key={questionIdx}
                className={cn(
                  "space-y-3 rounded-lg border p-4",
                  hasIssues
                    ? "border-amber-300 bg-amber-50/30 dark:border-amber-700 dark:bg-amber-950/10"
                    : "border-border"
                )}
              >
                {/* Validation warnings */}
                {hasIssues && (
                  <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div className="space-y-0.5">
                      {validationIssues.map((issue) => (
                        <p key={issue}>{issue}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question header row */}
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={question.number}
                    onChange={(e) =>
                      updateQuestion(sectionIdx, questionIdx, {
                        ...question,
                        number: e.target.value,
                      })
                    }
                    placeholder="(1)"
                    className="w-24"
                  />

                  {/* Tab-based type selector */}
                  <div className="flex rounded-md border border-input">
                    {TYPE_TABS.map((tab) => {
                      const TabIcon = tab.icon;
                      const isActive = question.type === tab.value;
                      return (
                        <button
                          key={tab.value}
                          type="button"
                          onClick={() =>
                            updateQuestion(
                              sectionIdx,
                              questionIdx,
                              { ...question, type: tab.value }
                            )
                          }
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          <TabIcon className="h-3 w-3" />
                          <span className="hidden sm:inline">
                            {tab.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <Input
                    type="number"
                    min="0"
                    value={question.points}
                    onChange={(e) =>
                      updateQuestion(sectionIdx, questionIdx, {
                        ...question,
                        points: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-20"
                    placeholder="配点"
                  />
                  <span className="text-xs text-muted-foreground">
                    点
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="削除"
                    onClick={() => {
                      const updated =
                        section.questions.filter(
                          (_, i) => i !== questionIdx
                        );
                      const newSections = [...sections];
                      newSections[sectionIdx] = {
                        ...newSections[sectionIdx],
                        questions: updated,
                      };
                      setSections(newSections);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Type-specific fields */}
                {question.type === "essay" && (
                  <EssayFields
                    question={question}
                    onChange={(q) =>
                      updateQuestion(sectionIdx, questionIdx, q)
                    }
                  />
                )}
                {question.type === "mark_sheet" && (
                  <MarkSheetFields
                    question={question}
                    onChange={(q) =>
                      updateQuestion(sectionIdx, questionIdx, q)
                    }
                  />
                )}
                {question.type === "fill_in_blank" && (
                  <FillInBlankFields
                    question={question}
                    onChange={(q) =>
                      updateQuestion(sectionIdx, questionIdx, q)
                    }
                  />
                )}
                {question.type === "multiple_choice" && (
                  <MultipleChoiceFields
                    question={question}
                    onChange={(q) =>
                      updateQuestion(sectionIdx, questionIdx, q)
                    }
                  />
                )}
              </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const nextNum = `(${section.questions.length + 1})`;
                const newSections = [...sections];
                newSections[sectionIdx] = {
                  ...newSections[sectionIdx],
                  questions: [
                    ...newSections[sectionIdx].questions,
                    createEmptyQuestion(nextNum),
                  ],
                };
                setSections(newSections);
              }}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              小問を追加
            </Button>
          </CardContent>
        </Card>
      ))}

      {/* Validation summary */}
      {totalValidationIssues > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50/50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {totalValidationIssues}件の入力不備があります。保存はできますが、公開前に修正してください。
          </span>
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSections([
              ...sections,
              {
                number: sections.length + 1,
                points: 100,
                questions: [createEmptyQuestion("(1)")],
              },
            ]);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          大問を追加
        </Button>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          ルーブリックを保存
        </Button>
      </div>
    </div>
  );
}
