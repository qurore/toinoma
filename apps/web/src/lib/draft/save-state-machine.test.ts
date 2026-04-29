// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  draftReducer,
  initialDraftState,
  type DraftState,
  type DraftAction,
  type DraftStatus,
} from "./save-state-machine";

// ---------------------------------------------------------------------------
// Save-state-machine (TDD §7.6 / §8.2)
// ---------------------------------------------------------------------------
// 7 states: idle | saving | saved | retrying | offline | syncing | error
// 8 actions:
//   SAVE_START, SAVE_SUCCESS, SAVE_RETRY, SAVE_ERROR,
//   WENT_OFFLINE, CAME_ONLINE_WITH_PENDING, CAME_ONLINE_NO_PENDING,
//   RESET_TO_SAVED
// ---------------------------------------------------------------------------

function runReducer(state: DraftState, action: DraftAction): DraftState {
  return draftReducer(state, action);
}

function stateAtStatus(status: DraftStatus): DraftState {
  return { ...initialDraftState, status };
}

describe("draftReducer — initial state", () => {
  it("starts in idle status", () => {
    expect(initialDraftState.status).toBe("idle");
  });

  it("starts with no error and no last-saved timestamp", () => {
    expect(initialDraftState.lastSavedAt).toBeNull();
    expect(initialDraftState.errorMessage).toBeNull();
    expect(initialDraftState.attempt).toBe(0);
    expect(initialDraftState.nextRetryDelayMs).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Transition table (TDD §8.2)
// ---------------------------------------------------------------------------

describe("draftReducer — SAVE_START", () => {
  it("idle → saving", () => {
    const next = runReducer(stateAtStatus("idle"), { type: "SAVE_START" });
    expect(next.status).toBe("saving");
    expect(next.errorMessage).toBeNull();
  });

  it("saved → saving (clears error)", () => {
    const next = runReducer(stateAtStatus("saved"), { type: "SAVE_START" });
    expect(next.status).toBe("saving");
  });

  it("error → saving (clears error message)", () => {
    const errorState: DraftState = {
      ...initialDraftState,
      status: "error",
      errorMessage: "previous failure",
    };
    const next = runReducer(errorState, { type: "SAVE_START" });
    expect(next.status).toBe("saving");
    expect(next.errorMessage).toBeNull();
  });

  it("retrying → saving (resumes attempt)", () => {
    const retrying: DraftState = {
      ...initialDraftState,
      status: "retrying",
      attempt: 2,
      nextRetryDelayMs: 4_000,
    };
    const next = runReducer(retrying, { type: "SAVE_START" });
    expect(next.status).toBe("saving");
  });

  it("offline preempts SAVE_START — stays in offline", () => {
    const offline = stateAtStatus("offline");
    const next = runReducer(offline, { type: "SAVE_START" });
    expect(next.status).toBe("offline");
  });
});

describe("draftReducer — SAVE_SUCCESS", () => {
  it("saving → saved with savedAt timestamp", () => {
    const savedAt = "2026-04-28T10:00:00.000Z";
    const next = runReducer(stateAtStatus("saving"), {
      type: "SAVE_SUCCESS",
      savedAt,
    });
    expect(next.status).toBe("saved");
    expect(next.lastSavedAt).toBe(savedAt);
    expect(next.attempt).toBe(0);
    expect(next.errorMessage).toBeNull();
  });

  it("retrying → saved (resets attempt counter)", () => {
    const retrying: DraftState = {
      ...initialDraftState,
      status: "retrying",
      attempt: 3,
      nextRetryDelayMs: 8_000,
    };
    const next = runReducer(retrying, {
      type: "SAVE_SUCCESS",
      savedAt: "2026-04-28T10:00:00.000Z",
    });
    expect(next.status).toBe("saved");
    expect(next.attempt).toBe(0);
    expect(next.nextRetryDelayMs).toBe(0);
  });

  it("syncing → saved (post-reconnect flush completed)", () => {
    const next = runReducer(stateAtStatus("syncing"), {
      type: "SAVE_SUCCESS",
      savedAt: "2026-04-28T10:00:00.000Z",
    });
    expect(next.status).toBe("saved");
  });
});

describe("draftReducer — SAVE_RETRY", () => {
  it("saving → retrying (records attempt + next delay)", () => {
    const next = runReducer(stateAtStatus("saving"), {
      type: "SAVE_RETRY",
      attempt: 1,
      nextDelayMs: 1_000,
    });
    expect(next.status).toBe("retrying");
    expect(next.attempt).toBe(1);
    expect(next.nextRetryDelayMs).toBe(1_000);
  });

  it("retrying → retrying (subsequent attempt updates counters)", () => {
    const retrying: DraftState = {
      ...initialDraftState,
      status: "retrying",
      attempt: 1,
      nextRetryDelayMs: 1_000,
    };
    const next = runReducer(retrying, {
      type: "SAVE_RETRY",
      attempt: 2,
      nextDelayMs: 2_000,
    });
    expect(next.status).toBe("retrying");
    expect(next.attempt).toBe(2);
    expect(next.nextRetryDelayMs).toBe(2_000);
  });
});

describe("draftReducer — SAVE_ERROR", () => {
  it("saving → error with message", () => {
    const next = runReducer(stateAtStatus("saving"), {
      type: "SAVE_ERROR",
      message: "Network down",
    });
    expect(next.status).toBe("error");
    expect(next.errorMessage).toBe("Network down");
  });

  it("retrying → error after exhausting attempts", () => {
    const retrying: DraftState = {
      ...initialDraftState,
      status: "retrying",
      attempt: 5,
      nextRetryDelayMs: 16_000,
    };
    const next = runReducer(retrying, {
      type: "SAVE_ERROR",
      message: "Max retries exceeded",
    });
    expect(next.status).toBe("error");
    expect(next.errorMessage).toBe("Max retries exceeded");
  });
});

describe("draftReducer — WENT_OFFLINE", () => {
  it("idle → offline", () => {
    const next = runReducer(stateAtStatus("idle"), { type: "WENT_OFFLINE" });
    expect(next.status).toBe("offline");
  });

  it("saving → offline (in-flight save abandoned to network)", () => {
    const next = runReducer(stateAtStatus("saving"), { type: "WENT_OFFLINE" });
    expect(next.status).toBe("offline");
  });

  it("saved → offline (preserves lastSavedAt)", () => {
    const saved: DraftState = {
      ...initialDraftState,
      status: "saved",
      lastSavedAt: "2026-04-28T10:00:00.000Z",
    };
    const next = runReducer(saved, { type: "WENT_OFFLINE" });
    expect(next.status).toBe("offline");
    expect(next.lastSavedAt).toBe("2026-04-28T10:00:00.000Z");
  });

  it("retrying → offline (cancel retry loop)", () => {
    const retrying: DraftState = {
      ...initialDraftState,
      status: "retrying",
      attempt: 2,
      nextRetryDelayMs: 4_000,
    };
    const next = runReducer(retrying, { type: "WENT_OFFLINE" });
    expect(next.status).toBe("offline");
  });

  it("error → offline (cancel error UI; will sync on reconnect)", () => {
    const errorState: DraftState = {
      ...initialDraftState,
      status: "error",
      errorMessage: "previous failure",
    };
    const next = runReducer(errorState, { type: "WENT_OFFLINE" });
    expect(next.status).toBe("offline");
  });
});

describe("draftReducer — CAME_ONLINE_WITH_PENDING", () => {
  it("offline → syncing (we have unsaved local edits)", () => {
    const next = runReducer(stateAtStatus("offline"), {
      type: "CAME_ONLINE_WITH_PENDING",
    });
    expect(next.status).toBe("syncing");
  });
});

describe("draftReducer — CAME_ONLINE_NO_PENDING", () => {
  it("offline → idle when there were never any edits to flush", () => {
    const next = runReducer(stateAtStatus("offline"), {
      type: "CAME_ONLINE_NO_PENDING",
    });
    expect(next.status).toBe("idle");
  });

  it("offline → saved when we previously saved (preserves lastSavedAt)", () => {
    const offlineWithPriorSave: DraftState = {
      ...initialDraftState,
      status: "offline",
      lastSavedAt: "2026-04-28T10:00:00.000Z",
    };
    const next = runReducer(offlineWithPriorSave, {
      type: "CAME_ONLINE_NO_PENDING",
    });
    expect(next.status).toBe("saved");
    expect(next.lastSavedAt).toBe("2026-04-28T10:00:00.000Z");
  });
});

describe("draftReducer — RESET_TO_SAVED", () => {
  it("error → saved (user dismissed error toast)", () => {
    const errorState: DraftState = {
      ...initialDraftState,
      status: "error",
      errorMessage: "Network down",
      lastSavedAt: "2026-04-28T10:00:00.000Z",
    };
    const next = runReducer(errorState, { type: "RESET_TO_SAVED" });
    expect(next.status).toBe("saved");
    expect(next.errorMessage).toBeNull();
  });

  it("error → idle when there is no last-saved timestamp", () => {
    const errorState: DraftState = {
      ...initialDraftState,
      status: "error",
      errorMessage: "Network down",
      lastSavedAt: null,
    };
    const next = runReducer(errorState, { type: "RESET_TO_SAVED" });
    expect(next.status).toBe("idle");
    expect(next.errorMessage).toBeNull();
  });
});

describe("draftReducer — invariants", () => {
  it("returns the same reference (no-op) for unknown actions", () => {
    const state = stateAtStatus("idle");
    // @ts-expect-error — intentionally invalid action for invariant test
    const next = runReducer(state, { type: "UNKNOWN_ACTION" });
    expect(next).toBe(state);
  });

  it("idle is the initial status — no action transitions FROM idle on its own", () => {
    expect(initialDraftState.status).toBe("idle");
  });
});
