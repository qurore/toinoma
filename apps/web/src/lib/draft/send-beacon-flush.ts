// ---------------------------------------------------------------------------
// flushDraftToServer — best-effort page-unload draft flush (TDD §7.5)
// ---------------------------------------------------------------------------
// Called from `pagehide` / `visibilitychange === "hidden"` handlers when the
// user is about to leave the page. The browser will typically tear down
// pending XHRs and fetch requests during navigation, so we MUST use one of
// the platform's "survive unload" primitives:
//
//   1. `navigator.sendBeacon` — fire-and-forget POST that the user agent
//      promises to deliver after the document is gone. Returns false if
//      its internal queue is full.
//   2. `fetch(..., { keepalive: true })` — same intent at the fetch layer.
//      Less battle-tested than sendBeacon but available everywhere fetch
//      is, including environments where sendBeacon was deprecated.
//
// The function returns `true` if the request was queued (it does NOT mean
// the server accepted it — the page may already be gone by the time the
// network call lands). Returns `false` if BOTH paths failed, in which
// case the caller may surface a "draft may not have saved" warning.
// ---------------------------------------------------------------------------

import type { DraftAnswersMap } from "@toinoma/shared/schemas";

export interface DraftFlushPayload {
  problemSetId: string;
  answers: DraftAnswersMap;
}

const DRAFT_ENDPOINT = "/api/draft";

export function flushDraftToServer(payload: DraftFlushPayload): boolean {
  const body = JSON.stringify(payload);

  // ── Path 1: sendBeacon ──────────────────────────────────────────────
  // sendBeacon may be missing entirely (Node/SSR, some embedded WebViews,
  // CSP restrictions). Guard before calling.
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function"
  ) {
    try {
      const blob = new Blob([body], { type: "application/json" });
      const queued = navigator.sendBeacon(DRAFT_ENDPOINT, blob);
      if (queued) return true;
      // sendBeacon returned false (queue full) — fall through to fetch.
    } catch {
      // Some platforms throw on certain blob types — fall through to fetch.
    }
  }

  // ── Path 2: keepalive fetch fallback ───────────────────────────────
  if (typeof fetch !== "function") {
    return false;
  }

  try {
    void fetch(DRAFT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Best-effort flush — swallow errors so we don't surface a fetch
      // rejection in the about-to-unload page (uncaught rejections during
      // unload are noisy and unactionable).
    });
    return true;
  } catch {
    return false;
  }
}
