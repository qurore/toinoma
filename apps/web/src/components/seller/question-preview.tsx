"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RubyText } from "@/components/text/furigana";
import { ANSWER_TYPE_LABELS } from "@toinoma/shared/constants";
import type { ProblemSetRubric, SectionRubric, QuestionRubric } from "@toinoma/shared/schemas";

// ──────────────────────────────────────────────
// ATH-007: Question preview toggle
// ──────────────────────────────────────────────
// Two modes:
//   "問題用紙" (Problem sheet) — shows question text only
//   "解答用紙" (Answer sheet)  — shows answer areas

interface QuestionPreviewProps {
  rubric: ProblemSetRubric;
  /** Optional problem set title displayed at the top */
  title?: string;
  className?: string;
}

export function QuestionPreview({
  rubric,
  title,
  className,
}: QuestionPreviewProps) {
  const [mode, setMode] = useState<"problem" | "answer">("problem");

  return (
    <div className={className}>
      <Tabs
        value={mode}
        onValueChange={(v) => setMode(v as "problem" | "answer")}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="problem">問題用紙</TabsTrigger>
          <TabsTrigger value="answer">解答用紙</TabsTrigger>
        </TabsList>

        <TabsContent value="problem">
          <PreviewSheet title={title} rubric={rubric} mode="problem" />
        </TabsContent>

        <TabsContent value="answer">
          <PreviewSheet title={title} rubric={rubric} mode="answer" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ──────────────────────────────────────────────
// PreviewSheet — Renders either problem or answer view
// ──────────────────────────────────────────────

function PreviewSheet({
  title,
  rubric,
  mode,
}: {
  title?: string;
  rubric: ProblemSetRubric;
  mode: "problem" | "answer";
}) {
  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        {/* Title */}
        {title && (
          <div className="border-b border-border pb-4 text-center">
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "problem" ? "問題用紙" : "解答用紙"}
            </p>
          </div>
        )}

        {/* Sections */}
        {rubric.sections.map((section) => (
          <SectionPreview
            key={section.number}
            section={section}
            mode={mode}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// SectionPreview
// ──────────────────────────────────────────────

function SectionPreview({
  section,
  mode,
}: {
  section: SectionRubric;
  mode: "problem" | "answer";
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold">
          大問 {section.number}
        </h3>
        <Badge variant="secondary" className="text-xs">
          {section.points}点
        </Badge>
      </div>

      <div className="space-y-3 pl-4">
        {section.questions.map((question) => (
          <QuestionPreviewItem
            key={question.number}
            question={question}
            sectionNumber={section.number}
            mode={mode}
          />
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// QuestionPreviewItem — Individual question rendering
// ──────────────────────────────────────────────

function QuestionPreviewItem({
  question,
  sectionNumber,
  mode,
}: {
  question: QuestionRubric;
  sectionNumber: number;
  mode: "problem" | "answer";
}) {
  const typeLabel = ANSWER_TYPE_LABELS[question.type] ?? question.type;

  if (mode === "problem") {
    return (
      <div className="rounded-md border border-border p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="font-medium">
            {sectionNumber}-{question.number}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {typeLabel}
          </Badge>
          <span className="ml-auto text-xs text-muted-foreground">
            {question.points}点
          </span>
        </div>

        {/* Question text (rubric elements as hints for what is expected) */}
        {question.rubric && question.rubric.length > 0 && (
          <div className="text-sm text-foreground">
            <p className="text-muted-foreground">
              {question.rubric.length}つの採点基準
            </p>
          </div>
        )}

        {/* Model answer indicator */}
        {question.modelAnswer && (
          <p className="mt-1 text-xs text-muted-foreground">
            模範解答あり
          </p>
        )}
      </div>
    );
  }

  // Answer sheet mode — show empty answer areas
  return (
    <div className="rounded-md border border-dashed border-border p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-medium">
          {sectionNumber}-{question.number}
        </span>
        <Badge variant="outline" className="text-[10px]">
          {typeLabel}
        </Badge>
        <span className="ml-auto text-xs text-muted-foreground">
          {question.points}点
        </span>
      </div>

      {/* Answer area placeholder based on question type */}
      <AnswerAreaPlaceholder type={question.type} />
    </div>
  );
}

// ──────────────────────────────────────────────
// AnswerAreaPlaceholder — Empty answer placeholders
// ──────────────────────────────────────────────

function AnswerAreaPlaceholder({
  type,
}: {
  type: string;
}) {
  switch (type) {
    case "mark_sheet":
      return (
        <div className="flex flex-wrap gap-2 py-2">
          {["ア", "イ", "ウ", "エ", "オ"].map((label) => (
            <div
              key={label}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted-foreground/30 text-sm text-muted-foreground/50"
            >
              {label}
            </div>
          ))}
        </div>
      );

    case "fill_in_blank":
      return (
        <div className="py-2">
          <div className="h-8 border-b-2 border-muted-foreground/30" />
        </div>
      );

    case "essay":
    default:
      return (
        <div className="space-y-1.5 py-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-6 border-b border-muted-foreground/20"
            />
          ))}
          <p className="pt-1 text-center text-[10px] text-muted-foreground/40">
            解答欄
          </p>
        </div>
      );
  }
}
