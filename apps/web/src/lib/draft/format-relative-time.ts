// ---------------------------------------------------------------------------
// Japanese relative-time formatter for autosave-status badges.
// Pure function — no globals, no I/O. Safe for Server Components and Edge.
// ---------------------------------------------------------------------------
// The output is a short, human-readable string indicating how long ago an
// event happened. Buckets are coarse on purpose: a relative time that
// updates every second feels jittery, so we step at 5s / 1min / 1h / 1day.
//
// Boundary table (per TDD §7.3):
//   elapsed <    5_000ms → 「たった今」 (just now)
//   elapsed <   60_000ms → 「N秒前」  (N seconds ago)
//   elapsed < 3_600_000ms → 「N分前」  (N minutes ago)
//   elapsed < 86_400_000ms → 「N時間前」 (N hours ago)
//   elapsed >= 86_400_000ms → 「N日前」  (N days ago)
// ---------------------------------------------------------------------------

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const JUST_NOW_THRESHOLD_MS = 5 * SECOND_MS;

/**
 * Format a millisecond elapsed duration as a Japanese relative-time string.
 *
 * Negative inputs (caused by clock skew between client and server) are
 * treated as "just now" rather than throwing — autosave UI must never
 * surface clock-skew bugs to the user.
 */
export function formatRelativeTimeJa(elapsedMs: number): string {
  if (elapsedMs < JUST_NOW_THRESHOLD_MS) return "たった今";
  if (elapsedMs < MINUTE_MS) return `${Math.floor(elapsedMs / SECOND_MS)}秒前`;
  if (elapsedMs < HOUR_MS) return `${Math.floor(elapsedMs / MINUTE_MS)}分前`;
  if (elapsedMs < DAY_MS) return `${Math.floor(elapsedMs / HOUR_MS)}時間前`;
  return `${Math.floor(elapsedMs / DAY_MS)}日前`;
}

/**
 * Tick interval for components that re-render relative-time labels.
 * 30s strikes a balance between perceived freshness and render cost; the
 * value is exported so tests and consumers stay in sync.
 */
export const RELATIVE_TIME_TICK_MS = 30_000;
