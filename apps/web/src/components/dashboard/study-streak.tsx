"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StudyStreakData {
  /** Map of "YYYY-MM-DD" to submission count for that day */
  dailyCounts: Record<string, number>;
  /** Current streak in consecutive days */
  currentStreak: number;
  /** Longest streak in consecutive days */
  longestStreak: number;
}

interface StudyStreakProps {
  data: StudyStreakData;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const WEEKS_TO_SHOW = 12;
const DAYS_IN_WEEK = 7;
const CELL_SIZE = 14;
const CELL_GAP = 3;
const DAY_LABELS = ["月", "", "水", "", "金", "", ""];
const MONTH_FORMAT = new Intl.DateTimeFormat("ja", { month: "short" });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getIntensityLevel(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

const INTENSITY_CLASSES: Record<number, string> = {
  0: "bg-muted",
  1: "bg-primary/25",
  2: "bg-primary/45",
  3: "bg-primary/70",
  4: "bg-primary",
};

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StudyStreak({ data }: StudyStreakProps) {
  const { dailyCounts, currentStreak, longestStreak } = data;

  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const todayStr = formatDate(today);

    // Build grid: 12 weeks ending on this week's Saturday
    // Each week: Monday=0, ..., Sunday=6
    const dayOfWeek = (today.getDay() + 6) % 7; // Monday=0 based
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (6 - dayOfWeek)); // End of this week (Sunday)
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - WEEKS_TO_SHOW * DAYS_IN_WEEK + 1);

    const weeks: { date: string; count: number; isToday: boolean }[][] = [];
    const monthLabels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    const cursor = new Date(startDate);
    for (let w = 0; w < WEEKS_TO_SHOW; w++) {
      const week: { date: string; count: number; isToday: boolean }[] = [];
      for (let d = 0; d < DAYS_IN_WEEK; d++) {
        const dateStr = formatDate(cursor);
        const isFuture = cursor > today;
        week.push({
          date: dateStr,
          count: isFuture ? -1 : (dailyCounts[dateStr] ?? 0),
          isToday: dateStr === todayStr,
        });

        // Track month boundaries
        if (d === 0 && cursor.getMonth() !== lastMonth) {
          lastMonth = cursor.getMonth();
          monthLabels.push({
            label: MONTH_FORMAT.format(cursor),
            weekIndex: w,
          });
        }

        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    return { weeks, monthLabels, todayStr };
  }, [dailyCounts]);

  const totalSubmissions = Object.values(dailyCounts).reduce(
    (sum, c) => sum + c,
    0
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">学習カレンダー</CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">
                {currentStreak}
              </span>
              日連続
            </span>
            <span>
              最長{" "}
              <span className="font-semibold text-foreground">
                {longestStreak}
              </span>
              日
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <div className="inline-block">
            {/* Month labels row */}
            <div
              className="flex"
              style={{
                marginLeft: 28,
                height: 16,
              }}
            >
              {monthLabels.map((ml) => (
                <span
                  key={`${ml.label}-${ml.weekIndex}`}
                  className="text-[10px] text-muted-foreground"
                  style={{
                    position: "relative",
                    left: ml.weekIndex * (CELL_SIZE + CELL_GAP),
                  }}
                >
                  {ml.label}
                </span>
              ))}
            </div>

            {/* Grid */}
            <div className="flex gap-0.5">
              {/* Day labels column */}
              <div
                className="flex flex-col"
                style={{ gap: CELL_GAP, width: 24 }}
              >
                {DAY_LABELS.map((label, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-end text-[10px] text-muted-foreground"
                    style={{ height: CELL_SIZE }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Week columns */}
              <div className="flex" style={{ gap: CELL_GAP }}>
                {weeks.map((week, wi) => (
                  <div
                    key={wi}
                    className="flex flex-col"
                    style={{ gap: CELL_GAP }}
                  >
                    {week.map((day) => (
                      <div
                        key={day.date}
                        className={cn(
                          "rounded-sm transition-colors",
                          day.count === -1
                            ? "bg-transparent"
                            : INTENSITY_CLASSES[getIntensityLevel(day.count)],
                          day.isToday &&
                            "ring-2 ring-primary/50 ring-offset-1 ring-offset-card"
                        )}
                        style={{
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                        }}
                        title={
                          day.count >= 0
                            ? `${day.date}: ${day.count}件`
                            : undefined
                        }
                        role="gridcell"
                        aria-label={
                          day.count >= 0
                            ? `${day.date} ${day.count}件の提出`
                            : undefined
                        }
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                過去12週間で
                <span className="mx-1 font-semibold text-foreground">
                  {totalSubmissions}
                </span>
                件提出
              </p>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>少</span>
                {[0, 1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={cn("rounded-sm", INTENSITY_CLASSES[level])}
                    style={{ width: 10, height: 10 }}
                  />
                ))}
                <span>多</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
