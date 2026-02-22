import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GradingResult } from "@toinoma/shared/schemas";

function ScoreBar({
  score,
  maxScore,
}: {
  score: number;
  maxScore: number;
}) {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            percentage >= 80
              ? "bg-success"
              : percentage >= 50
                ? "bg-amber-500"
                : "bg-destructive"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="min-w-[4rem] text-right text-sm font-semibold">
        {score} / {maxScore}
      </span>
    </div>
  );
}

function RubricMatchItem({
  match,
}: {
  match: GradingResult["sections"][0]["questions"][0]["rubricMatches"][0];
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-card p-3">
      {match.matched ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{match.element}</p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {match.pointsAwarded} / {match.pointsPossible}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {match.explanation}
        </p>
      </div>
    </div>
  );
}

export function GradingResultDisplay({
  result,
}: {
  result: GradingResult;
}) {
  const percentage =
    result.maxScore > 0
      ? Math.round((result.totalScore / result.maxScore) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader className="text-center">
          <div
            className={cn(
              "mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full",
              percentage >= 80
                ? "bg-success/10"
                : percentage >= 50
                  ? "bg-amber-500/10"
                  : "bg-destructive/10"
            )}
          >
            <span
              className={cn(
                "text-3xl font-bold",
                percentage >= 80
                  ? "text-success"
                  : percentage >= 50
                    ? "text-amber-500"
                    : "text-destructive"
              )}
            >
              {percentage}%
            </span>
          </div>
          <CardTitle>
            {result.totalScore} / {result.maxScore} 点
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            ※ AI採点の結果は参考スコアです
          </p>
        </CardHeader>
        <CardContent>
          <ScoreBar score={result.totalScore} maxScore={result.maxScore} />
        </CardContent>
      </Card>

      {/* Overall Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-primary" />
            総合フィードバック
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {result.overallFeedback}
          </p>
        </CardContent>
      </Card>

      {/* Section Results */}
      {result.sections.map((section) => (
        <Card key={section.number}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                大問{section.number}
              </CardTitle>
              <Badge
                variant={
                  section.score >= section.maxScore * 0.8
                    ? "default"
                    : section.score >= section.maxScore * 0.5
                      ? "secondary"
                      : "destructive"
                }
              >
                {section.score} / {section.maxScore}
              </Badge>
            </div>
            <ScoreBar score={section.score} maxScore={section.maxScore} />
          </CardHeader>
          <CardContent className="space-y-4">
            {section.questions.map((question) => (
              <div
                key={question.number}
                className="space-y-2 rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {question.number}
                  </span>
                  <span className="text-sm font-semibold">
                    {question.score} / {question.maxScore}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground">
                  {question.feedback}
                </p>

                {question.rubricMatches.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {question.rubricMatches.map((match, i) => (
                      <RubricMatchItem key={i} match={match} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
