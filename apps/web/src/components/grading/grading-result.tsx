"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Share2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GradingResult } from "@toinoma/shared/schemas";

// ──────────────────────────────────────────────
// Score tier helpers
// ──────────────────────────────────────────────

type ScoreTier = "high" | "mid" | "low";

function getScoreTier(percentage: number): ScoreTier {
  if (percentage >= 80) return "high";
  if (percentage >= 50) return "mid";
  return "low";
}

const TIER_COLORS = {
  high: {
    bg: "bg-success/10",
    text: "text-success",
    bar: "bg-success",
    border: "border-success/30",
    ring: "ring-success/20",
    badgeVariant: "default" as const,
  },
  mid: {
    bg: "bg-amber-500/10",
    text: "text-amber-600",
    bar: "bg-amber-500",
    border: "border-amber-500/30",
    ring: "ring-amber-500/20",
    badgeVariant: "secondary" as const,
  },
  low: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    bar: "bg-destructive",
    border: "border-destructive/30",
    ring: "ring-destructive/20",
    badgeVariant: "destructive" as const,
  },
};

// ──────────────────────────────────────────────
// Score bar
// ──────────────────────────────────────────────

function ScoreBar({
  score,
  maxScore,
  className,
}: {
  score: number;
  maxScore: number;
  className?: string;
}) {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const tier = getScoreTier(percentage);
  const colors = TIER_COLORS[tier];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            colors.bar
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="min-w-[4.5rem] text-right text-sm font-semibold tabular-nums">
        {score} / {maxScore}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────
// Rubric match indicator
// ──────────────────────────────────────────────

function RubricMatchIndicator({
  match,
}: {
  match: GradingResult["sections"][0]["questions"][0]["rubricMatches"][0];
}) {
  // Color code: full marks = green, partial = amber, zero = red
  const ratio =
    match.pointsPossible > 0
      ? match.pointsAwarded / match.pointsPossible
      : 0;
  const color =
    ratio >= 1 ? "success" : ratio > 0 ? "amber" : "destructive";

  const dotClass =
    color === "success"
      ? "bg-success"
      : color === "amber"
        ? "bg-amber-500"
        : "bg-destructive";

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-md border p-3",
        color === "success"
          ? "border-success/20 bg-success/5"
          : color === "amber"
            ? "border-amber-500/20 bg-amber-500/10"
            : "border-destructive/20 bg-destructive/5"
      )}
    >
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dotClass)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{match.element}</p>
          <span className="shrink-0 text-xs font-semibold tabular-nums">
            {match.pointsAwarded} / {match.pointsPossible}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {match.explanation}
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Section result card
// ──────────────────────────────────────────────

function SectionResult({
  section,
}: {
  section: GradingResult["sections"][0];
}) {
  const secPercentage =
    section.maxScore > 0
      ? Math.round((section.score / section.maxScore) * 100)
      : 0;
  const tier = getScoreTier(secPercentage);
  const colors = TIER_COLORS[tier];

  return (
    <AccordionItem value={`section-${section.number}`} className="border-none">
      <Card className="overflow-hidden">
        <AccordionTrigger className="px-6 py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
          <div className="flex flex-1 items-center justify-between pr-2">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">
                大問{section.number}
              </CardTitle>
              <Badge variant={colors.badgeVariant} className="text-xs">
                {secPercentage}%
              </Badge>
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {section.score} / {section.maxScore}
            </span>
          </div>
        </AccordionTrigger>

        <AccordionContent className="px-0 pb-0">
          <div className="px-6">
            <ScoreBar score={section.score} maxScore={section.maxScore} />
          </div>

          <div className="mt-4 space-y-4 px-6 pb-6">
            {section.questions.map((question) => {
              const qPct =
                question.maxScore > 0
                  ? Math.round(
                      (question.score / question.maxScore) * 100
                    )
                  : 0;
              const qTier = getScoreTier(qPct);
              const qColors = TIER_COLORS[qTier];

              return (
                <div
                  key={question.number}
                  className={cn(
                    "space-y-3 rounded-lg border p-4",
                    qColors.border
                  )}
                >
                  {/* Question header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          qColors.bar
                        )}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-medium">
                        {question.number}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        qColors.text
                      )}
                    >
                      {question.score} / {question.maxScore}
                    </span>
                  </div>

                  {/* Score micro-bar */}
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        qColors.bar
                      )}
                      style={{ width: `${qPct}%` }}
                    />
                  </div>

                  {/* Feedback */}
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {question.feedback}
                  </p>

                  {/* Rubric match indicators */}
                  {question.rubricMatches.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        ルーブリック評価
                      </p>
                      {question.rubricMatches.map((match, i) => (
                        <RubricMatchIndicator key={i} match={match} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </AccordionContent>
      </Card>
    </AccordionItem>
  );
}

// ──────────────────────────────────────────────
// Share result button
// ──────────────────────────────────────────────

function ShareResultButton({
  result,
  problemSetId,
}: {
  result: GradingResult;
  problemSetId?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const percentage =
      result.maxScore > 0
        ? Math.round((result.totalScore / result.maxScore) * 100)
        : 0;

    const shareText = `問の間で${percentage}%（${result.totalScore}/${result.maxScore}点）を獲得しました！`;
    const shareUrl = problemSetId
      ? `${window.location.origin}/problem/${problemSetId}`
      : window.location.href;

    // Try Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "問の間 - AI採点結果",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or unsupported — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — do nothing
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleShare}>
      {copied ? (
        <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Share2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
      )}
      結果を共有
    </Button>
  );
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────

export function GradingResultDisplay({
  result,
  problemSetId,
  showActions = false,
}: {
  result: GradingResult;
  problemSetId?: string;
  showActions?: boolean;
}) {
  const percentage = useMemo(
    () =>
      result.maxScore > 0
        ? Math.round((result.totalScore / result.maxScore) * 100)
        : 0,
    [result]
  );

  const tier = getScoreTier(percentage);
  const colors = TIER_COLORS[tier];

  // Default open sections: ones with score < 80%
  const defaultOpenSections = useMemo(
    () =>
      result.sections
        .filter(
          (s) => s.maxScore > 0 && (s.score / s.maxScore) * 100 < 80
        )
        .map((s) => `section-${s.number}`),
    [result]
  );

  return (
    <div className="space-y-6">
      {/* Overall score hero */}
      <Card className={cn("overflow-hidden ring-2", colors.ring)}>
        {/* Score gradient header */}
        <div
          className={cn(
            "relative px-6 pb-6 pt-8 text-center",
            colors.bg
          )}
        >
          {/* Large percentage ring */}
          <div className="mx-auto mb-3 flex h-28 w-28 items-center justify-center">
            <svg
              className="absolute h-28 w-28 -rotate-90"
              viewBox="0 0 120 120"
              aria-hidden="true"
            >
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-border/30"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${percentage * 3.267} ${(100 - percentage) * 3.267}`}
                strokeLinecap="round"
                className={cn(
                  "transition-all duration-1000 ease-out",
                  colors.text
                )}
              />
            </svg>
            <span className="relative" aria-live="polite" aria-atomic="true">
              <span className="sr-only">採点結果: {percentage}%</span>
              <span className={cn("text-3xl font-bold", colors.text)} aria-hidden="true">
                {percentage}
              </span>
              <span className={cn("text-lg font-semibold", colors.text)} aria-hidden="true">%</span>
            </span>
          </div>
          <p className="text-lg font-semibold text-foreground">
            {result.totalScore} / {result.maxScore} 点
          </p>
          {/* Tier-based encouragement message */}
          <p className={cn("mt-1.5 text-sm font-medium", colors.text)}>
            {percentage >= 80
              ? "素晴らしい成績です！"
              : percentage >= 50
                ? "よく頑張りました！"
                : "次はもっと伸ばせます！"}
          </p>

          {/* Section score chips */}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {result.sections.map((section) => {
              const secPct =
                section.maxScore > 0
                  ? Math.round((section.score / section.maxScore) * 100)
                  : 0;
              const secTier = getScoreTier(secPct);
              return (
                <Badge
                  key={section.number}
                  variant={TIER_COLORS[secTier].badgeVariant}
                  className="text-xs"
                >
                  大問{section.number}: {section.score}/{section.maxScore}
                </Badge>
              );
            })}
          </div>
        </div>
        <CardContent className="pt-4">
          <ScoreBar score={result.totalScore} maxScore={result.maxScore} />
        </CardContent>
      </Card>

      {/* AI grading disclaimer */}
      <p role="note" className="text-center text-xs text-muted-foreground">
        ※ AI採点は参考スコアです。ルーブリックに基づく自動採点のため、実際の採点と異なる場合があります。
      </p>

      {/* Overall feedback */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            総合フィードバック
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground">
            {result.overallFeedback}
          </p>

          {/* Per-section summary chips */}
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground">
              大問別の得点率
            </p>
            <div className="space-y-2">
              {result.sections.map((section) => {
                const secPct =
                  section.maxScore > 0
                    ? Math.round((section.score / section.maxScore) * 100)
                    : 0;
                const secTier = getScoreTier(secPct);
                const secColors = TIER_COLORS[secTier];
                return (
                  <div key={section.number} className="flex items-center gap-3">
                    <span className="w-16 text-xs font-medium text-muted-foreground">
                      大問{section.number}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700 ease-out",
                          secColors.bar
                        )}
                        style={{ width: `${secPct}%` }}
                      />
                    </div>
                    <span className={cn("min-w-[3.5rem] text-right text-xs font-semibold tabular-nums", secColors.text)}>
                      {section.score}/{section.maxScore}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section breakdown (collapsible) */}
      <Accordion
        type="multiple"
        defaultValue={defaultOpenSections}
        className="space-y-3"
      >
        {result.sections.map((section) => (
          <SectionResult key={section.number} section={section} />
        ))}
      </Accordion>

      {/* Action buttons */}
      {showActions && problemSetId && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1" asChild>
            <Link href={`/problem/${problemSetId}/solve`}>
              もう一度解く
            </Link>
          </Button>
          <Button variant="outline" className="flex-1" asChild>
            <Link href={`/problem/${problemSetId}/history`}>
              解答を確認
            </Link>
          </Button>
          <ShareResultButton result={result} problemSetId={problemSetId} />
        </div>
      )}

      {/* Next steps — guide the student toward continued learning */}
      {showActions && problemSetId && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              次のステップ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-4 text-sm text-muted-foreground marker:font-semibold marker:text-foreground">
              {/* Identify weakest section and suggest review */}
              {(() => {
                const weakest = result.sections.reduce((min, s) =>
                  s.maxScore > 0 && (s.score / s.maxScore) < (min.score / (min.maxScore || 1))
                    ? s
                    : min
                , result.sections[0]);
                const weakPct = weakest.maxScore > 0
                  ? Math.round((weakest.score / weakest.maxScore) * 100)
                  : 0;
                if (weakPct < 80) {
                  return (
                    <li>
                      大問{weakest.number}の得点率が{weakPct}%です。この大問のフィードバックを確認し、弱点を把握しましょう。
                    </li>
                  );
                }
                return null;
              })()}
              <li>
                <Link href={`/problem/${problemSetId}/history`} className="font-medium text-primary hover:underline">
                  解答履歴
                </Link>
                で過去のスコア推移を確認し、学習の進捗を把握しましょう。
              </li>
              <li>
                <Link href="/explore" className="font-medium text-primary hover:underline">
                  他の問題セット
                </Link>
                にも挑戦して、幅広い出題パターンに対応できるようにしましょう。
              </li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
