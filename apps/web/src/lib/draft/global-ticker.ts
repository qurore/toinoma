"use client";

import { useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// global-ticker — shared 1-second tick (TDD §7.4)
// ---------------------------------------------------------------------------
// Components that show a relative-time label ("3秒前") need to re-render
// roughly once per second. Running an independent `setInterval` per
// component scales linearly with the number of relative-time spans on the
// page (typical solve page: ~10) and produces noticeable jank under React
// Concurrent Mode, since each interval fires on its own microtask.
//
// This module exposes a SINGLE module-scoped interval that all subscribers
// share via `useSyncExternalStore`. The interval is refcount-driven:
//   - First `subscribe` → start the interval
//   - Last `unsubscribe` → clear the interval
//   - The exposed `tick` value is monotonically increasing while at least
//     one subscriber is alive.
// ---------------------------------------------------------------------------

const TICK_INTERVAL_MS = 1_000;

let tick = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function startInterval(): void {
  if (intervalId !== null) return;
  intervalId = setInterval(() => {
    tick += 1;
    // Snapshot the listener set so a callback unsubscribing during
    // iteration cannot mutate the structure we're walking.
    Array.from(listeners).forEach((listener) => listener());
  }, TICK_INTERVAL_MS);
}

function stopInterval(): void {
  if (intervalId === null) return;
  clearInterval(intervalId);
  intervalId = null;
}

/**
 * Read the current tick count. Returns 0 before the first tick fires.
 * Used by `useSyncExternalStore` as the client snapshot.
 */
export function getSnapshot(): number {
  return tick;
}

/**
 * SSR snapshot — always 0 so the initial HTML matches the first client
 * render and React skips a hydration-mismatch warning.
 */
export function getServerSnapshot(): number {
  return 0;
}

/**
 * Subscribe to global ticks. The first subscribe starts the underlying
 * `setInterval`; the last unsubscribe clears it.
 */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    startInterval();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopInterval();
    }
  };
}

/**
 * React hook that returns the current global tick count. The component
 * re-renders once per second while it (or any other consumer) is mounted.
 */
export function useGlobalTick(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
