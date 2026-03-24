"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { FileText, Edit3, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const MIN_DIVIDER_PCT = 25;
const MAX_DIVIDER_PCT = 75;
const DEFAULT_DIVIDER_PCT = 50;

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface SplitSolveLayoutProps {
  problemSheet: React.ReactNode;
  answerSheet: React.ReactNode;
  header: React.ReactNode;
  footer: React.ReactNode;
  /** Optional badge count shown on the answer tab (e.g. answered/total) */
  answerBadge?: string;
}

// ──────────────────────────────────────────────
// Resizable divider
// ──────────────────────────────────────────────

const KEYBOARD_STEP = 5;

function ResizableDivider({
  onPositionChange,
  currentPosition,
}: {
  onPositionChange: (pct: number) => void;
  currentPosition: number;
}) {
  const isDragging = useRef(false);
  const dividerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      let next: number | null = null;

      switch (e.key) {
        case "ArrowLeft":
          next = Math.max(MIN_DIVIDER_PCT, currentPosition - KEYBOARD_STEP);
          break;
        case "ArrowRight":
          next = Math.min(MAX_DIVIDER_PCT, currentPosition + KEYBOARD_STEP);
          break;
        case "Home":
          next = DEFAULT_DIVIDER_PCT;
          break;
        default:
          return;
      }

      e.preventDefault();
      onPositionChange(next);
    },
    [currentPosition, onPositionChange]
  );

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const container = dividerRef.current?.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      onPositionChange(
        Math.min(MAX_DIVIDER_PCT, Math.max(MIN_DIVIDER_PCT, pct))
      );
    };

    const handlePointerUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [onPositionChange]);

  return (
    <div
      ref={dividerRef}
      tabIndex={0}
      className="group relative z-10 flex w-2 shrink-0 cursor-col-resize items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      role="separator"
      aria-orientation="vertical"
      aria-label="パネルサイズ変更"
      aria-valuenow={Math.round(currentPosition)}
      aria-valuemin={MIN_DIVIDER_PCT}
      aria-valuemax={MAX_DIVIDER_PCT}
    >
      {/* Visible rail */}
      <div className="h-full w-px bg-border transition-colors group-hover:w-0.5 group-hover:bg-primary/50" />
      {/* Grip indicator */}
      <div className="absolute flex h-8 w-5 items-center justify-center rounded-md border border-border bg-card opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────

export function SplitSolveLayout({
  problemSheet,
  answerSheet,
  header,
  footer,
  answerBadge,
}: SplitSolveLayoutProps) {
  const [activeTab, setActiveTab] = useState<"problem" | "answer">("problem");
  const [dividerPct, setDividerPct] = useState(DEFAULT_DIVIDER_PCT);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card px-4 py-2">
        {header}
      </div>

      {/* ── Mobile: tab toggle ── */}
      <div className="flex shrink-0 border-b border-border bg-card md:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("problem")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-sm font-medium transition-colors",
            activeTab === "problem"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <FileText className="h-4 w-4" />
          問題文
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("answer")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-sm font-medium transition-colors",
            activeTab === "answer"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Edit3 className="h-4 w-4" />
          解答
          {answerBadge && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
              {answerBadge}
            </span>
          )}
        </button>
      </div>

      {/* ── Mobile: content ── */}
      <div className="flex flex-1 overflow-hidden md:hidden">
        <div
          className={cn(
            "w-full overflow-y-auto",
            activeTab !== "problem" && "hidden"
          )}
        >
          {problemSheet}
        </div>
        <div
          className={cn(
            "w-full overflow-y-auto",
            activeTab !== "answer" && "hidden"
          )}
        >
          {answerSheet}
        </div>
      </div>

      {/* ── Desktop: side-by-side with resizable divider ── */}
      <div className="hidden flex-1 overflow-hidden md:flex">
        {/* Problem sheet (left pane) */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ width: `${dividerPct}%` }}
        >
          {/* Pane label */}
          <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-border bg-muted/40 px-3">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              問題用紙
            </span>
          </div>
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">{problemSheet}</div>
        </div>

        {/* Resizable divider */}
        <ResizableDivider onPositionChange={setDividerPct} currentPosition={dividerPct} />

        {/* Answer sheet (right pane) */}
        <div
          className="flex min-w-0 flex-col overflow-hidden"
          style={{ width: `${100 - dividerPct}%` }}
        >
          {/* Pane label */}
          <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-border bg-muted/40 px-3">
            <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              解答用紙
            </span>
            {answerBadge && (
              <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
                {answerBadge}
              </span>
            )}
          </div>
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">{answerSheet}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border bg-card px-4 py-2">
        {footer}
      </div>
    </div>
  );
}
