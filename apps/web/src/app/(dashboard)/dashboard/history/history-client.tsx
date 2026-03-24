"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  History,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Subject } from "@/types/database";

const ITEMS_PER_PAGE = 15;

// ─── Types ────────────────────────────────────────────────────────────

interface HistoryItem {
  id: string;
  problemSetId: string;
  title: string;
  subject: Subject | null;
  subjectLabel: string | null;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  createdAt: string;
}

interface SubjectOption {
  value: Subject;
  label: string;
}

type SortMode = "newest" | "oldest" | "score_high" | "score_low";
type ScoreRange = "all" | "high" | "mid" | "low";

interface SubmissionHistoryClientProps {
  items: HistoryItem[];
  subjectOptions: SubjectOption[];
}

// ─── Score trend mini chart — simple sparkline using SVG ──────────────

function ScoreTrendChart({ items }: { items: HistoryItem[] }) {
  // Take the last 10 submissions (oldest first for left-to-right display)
  const recent = items
    .filter((i) => i.percentage !== null)
    .slice(0, 10)
    .reverse();

  if (recent.length < 2) return null;

  const width = 200;
  const height = 48;
  const padding = 4;
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;

  const points = recent.map((item, i) => ({
    x: padding + (i / (recent.length - 1)) * drawWidth,
    y: padding + drawHeight - (drawHeight * (item.percentage ?? 0)) / 100,
  }));

  const pathData = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Determine trend direction
  const first = recent[0].percentage ?? 0;
  const last = recent[recent.length - 1].percentage ?? 0;
  const trending = last > first ? "up" : last < first ? "down" : "flat";

  return (
    <div className="flex items-center gap-2">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="rounded-md bg-muted/30"
      >
        <path
          d={pathData}
          fill="none"
          stroke={trending === "up" ? "hsl(var(--primary))" : trending === "down" ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))"}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dots on each point */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={2.5}
            fill={trending === "up" ? "hsl(var(--primary))" : trending === "down" ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))"}
          />
        ))}
      </svg>
      <div className="flex items-center gap-1 text-xs">
        {trending === "up" ? (
          <>
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-primary">上昇傾向</span>
          </>
        ) : trending === "down" ? (
          <>
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            <span className="font-medium text-destructive">下降傾向</span>
          </>
        ) : (
          <span className="text-muted-foreground">横ばい</span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────

export function SubmissionHistoryClient({
  items,
  subjectOptions,
}: SubmissionHistoryClientProps) {
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [scoreRange, setScoreRange] = useState<ScoreRange>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    let result = [...items];

    // Filter by subject
    if (subjectFilter !== "all") {
      result = result.filter((i) => i.subject === subjectFilter);
    }

    // Filter by score range
    if (scoreRange !== "all") {
      result = result.filter((i) => {
        if (i.percentage === null) return false;
        switch (scoreRange) {
          case "high":
            return i.percentage >= 80;
          case "mid":
            return i.percentage >= 50 && i.percentage < 80;
          case "low":
            return i.percentage < 50;
          default:
            return true;
        }
      });
    }

    // Sort
    switch (sortMode) {
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "oldest":
        result.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case "score_high":
        result.sort((a, b) => (b.percentage ?? -1) - (a.percentage ?? -1));
        break;
      case "score_low":
        result.sort((a, b) => (a.percentage ?? 101) - (b.percentage ?? 101));
        break;
    }

    return result;
  }, [items, subjectFilter, scoreRange, sortMode]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedItems = filtered.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  const handleSubjectChange = (v: string) => {
    setSubjectFilter(v);
    setCurrentPage(1);
  };
  const handleScoreRangeChange = (v: string) => {
    setScoreRange(v as ScoreRange);
    setCurrentPage(1);
  };
  const handleSortChange = (v: string) => {
    setSortMode(v as SortMode);
    setCurrentPage(1);
  };

  const isFilterActive =
    subjectFilter !== "all" || scoreRange !== "all" || sortMode !== "newest";

  const handleResetFilters = () => {
    setSubjectFilter("all");
    setScoreRange("all");
    setSortMode("newest");
    setCurrentPage(1);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">解答履歴</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length}件の解答
          </p>
        </div>

        {/* Score trend chart */}
        {items.length >= 2 && (
          <ScoreTrendChart items={items} />
        )}
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-[40vh] flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
              <History className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">
              最初の一歩を踏み出しましょう
            </h2>
            <p className="mb-2 max-w-md text-sm text-muted-foreground">
              問題セットを購入して解答を提出すると、AIが自動で採点し、ここにスコアと成績の推移が記録されます。
            </p>
            <p className="mb-8 max-w-md text-sm text-muted-foreground">
              解けば解くほど、自分の得意・苦手が見えてきます。
            </p>
            <Button asChild>
              <Link href="/explore">
                <Search className="mr-1.5 h-4 w-4" />
                問題を探す
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters row */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={subjectFilter}
                onValueChange={handleSubjectChange}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="科目で絞り込み" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての科目</SelectItem>
                  {subjectOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select
              value={scoreRange}
              onValueChange={handleScoreRangeChange}
            >
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="得点率" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての得点率</SelectItem>
                <SelectItem value="high">80%以上</SelectItem>
                <SelectItem value="mid">50%〜79%</SelectItem>
                <SelectItem value="low">50%未満</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select
                value={sortMode}
                onValueChange={handleSortChange}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">新しい順</SelectItem>
                  <SelectItem value="oldest">古い順</SelectItem>
                  <SelectItem value="score_high">得点率（高い順）</SelectItem>
                  <SelectItem value="score_low">得点率（低い順）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filtered.length !== items.length && (
              <span className="text-xs text-muted-foreground">
                {filtered.length}件表示中
              </span>
            )}

            {isFilterActive && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 px-2 text-xs text-muted-foreground"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                フィルターをリセット
              </Button>
            )}
          </div>

          {/* Submission list */}
          <div className="space-y-2">
            {paginatedItems.map((s) => {
              const date = new Date(s.createdAt).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <Link
                  key={s.id}
                  href={`/problem/${s.problemSetId}/result/${s.id}`}
                >
                  <Card className="transition-all hover:border-primary/20 hover:shadow-sm">
                    <CardContent className="flex items-center justify-between gap-4 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{s.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {s.subjectLabel && (
                            <Badge variant="secondary" className="border border-border text-xs">
                              {s.subjectLabel}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {date}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {s.score !== null && s.maxScore !== null && (
                          <span className="text-sm font-semibold tabular-nums">
                            {s.score} / {s.maxScore}
                          </span>
                        )}
                        {s.percentage !== null && (
                          <Badge
                            className={cn(
                              "min-w-[3rem] justify-center tabular-nums",
                              s.percentage >= 80
                                ? "bg-primary/10 text-primary border-primary/30"
                                : s.percentage >= 50
                                  ? "bg-warning/10 text-warning border-warning/30"
                                  : ""
                            )}
                            variant={
                              s.percentage >= 80
                                ? "default"
                                : s.percentage >= 50
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {s.percentage}%
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {filtered.length}件中{" "}
                {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}〜
                {Math.min(safeCurrentPage * ITEMS_PER_PAGE, filtered.length)}
                件を表示
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    // Show first, last, and pages around current
                    if (page === 1 || page === totalPages) return true;
                    return Math.abs(page - safeCurrentPage) <= 1;
                  })
                  .map((page, idx, arr) => {
                    // Insert ellipsis markers
                    const prev = arr[idx - 1];
                    const showEllipsis = prev !== undefined && page - prev > 1;
                    return (
                      <span key={page} className="flex items-center">
                        {showEllipsis && (
                          <span className="px-1 text-xs text-muted-foreground">
                            ...
                          </span>
                        )}
                        <Button
                          variant={
                            page === safeCurrentPage ? "default" : "outline"
                          }
                          size="sm"
                          className="h-8 w-8 p-0 text-xs"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      </span>
                    );
                  })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
