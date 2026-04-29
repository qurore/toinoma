"use client";

import { useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// useOnlineStatus — SSR-safe `navigator.onLine` hook
// ---------------------------------------------------------------------------
// Built on `useSyncExternalStore` for two reasons:
//   1. Concurrent React safety: tearing-free reads of an external value.
//   2. SSR safety: the server snapshot is a constant (true) so React's
//      hydration pass sees a stable value and skips spurious mismatches.
//
// We export `subscribe`, `getSnapshot`, and `getServerSnapshot` so unit
// tests can verify the contract without booting jsdom.
// ---------------------------------------------------------------------------

/**
 * Read the current online state. Defaults to `true` on the server or in any
 * environment where `window` is undefined — matching the browser default
 * before the first event fires.
 */
export function getSnapshot(): boolean {
  if (typeof window === "undefined") return true;
  // Some non-browser-like environments (older Node, edge runtimes) lack
  // navigator entirely. Treat as online — pessimistic offline UX would be
  // worse than a single failed save which the retry loop will recover.
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

/**
 * Server-side snapshot used during SSR/RSC streaming. Returns `true` so
 * the initial HTML never shows the offline banner.
 */
export function getServerSnapshot(): boolean {
  return true;
}

/**
 * Subscribe to browser online/offline events. The callback fires on EITHER
 * event — `getSnapshot` is responsible for determining the new value.
 */
export function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/**
 * React hook that returns whether the browser believes it's online.
 * Re-renders on every online/offline transition.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
