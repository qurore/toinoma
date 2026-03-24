"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Eye, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold leading-none tracking-tight">
              <Eye className="h-4 w-4 text-muted-foreground" />
              サンプル問題
              <Badge variant="secondary" className="text-xs font-normal">
                {questions.length}問
              </Badge>
            </h2>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                aria-label={expanded ? "サンプル問題を閉じる" : "サンプル問題を開く"}
              >
                {/* Button text stays constant — only the icon rotates */}
                プレビュー
                <ChevronDown
                  className={cn(
                    "ml-1 h-3.5 w-3.5 transition-transform duration-200",
                    expanded && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {questions.map((q, index) => (
              <div
                key={q.id}
                className="rounded-lg border border-border bg-muted/30 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
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
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
