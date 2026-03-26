"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  SUBJECT_LABELS,
  DIFFICULTY_LABELS,
  ANSWER_TYPE_LABELS,
} from "@toinoma/shared/constants";
import type { Subject, Difficulty, AnswerType } from "@/types/database";
import { cn } from "@/lib/utils";

// A question within the composed set
export interface ComposedQuestionItem {
  questionId: string;
  questionType: string;
  questionText: string;
  subject: string;
  difficulty: string;
  originalPoints: number;
  pointsOverride: number | null;
}

// A section within the composed set
export interface ComposedSectionItem {
  id: string; // client-side unique ID
  sectionNumber: number;
  sectionTitle: string;
  questions: ComposedQuestionItem[];
}

interface SetStructureEditorProps {
  sections: ComposedSectionItem[];
  onChange: (sections: ComposedSectionItem[]) => void;
}

export function SetStructureEditor({
  sections,
  onChange,
}: SetStructureEditorProps) {
  // Calculate total points
  const totalPoints = sections.reduce(
    (acc, section) =>
      acc +
      section.questions.reduce(
        (qAcc, q) => qAcc + (q.pointsOverride ?? q.originalPoints),
        0
      ),
    0
  );

  const totalQuestions = sections.reduce(
    (acc, s) => acc + s.questions.length,
    0
  );

  // Add a new empty section
  const addSection = useCallback(() => {
    const newSection: ComposedSectionItem = {
      id: crypto.randomUUID(),
      sectionNumber: sections.length + 1,
      sectionTitle: `第${sections.length + 1}問`,
      questions: [],
    };
    onChange([...sections, newSection]);
  }, [sections, onChange]);

  // Remove a section
  const removeSection = useCallback(
    (sectionId: string) => {
      const updated = sections
        .filter((s) => s.id !== sectionId)
        .map((s, idx) => ({
          ...s,
          sectionNumber: idx + 1,
        }));
      onChange(updated);
    },
    [sections, onChange]
  );

  // Update section title
  const updateSectionTitle = useCallback(
    (sectionId: string, title: string) => {
      onChange(
        sections.map((s) =>
          s.id === sectionId ? { ...s, sectionTitle: title } : s
        )
      );
    },
    [sections, onChange]
  );

  // Remove a question from a section
  const removeQuestion = useCallback(
    (sectionId: string, questionId: string) => {
      onChange(
        sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                questions: s.questions.filter(
                  (q) => q.questionId !== questionId
                ),
              }
            : s
        )
      );
    },
    [sections, onChange]
  );

  // Move a question up within its section
  const moveQuestionUp = useCallback(
    (sectionId: string, questionIndex: number) => {
      if (questionIndex === 0) return;
      onChange(
        sections.map((s) => {
          if (s.id !== sectionId) return s;
          const qs = [...s.questions];
          [qs[questionIndex - 1], qs[questionIndex]] = [
            qs[questionIndex],
            qs[questionIndex - 1],
          ];
          return { ...s, questions: qs };
        })
      );
    },
    [sections, onChange]
  );

  // Move a question down within its section
  const moveQuestionDown = useCallback(
    (sectionId: string, questionIndex: number) => {
      onChange(
        sections.map((s) => {
          if (s.id !== sectionId) return s;
          if (questionIndex >= s.questions.length - 1) return s;
          const qs = [...s.questions];
          [qs[questionIndex], qs[questionIndex + 1]] = [
            qs[questionIndex + 1],
            qs[questionIndex],
          ];
          return { ...s, questions: qs };
        })
      );
    },
    [sections, onChange]
  );

  // Update points override for a question
  const updatePointsOverride = useCallback(
    (sectionId: string, questionId: string, value: string) => {
      const parsed = parseInt(value, 10);
      const override = value === "" ? null : isNaN(parsed) ? null : parsed;

      onChange(
        sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                questions: s.questions.map((q) =>
                  q.questionId === questionId
                    ? { ...q, pointsOverride: override }
                    : q
                ),
              }
            : s
        )
      );
    },
    [sections, onChange]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Summary header */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            {sections.length} セクション
          </span>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm text-muted-foreground">
            {totalQuestions} 問
          </span>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm font-semibold text-primary">
            合計 {totalPoints} 点
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={addSection}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          セクション追加
        </Button>
      </div>

      {/* Sections list */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-16 text-center">
            <p className="text-sm font-medium">セクションがありません</p>
            <p className="mt-1 text-xs text-muted-foreground">
              「セクション追加」をクリックして、問題を整理しましょう
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={addSection}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              最初のセクションを追加
            </Button>
          </div>
        ) : (
          sections.map((section) => {
            const sectionPoints = section.questions.reduce(
              (acc, q) => acc + (q.pointsOverride ?? q.originalPoints),
              0
            );

            return (
              <div
                key={section.id}
                className="rounded-lg border border-border"
              >
                {/* Section header */}
                <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
                  <Input
                    value={section.sectionTitle}
                    onChange={(e) =>
                      updateSectionTitle(section.id, e.target.value)
                    }
                    className="h-7 flex-1 border-none bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-1"
                    placeholder="セクション名"
                    aria-label={`セクション${section.sectionNumber}のタイトル`}
                  />
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {sectionPoints}点
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => removeSection(section.id)}
                    aria-label={`${section.sectionTitle}を削除`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>

                {/* Questions within section */}
                <div className="divide-y divide-border">
                  {section.questions.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <p className="text-xs text-muted-foreground">
                        左の問題プールから問題を追加してください
                      </p>
                    </div>
                  ) : (
                    section.questions.map((q, qIdx) => {
                      const typeLabel =
                        ANSWER_TYPE_LABELS[q.questionType as AnswerType] ??
                        q.questionType;

                      return (
                        <div
                          key={q.questionId}
                          className="group flex items-start gap-2 px-3 py-2"
                        >
                          {/* Position number */}
                          <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">
                            {qIdx + 1}
                          </span>

                          {/* Question info */}
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-xs leading-snug">
                              {q.questionText}
                            </p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              {typeLabel} · {SUBJECT_LABELS[q.subject as Subject]} · {DIFFICULTY_LABELS[q.difficulty as Difficulty]}
                            </p>
                          </div>

                          {/* Points override */}
                          <div className="flex shrink-0 items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              value={
                                q.pointsOverride !== null
                                  ? q.pointsOverride
                                  : ""
                              }
                              onChange={(e) =>
                                updatePointsOverride(
                                  section.id,
                                  q.questionId,
                                  e.target.value
                                )
                              }
                              placeholder={String(q.originalPoints)}
                              className={cn(
                                "h-7 w-14 text-center text-xs",
                                q.pointsOverride !== null &&
                                  q.pointsOverride !== q.originalPoints &&
                                  "border-primary/50 text-primary"
                              )}
                              aria-label={`${q.questionText.slice(0, 20)}の配点`}
                            />
                            <span className="text-[10px] text-muted-foreground">
                              点
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex shrink-0 flex-col gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              disabled={qIdx === 0}
                              onClick={() =>
                                moveQuestionUp(section.id, qIdx)
                              }
                              aria-label="上へ移動"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              disabled={
                                qIdx === section.questions.length - 1
                              }
                              onClick={() =>
                                moveQuestionDown(section.id, qIdx)
                              }
                              aria-label="下へ移動"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                            onClick={() =>
                              removeQuestion(section.id, q.questionId)
                            }
                            aria-label={`${q.questionText.slice(0, 20)}を削除`}
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
