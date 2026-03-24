"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SUBJECT_LABELS } from "@toinoma/shared/constants";
import type { Subject } from "@/types/database";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SubjectScore {
  subject: Subject;
  averagePercent: number;
  count: number;
}

interface SubjectRadarProps {
  subjects: SubjectScore[];
}

// ─── Radar Chart Constants ───────────────────────────────────────────────────

const RADAR = {
  size: 300,
  cx: 150,
  cy: 150,
  maxRadius: 110,
  rings: [25, 50, 75, 100],
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number
): { x: number; y: number } {
  // Start from top (270 deg in standard math) and go clockwise
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function buildRadarPath(
  values: number[],
  cx: number,
  cy: number,
  maxRadius: number
): string {
  const count = values.length;
  if (count === 0) return "";

  const angleStep = 360 / count;
  const points = values.map((v, i) => {
    const radius = (v / 100) * maxRadius;
    return polarToCartesian(cx, cy, radius, i * angleStep);
  });

  return (
    points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") +
    " Z"
  );
}

// ─── Bar Chart (Fallback for < 3 subjects) ───────────────────────────────────

function SubjectBarChart({ subjects }: { subjects: SubjectScore[] }) {
  return (
    <div className="space-y-3">
      {subjects.map((s) => (
        <div key={s.subject} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{SUBJECT_LABELS[s.subject]}</span>
            <span className="text-muted-foreground">
              {s.averagePercent}% ({s.count}回)
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                s.averagePercent >= 80
                  ? "bg-primary"
                  : s.averagePercent >= 50
                    ? "bg-warning"
                    : "bg-destructive"
              )}
              style={{ width: `${s.averagePercent}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SubjectRadar({ subjects }: SubjectRadarProps) {
  const sorted = useMemo(
    () => [...subjects].sort((a, b) => b.averagePercent - a.averagePercent),
    [subjects]
  );

  if (subjects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">科目別パフォーマンス</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              採点結果がまだありません
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fewer than 3 subjects: show bar chart instead of radar
  if (subjects.length < 3) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">科目別パフォーマンス</CardTitle>
        </CardHeader>
        <CardContent>
          <SubjectBarChart subjects={sorted} />
          <p className="mt-4 text-center text-xs text-muted-foreground">
            3科目以上の学習でレーダーチャートが表示されます
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">科目別パフォーマンス</CardTitle>
      </CardHeader>
      <CardContent>
        <RadarChart subjects={sorted} />
      </CardContent>
    </Card>
  );
}

// ─── Radar Chart SVG ─────────────────────────────────────────────────────────

function RadarChart({ subjects }: { subjects: SubjectScore[] }) {
  const { cx, cy, maxRadius, rings, size } = RADAR;
  const count = subjects.length;
  const angleStep = 360 / count;

  const radarPath = useMemo(
    () =>
      buildRadarPath(
        subjects.map((s) => s.averagePercent),
        cx,
        cy,
        maxRadius
      ),
    [subjects, cx, cy, maxRadius]
  );

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[300px]"
        role="img"
        aria-label="科目別レーダーチャート"
      >
        {/* Concentric ring backgrounds */}
        {rings
          .slice()
          .reverse()
          .map((ring) => {
            const r = (ring / 100) * maxRadius;
            return (
              <circle
                key={ring}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                className="stroke-border"
                strokeWidth={1}
              />
            );
          })}

        {/* Ring percentage labels */}
        {rings.map((ring) => {
          const y = cy - (ring / 100) * maxRadius;
          return (
            <text
              key={ring}
              x={cx + 4}
              y={y - 3}
              className="fill-muted-foreground text-[9px]"
            >
              {ring}%
            </text>
          );
        })}

        {/* Axis lines from center to each vertex */}
        {subjects.map((_, i) => {
          const p = polarToCartesian(cx, cy, maxRadius, i * angleStep);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              className="stroke-border"
              strokeWidth={1}
            />
          );
        })}

        {/* Filled radar area */}
        <path d={radarPath} className="fill-primary/15 stroke-primary" strokeWidth={2} />

        {/* Data point dots */}
        {subjects.map((s, i) => {
          const r = (s.averagePercent / 100) * maxRadius;
          const p = polarToCartesian(cx, cy, r, i * angleStep);
          return (
            <circle
              key={s.subject}
              cx={p.x}
              cy={p.y}
              r={3.5}
              className="fill-primary stroke-card"
              strokeWidth={2}
            />
          );
        })}

        {/* Subject labels positioned outside the chart */}
        {subjects.map((s, i) => {
          const labelRadius = maxRadius + 22;
          const p = polarToCartesian(cx, cy, labelRadius, i * angleStep);
          // Determine text-anchor based on position
          const angle = i * angleStep;
          const anchor =
            angle > 45 && angle < 135
              ? "start"
              : angle > 225 && angle < 315
                ? "end"
                : "middle";
          const dy = angle > 135 && angle < 225 ? 12 : angle < 45 || angle > 315 ? -4 : 4;

          return (
            <text
              key={s.subject}
              x={p.x}
              y={p.y + dy}
              textAnchor={anchor}
              className="fill-foreground text-[11px] font-medium"
            >
              {SUBJECT_LABELS[s.subject]}
            </text>
          );
        })}
      </svg>

      {/* Subject score summary below chart */}
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {subjects.map((s) => (
          <div
            key={s.subject}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            {SUBJECT_LABELS[s.subject]}:{" "}
            <span className="font-semibold text-foreground">
              {s.averagePercent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
