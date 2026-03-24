"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScoreComparisonAttempt {
  /** 1-based attempt number */
  attempt: number;
  /** Score as a percentage 0-100 */
  scorePercent: number;
  /** ISO date string */
  date: string;
}

export interface ScoreComparisonData {
  /** User's attempts sorted by attempt number ascending */
  userAttempts: ScoreComparisonAttempt[];
  /** Average score % across all students */
  allStudentAverage: number;
  /** Top 10% threshold score % */
  top10Threshold: number;
  /** User's percentile rank (0-100, higher = better) */
  percentileRank: number;
  /** Total number of submissions across all students */
  totalSubmissions: number;
}

interface ScoreComparisonProps {
  data: ScoreComparisonData | null;
}

// ─── SVG Chart Dimensions ────────────────────────────────────────────────────

const CHART = {
  width: 600,
  height: 280,
  padding: { top: 24, right: 24, bottom: 40, left: 48 },
} as const;

const plotW = CHART.width - CHART.padding.left - CHART.padding.right;
const plotH = CHART.height - CHART.padding.top - CHART.padding.bottom;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scaleX(index: number, count: number): number {
  if (count <= 1) return CHART.padding.left + plotW / 2;
  return CHART.padding.left + (index / (count - 1)) * plotW;
}

function scaleY(value: number): number {
  // value is 0-100, map to plot area (top = 100, bottom = 0)
  const clamped = Math.max(0, Math.min(100, value));
  return CHART.padding.top + plotH - (clamped / 100) * plotH;
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;

  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }
  return d;
}

function getPercentileBadgeVariant(rank: number) {
  if (rank >= 90) return "default" as const;
  if (rank >= 70) return "secondary" as const;
  return "outline" as const;
}

function getPercentileLabel(rank: number): string {
  if (rank >= 90) return "上位10%";
  if (rank >= 75) return "上位25%";
  if (rank >= 50) return "上位50%";
  return "下位50%";
}

// ─── Component ───────────────────────────────────────────────────────────────

const MIN_SUBMISSIONS_FOR_COMPARISON = 5;

export function ScoreComparison({ data }: ScoreComparisonProps) {
  if (!data || data.totalSubmissions < MIN_SUBMISSIONS_FOR_COMPARISON) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">スコア比較</CardTitle>
          <CardDescription>
            他の受験者との比較データ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <svg
                className="h-6 w-6 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3v18h18" />
                <path d="M7 16l4-8 4 4 4-6" />
              </svg>
            </div>
            <p className="text-sm font-medium">
              比較データがまだ十分ではありません
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              全体で{MIN_SUBMISSIONS_FOR_COMPARISON}件以上の提出があると比較データが表示されます
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <ScoreComparisonChart data={data} />;
}

function ScoreComparisonChart({ data }: { data: ScoreComparisonData }) {
  const { userAttempts, allStudentAverage, top10Threshold, percentileRank } =
    data;

  const chartPoints = useMemo(
    () =>
      userAttempts.map((a, i) => ({
        x: scaleX(i, userAttempts.length),
        y: scaleY(a.scorePercent),
        score: a.scorePercent,
        attempt: a.attempt,
      })),
    [userAttempts]
  );

  const avgY = scaleY(allStudentAverage);
  const topY = scaleY(top10Threshold);

  // Y-axis tick marks: 0, 25, 50, 75, 100
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">スコア比較</CardTitle>
            <CardDescription>
              あなたの推移と全体平均
            </CardDescription>
          </div>
          <Badge
            variant={getPercentileBadgeVariant(percentileRank)}
            className="shrink-0 text-xs"
          >
            {getPercentileLabel(percentileRank)} (上位{Math.max(1, 100 - percentileRank)}%)
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Chart */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${CHART.width} ${CHART.height}`}
            className="w-full"
            style={{ minWidth: 320 }}
            role="img"
            aria-label="スコア推移チャート"
          >
            {/* Grid lines */}
            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={CHART.padding.left}
                  y1={scaleY(tick)}
                  x2={CHART.width - CHART.padding.right}
                  y2={scaleY(tick)}
                  className="stroke-border"
                  strokeWidth={1}
                  strokeDasharray={tick === 0 || tick === 100 ? "0" : "4,4"}
                />
                <text
                  x={CHART.padding.left - 8}
                  y={scaleY(tick) + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[11px]"
                >
                  {tick}%
                </text>
              </g>
            ))}

            {/* X-axis labels */}
            {userAttempts.map((a, i) => (
              <text
                key={a.attempt}
                x={scaleX(i, userAttempts.length)}
                y={CHART.height - 8}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {a.attempt}回目
              </text>
            ))}

            {/* Top 10% threshold line */}
            <line
              x1={CHART.padding.left}
              y1={topY}
              x2={CHART.width - CHART.padding.right}
              y2={topY}
              className="stroke-primary/40"
              strokeWidth={1.5}
              strokeDasharray="6,4"
            />
            <text
              x={CHART.width - CHART.padding.right + 2}
              y={topY - 6}
              className="fill-primary/70 text-[10px] font-medium"
              textAnchor="end"
            >
              上位10% ({top10Threshold}%)
            </text>

            {/* All-student average line */}
            <line
              x1={CHART.padding.left}
              y1={avgY}
              x2={CHART.width - CHART.padding.right}
              y2={avgY}
              className="stroke-amber-500/60"
              strokeWidth={1.5}
              strokeDasharray="4,3"
            />
            <text
              x={CHART.width - CHART.padding.right + 2}
              y={avgY - 6}
              className="fill-amber-600 text-[10px] font-medium"
              textAnchor="end"
            >
              平均 ({allStudentAverage}%)
            </text>

            {/* User score line (smooth curve) */}
            {chartPoints.length > 1 && (
              <path
                d={buildSmoothPath(chartPoints)}
                fill="none"
                className="stroke-primary"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            )}

            {/* User score area fill */}
            {chartPoints.length > 1 && (
              <path
                d={`${buildSmoothPath(chartPoints)} L${chartPoints[chartPoints.length - 1].x},${scaleY(0)} L${chartPoints[0].x},${scaleY(0)} Z`}
                className="fill-primary/8"
              />
            )}

            {/* User score dots */}
            {chartPoints.map((pt) => (
              <g key={pt.attempt}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={4}
                  className="fill-primary stroke-card"
                  strokeWidth={2}
                />
                {/* Score label above dot */}
                <text
                  x={pt.x}
                  y={pt.y - 10}
                  textAnchor="middle"
                  className="fill-foreground text-[10px] font-semibold"
                >
                  {pt.score}%
                </text>
              </g>
            ))}

            {/* Single-point indicator (when only 1 attempt) */}
            {chartPoints.length === 1 && (
              <circle
                cx={chartPoints[0].x}
                cy={chartPoints[0].y}
                r={6}
                className="fill-primary/20 stroke-primary"
                strokeWidth={2}
              />
            )}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded bg-primary" />
            あなたのスコア
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded bg-amber-500/60" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 3px, var(--color-background) 3px, var(--color-background) 5px)" }} />
            全体平均
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded bg-primary/40" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 4px, var(--color-background) 4px, var(--color-background) 7px)" }} />
            上位10%ライン
          </div>
        </div>

        {/* Stats summary */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-muted/50 p-3 text-center">
            <p className="text-lg font-bold text-primary">
              {userAttempts[userAttempts.length - 1]?.scorePercent ?? 0}%
            </p>
            <p className="text-[11px] text-muted-foreground">最新スコア</p>
          </div>
          <div className="rounded-md bg-muted/50 p-3 text-center">
            <p className="text-lg font-bold">
              {Math.round(
                userAttempts.reduce((s, a) => s + a.scorePercent, 0) /
                  userAttempts.length
              )}
              %
            </p>
            <p className="text-[11px] text-muted-foreground">あなたの平均</p>
          </div>
          <div className="rounded-md bg-muted/50 p-3 text-center">
            <p className="text-lg font-bold">{allStudentAverage}%</p>
            <p className="text-[11px] text-muted-foreground">全体平均</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
