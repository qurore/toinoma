// ---------------------------------------------------------------------------
// Save-state-machine for autosave (TDD §7.6 / §8.2)
// ---------------------------------------------------------------------------
// Pure types + reducer. The reducer has zero side effects: scheduling timers,
// firing network requests, and reading `navigator.onLine` are the caller's
// responsibility (typically the solve-client useReducer-driven effect).
//
// Why a state machine? The autosave UX has 7 distinct visual states (idle,
// saving, saved, retrying, offline, syncing, error). Each has its own badge
// copy, icon, and dismissal rule. Without an explicit state machine the
// component devolves into a tangle of booleans (isLoading, isOffline,
// hasError) whose product space allows impossible combinations like
// "saving AND offline AND error". The machine collapses that space to the
// 7 reachable states and the 14 transitions enumerated below.
// ---------------------------------------------------------------------------

export type DraftStatus =
  | "idle"
  | "saving"
  | "saved"
  | "retrying"
  | "offline"
  | "syncing"
  | "error";

export interface DraftState {
  status: DraftStatus;
  /** ISO-8601 timestamp of the last successful save, null if none yet. */
  lastSavedAt: string | null;
  /** Server-supplied or local error message; null when no error. */
  errorMessage: string | null;
  /** Current retry attempt number; 0 when not retrying. */
  attempt: number;
  /** Backoff delay scheduled before the next retry, in ms; 0 when idle. */
  nextRetryDelayMs: number;
}

export type DraftAction =
  | { type: "SAVE_START" }
  | { type: "SAVE_SUCCESS"; savedAt: string }
  | { type: "SAVE_RETRY"; attempt: number; nextDelayMs: number }
  | { type: "SAVE_ERROR"; message: string }
  | { type: "WENT_OFFLINE" }
  | { type: "CAME_ONLINE_WITH_PENDING" }
  | { type: "CAME_ONLINE_NO_PENDING" }
  | { type: "RESET_TO_SAVED" };

export const initialDraftState: DraftState = {
  status: "idle",
  lastSavedAt: null,
  errorMessage: null,
  attempt: 0,
  nextRetryDelayMs: 0,
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
// Transition table (TDD §8.2):
//
//   FROM        | ACTION                      | TO
//   ------------|-----------------------------|------------
//   idle        | SAVE_START                  | saving
//   saved       | SAVE_START                  | saving
//   error       | SAVE_START                  | saving
//   retrying    | SAVE_START                  | saving
//   offline     | SAVE_START                  | offline   (preempted)
//   saving      | SAVE_SUCCESS                | saved
//   retrying    | SAVE_SUCCESS                | saved
//   syncing     | SAVE_SUCCESS                | saved
//   saving      | SAVE_RETRY                  | retrying
//   retrying    | SAVE_RETRY                  | retrying
//   saving      | SAVE_ERROR                  | error
//   retrying    | SAVE_ERROR                  | error
//   *           | WENT_OFFLINE                | offline
//   offline     | CAME_ONLINE_WITH_PENDING    | syncing
//   offline     | CAME_ONLINE_NO_PENDING      | idle | saved (if lastSavedAt)
//   error       | RESET_TO_SAVED              | saved | idle (if no save)
//
// All other state-action pairs return the same state reference (no-op).
// Returning the same reference matters for React.memo and useReducer
// reference equality — components downstream skip re-render.
// ---------------------------------------------------------------------------

export function draftReducer(
  state: DraftState,
  action: DraftAction
): DraftState {
  switch (action.type) {
    case "SAVE_START": {
      // Offline preempts all save attempts. The caller MUST dispatch this
      // even when offline so the reducer can be the single source of truth
      // about what happens to a save attempt; we explicitly drop it here.
      if (state.status === "offline") return state;
      return {
        ...state,
        status: "saving",
        errorMessage: null,
      };
    }

    case "SAVE_SUCCESS": {
      return {
        ...state,
        status: "saved",
        lastSavedAt: action.savedAt,
        errorMessage: null,
        attempt: 0,
        nextRetryDelayMs: 0,
      };
    }

    case "SAVE_RETRY": {
      return {
        ...state,
        status: "retrying",
        attempt: action.attempt,
        nextRetryDelayMs: action.nextDelayMs,
      };
    }

    case "SAVE_ERROR": {
      return {
        ...state,
        status: "error",
        errorMessage: action.message,
        attempt: 0,
        nextRetryDelayMs: 0,
      };
    }

    case "WENT_OFFLINE": {
      return {
        ...state,
        status: "offline",
        // Preserve lastSavedAt so the badge can still say "Last saved Xm ago"
        // while offline. Clear the in-flight error and retry counters — they
        // are network-dependent and should restart fresh on reconnect.
        errorMessage: null,
        attempt: 0,
        nextRetryDelayMs: 0,
      };
    }

    case "CAME_ONLINE_WITH_PENDING": {
      return {
        ...state,
        status: "syncing",
      };
    }

    case "CAME_ONLINE_NO_PENDING": {
      // If we previously saved, return to "saved" so the badge keeps
      // displaying the timestamp. Otherwise revert to "idle" (no edits ever).
      return {
        ...state,
        status: state.lastSavedAt ? "saved" : "idle",
      };
    }

    case "RESET_TO_SAVED": {
      return {
        ...state,
        status: state.lastSavedAt ? "saved" : "idle",
        errorMessage: null,
      };
    }

    default:
      // Exhaustive switch — unknown actions are a no-op (return same ref).
      return state;
  }
}
