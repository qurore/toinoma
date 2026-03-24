"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SUBJECT_LABELS } from "@toinoma/shared/constants";
import type { Subject } from "@/types/database";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SubjectAnalysis {
  subject: Subject;
  averagePercent: number;
  /** Trend direction: positive = improving, negative = declining, zero = stable */
  trend: number;
  count: number;
}

interface StrengthsWeaknessesProps {
  subjects: SubjectAnalysis[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_SUBMISSIONS = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TrendIndicator({ trend }: { trend: number }) {
  if (Math.abs(trend) < 2) {
    return (
      <span className="flex items-center gap-0.5 text-muted-foreground" title="安定">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          className="text-muted-foreground"
        >
          <line
            x1="2"
            y1="7"
            x2="12"
            y2="7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-[10px]">安定</span>
      </span>
    );
  }

  if (trend > 0) {
    return (
      <span className="flex items-center gap-0.5 text-primary" title="上昇傾向">
        <svg width="14" height="14" viewBox="0 0 14 14" className="text-primary">
          <path
            d="M2 10L7 4L12 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-[10px]">上昇</span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-0.5 text-destructive" title="下降傾向">
      <svg width="14" height="14" viewBox="0 0 14 14" className="text-destructive">
        <path
          d="M2 4L7 10L12 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[10px]">下降</span>
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[3rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold",
        score >= 80
          ? "bg-primary/10 text-primary"
          : score >= 50
            ? "bg-amber-500/10 text-amber-600"
            : "bg-destructive/10 text-destructive"
      )}
    >
      {score}%
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StrengthsWeaknesses({ subjects }: StrengthsWeaknessesProps) {
  const totalSubmissions = subjects.reduce((sum, s) => sum + s.count, 0);

  if (totalSubmissions < MIN_SUBMISSIONS || subjects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">得意・苦手分析</CardTitle>
          <CardDescription>
            科目ごとの強みと弱みを分析
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {MIN_SUBMISSIONS}回以上の採点結果があると分析が表示されます
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...subjects].sort(
    (a, b) => b.averagePercent - a.averagePercent
  );
  const strengths = sorted.slice(0, 3);
  const weaknesses = sorted.length > 3
    ? sorted.slice(-3).reverse()
    : sorted.length > 1
      ? sorted.slice(-Math.min(sorted.length - 1, 3)).reverse()
      : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">得意・苦手分析</CardTitle>
        <CardDescription>
          科目ごとの強みと弱みを分析
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Strengths */}
          <div>
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-primary">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                className="text-primary"
              >
                <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M5 8l2 2 4-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              得意科目
            </h3>
            <div className="space-y-2">
              {strengths.map((s, i) => (
                <div
                  key={s.subject}
                  className="flex items-center justify-between rounded-md border border-primary/10 bg-primary/5 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">
                      {SUBJECT_LABELS[s.subject]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendIndicator trend={s.trend} />
                    <ScoreBadge score={s.averagePercent} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weaknesses */}
          <div>
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-destructive">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                className="text-destructive"
              >
                <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M5 5l6 6M11 5l-6 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              苦手科目
            </h3>
            {weaknesses.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                2科目以上の学習で表示されます
              </p>
            ) : (
              <div className="space-y-2">
                {weaknesses.map((s, i) => (
                  <div
                    key={s.subject}
                    className="flex items-center justify-between rounded-md border border-destructive/10 bg-destructive/5 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10 text-[10px] font-bold text-destructive">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium">
                        {SUBJECT_LABELS[s.subject]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendIndicator trend={s.trend} />
                      <ScoreBadge score={s.averagePercent} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Improvement suggestion */}
        {weaknesses.length > 0 && (
          <div className="mt-5 rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {SUBJECT_LABELS[weaknesses[0].subject]}
              </span>
              の正答率が最も低くなっています。
              {weaknesses[0].trend < -2
                ? "最近のスコアが下降傾向にあるため、基礎から復習することをおすすめします。"
                : weaknesses[0].trend > 2
                  ? "上昇傾向にあるので、この調子で学習を続けましょう。"
                  : "集中的に学習することで改善が期待できます。"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
