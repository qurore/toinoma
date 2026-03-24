"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ChevronDown, ChevronUp } from "lucide-react";
import { ANSWER_TYPE_LABELS } from "@toinoma/shared/constants";
import type { AnswerType } from "@/types/database";

interface PreviewQuestion {
  id: string;
  question_type: AnswerType;
  question_text: string;
  points: number;
}

export function SampleQuestionPreview({
  questions,
}: {
  questions: PreviewQuestion[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4 text-muted-foreground" />
            サンプル問題
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs"
          >
            {expanded ? (
              <>
                閉じる
                <ChevronUp className="ml-1 h-3.5 w-3.5" />
              </>
            ) : (
              <>
                プレビューを見る
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          {questions.map((q, index) => (
            <div
              key={q.id}
              className="rounded-lg border border-border bg-muted/30 p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  問{index + 1}
                </span>
                <Badge variant="outline" className="text-xs">
                  {ANSWER_TYPE_LABELS[q.question_type]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {q.points}点
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {q.question_text}
              </p>
            </div>
          ))}
          <p className="text-center text-xs text-muted-foreground">
            購入すると全ての問題にアクセスできます
          </p>
        </CardContent>
      )}
    </Card>
  );
}
