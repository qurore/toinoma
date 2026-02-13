"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EssayAnswerInput } from "./essay-answer-input";
import { MarkSheetInput } from "./mark-sheet-input";
import { FillInBlankInput } from "./fill-in-blank-input";
import { Loader2, Send } from "lucide-react";
import type { ProblemSetRubric, QuestionAnswer } from "@toinoma/shared/schemas";
import { ANSWER_TYPE_LABELS } from "@toinoma/shared/constants";
import { Badge } from "@/components/ui/badge";

export function AnswerForm({
  rubric,
  problemSetId,
  onSubmit,
}: {
  rubric: ProblemSetRubric;
  problemSetId: string;
  onSubmit: (answers: Record<string, QuestionAnswer>) => Promise<void>;
}) {
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnswerChange = useCallback(
    (key: string, value: QuestionAnswer) => {
      setAnswers((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(answers);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {rubric.sections.map((section) => (
        <Card key={section.number}>
          <CardHeader>
            <CardTitle className="text-lg">
              大問{section.number}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({section.points}点)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {section.questions.map((question) => {
              const key = `${section.number}-${question.number}`;

              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {ANSWER_TYPE_LABELS[question.type]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {question.points}点
                    </span>
                  </div>

                  {question.type === "essay" && (
                    <EssayAnswerInput
                      questionNumber={question.number}
                      onChange={(value) => handleAnswerChange(key, value)}
                    />
                  )}

                  {question.type === "mark_sheet" && (
                    <MarkSheetInput
                      questionNumber={question.number}
                      choices={question.choices}
                      onChange={(value) => handleAnswerChange(key, value)}
                    />
                  )}

                  {question.type === "fill_in_blank" && (
                    <FillInBlankInput
                      questionNumber={question.number}
                      onChange={(value) => handleAnswerChange(key, value)}
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        解答を提出してAI採点
      </Button>
    </div>
  );
}
