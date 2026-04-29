"use client";

import { memo } from "react";
import {
  AlertTriangle,
  Check,
  Loader2,
  RefreshCw,
  RotateCw,
  WifiOff,
} from "lucide-react";

import { useGlobalTick } from "@/lib/draft/global-ticker";
import { formatRelativeTimeJa } from "@/lib/draft/format-relative-time";
import type { DraftState } from "@/lib/draft/save-state-machine";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// AutoSaveIndicator (TDD §8)
// ---------------------------------------------------------------------------
// 7-state visual indicator for the draft autosave pipeline. Renders nothing
// when idle. Each state pairs an icon, a Japanese label, and a color cue —
// color is never the sole signal (WCAG 2.1 AA — 1.4.1 Use of Color).
//
// Two regions:
//   - aria-hidden visual span: contains the icon + ticking relative-time
//   - sr-only aria-live="polite" span: announces only on state transition
//
// Single-instance ownership: the canonical (header) instance sets
// `ownsAriaLive={true}`; secondary placements pass `false` so screen
// readers hear the announcement once.
// ---------------------------------------------------------------------------

export type IconKey =
  | "loader"
  | "check"
  | "rotate"
  | "wifi-off"
  | "refresh"
  | "alert"
  | null;

export interface AutoSavePresentation {
  iconKey: IconKey;
  visibleText: string;
  ariaText: string;
  toneClass: string;
  showRetryButton: boolean;
}

export interface AutoSaveIndicatorProps {
  state: DraftState;
  /** Click handler for the manual "再試行" button shown in the error state. */
  onRetry?: () => void;
  /** Whether this instance owns the aria-live region. Exactly one true per page. */
  ownsAriaLive?: boolean;
}

/**
 * Pure presentation derivation — exported so it can be unit-tested in a
 * node-only Vitest environment (jsdom + @testing-library has an ESM
 * incompatibility in this monorepo). The component itself maps `iconKey`
 * to the actual lucide React node at render time.
 */
export function derivePresentation(
  state: DraftState,
  relativeTime: string
): AutoSavePresentation {
  switch (state.status) {
    case "saving":
      return {
        iconKey: "loader",
        visibleText: "保存中…",
        ariaText: "下書きを保存しています",
        toneClass: "text-muted-foreground",
        showRetryButton: false,
      };
    case "saved":
      return {
        iconKey: "check",
        visibleText: state.lastSavedAt
          ? `保存済み · ${relativeTime}`
          : "保存済み",
        ariaText: "下書きが保存されました",
        toneClass: "text-success",
        showRetryButton: false,
      };
    case "retrying": {
      const seconds = Math.max(0, Math.ceil(state.nextRetryDelayMs / 1000));
      return {
        iconKey: "rotate",
        visibleText: `再送信中 (${state.attempt}/5) · ${seconds}秒後に再試行`,
        ariaText: `保存を再試行しています。${state.attempt}回目。`,
        toneClass: "text-amber-600",
        showRetryButton: false,
      };
    }
    case "offline":
      return {
        iconKey: "wifi-off",
        visibleText: "オフライン中 · 復旧時に自動同期",
        ariaText:
          "現在オフラインです。オンラインに戻り次第、自動で同期します。",
        toneClass: "text-amber-600",
        showRetryButton: false,
      };
    case "syncing":
      return {
        iconKey: "refresh",
        visibleText: "同期中…",
        ariaText: "オフライン中の変更を同期しています",
        toneClass: "text-primary",
        showRetryButton: false,
      };
    case "error":
      return {
        iconKey: "alert",
        visibleText: "保存に失敗しました",
        ariaText:
          "下書きの保存に失敗しました。再試行ボタンを押してください。",
        toneClass: "text-destructive",
        showRetryButton: true,
      };
    case "idle":
    default:
      return {
        iconKey: null,
        visibleText: "",
        ariaText: "",
        toneClass: "",
        showRetryButton: false,
      };
  }
}

function renderIcon(iconKey: IconKey): React.ReactNode {
  switch (iconKey) {
    case "loader":
      return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
    case "check":
      return <Check className="h-3.5 w-3.5" />;
    case "rotate":
      return <RotateCw className="h-3.5 w-3.5 animate-spin" />;
    case "wifi-off":
      return <WifiOff className="h-3.5 w-3.5" />;
    case "refresh":
      return <RefreshCw className="h-3.5 w-3.5 animate-spin" />;
    case "alert":
      return <AlertTriangle className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

function AutoSaveIndicatorImpl({
  state,
  onRetry,
  ownsAriaLive = true,
}: AutoSaveIndicatorProps) {
  // Subscribe to the shared 1Hz ticker so the relative-time text re-derives
  // each second. The tick value itself is unused — its purpose is the
  // re-render trigger via useSyncExternalStore.
  const tick = useGlobalTick();

  if (state.status === "idle") {
    return null;
  }

  // The tick is read above so the linter is satisfied that this render
  // depends on the external store. Date.now() is intentional here — the
  // indicator must reflect wall-clock time relative to lastSavedAt, and
  // the tick subscription guarantees the re-read happens on schedule.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now() + tick * 0;
  const elapsed =
    state.lastSavedAt !== null ? nowMs - new Date(state.lastSavedAt).getTime() : 0;
  const relativeTime = formatRelativeTimeJa(elapsed);
  const cells = derivePresentation(state, relativeTime);

  return (
    <div
      data-state={state.status}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors duration-200",
        cells.toneClass
      )}
    >
      <span aria-hidden="true" className="inline-flex items-center gap-1.5">
        {renderIcon(cells.iconKey)}
        <span>{cells.visibleText}</span>
      </span>
      {cells.showRetryButton && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="ml-1 rounded-sm border border-current px-1.5 py-0.5 text-[11px] font-medium hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          再試行
        </button>
      ) : null}
      {ownsAriaLive ? (
        <span
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {cells.ariaText}
        </span>
      ) : null}
    </div>
  );
}

export const AutoSaveIndicator = memo(AutoSaveIndicatorImpl, (prev, next) => {
  if (prev.state.status !== next.state.status) return false;
  if (prev.state.lastSavedAt !== next.state.lastSavedAt) return false;
  if (prev.state.attempt !== next.state.attempt) return false;
  if (prev.state.nextRetryDelayMs !== next.state.nextRetryDelayMs) return false;
  if (prev.ownsAriaLive !== next.ownsAriaLive) return false;
  if (prev.onRetry !== next.onRetry) return false;
  // Tick-only re-renders pass through useGlobalTick subscription.
  return true;
});
