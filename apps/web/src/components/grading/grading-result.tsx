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
  CheckCircle2,
  XCircle,
  AlertCircle,
  MinusCircle,
  RotateCcw,
  Eye,
  Share2,
  AlertTriangle,
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

  const Icon =
    ratio >= 1 ? CheckCircle2 : ratio > 0 ? MinusCircle : XCircle;
  const iconClass =
    color === "success"
      ? "text-success"
      : color === "amber"
        ? "text-amber-500"
        : "text-destructive";

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border p-3",
        color === "success"
          ? "border-success/20 bg-success/5"
          : color === "amber"
            ? "border-amber-500/20 bg-amber-50"
            : "border-destructive/20 bg-destructive/5"
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} />
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
                  className="space-y-3 rounded-lg border border-border p-4"
                >
                  {/* Question header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {question.number}
                      </span>
                      <div
                        className={cn(
                          "flex h-5 items-center rounded-full px-2 text-[10px] font-semibold",
                          qColors.bg,
                          qColors.text
                        )}
                      >
                        {qPct}%
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {question.score} / {question.maxScore}
                    </span>
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
        <Check className="mr-1.5 h-3.5 w-3.5" />
      ) : (
        <Share2 className="mr-1.5 h-3.5 w-3.5" />
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
      <Card className={cn("ring-2", colors.ring)}>
        <CardHeader className="text-center">
          {/* Score circle */}
          <div
            className={cn(
              "mx-auto mb-2 flex h-24 w-24 items-center justify-center rounded-full",
              colors.bg
            )}
          >
            <span className={cn("text-3xl font-bold", colors.text)}>
              {percentage}%
            </span>
          </div>
          <CardTitle className="text-xl">
            {result.totalScore} / {result.maxScore} 点
          </CardTitle>

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
        </CardHeader>
        <CardContent>
          <ScoreBar score={result.totalScore} maxScore={result.maxScore} />
        </CardContent>
      </Card>

      {/* AI grading disclaimer banner */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-xs leading-relaxed text-amber-800">
          AI採点は参考スコアです。最終判断はご自身で行ってください。ルーブリックに基づく自動採点のため、実際の採点と異なる場合があります。
        </p>
      </div>

      {/* Overall feedback */}
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
              <RotateCcw className="mr-1.5 h-4 w-4" />
              もう一度解く
            </Link>
          </Button>
          <Button variant="outline" className="flex-1" asChild>
            <Link href={`/problem/${problemSetId}/history`}>
              <Eye className="mr-1.5 h-4 w-4" />
              解答を確認
            </Link>
          </Button>
          <ShareResultButton result={result} problemSetId={problemSetId} />
        </div>
      )}
    </div>
  );
}
