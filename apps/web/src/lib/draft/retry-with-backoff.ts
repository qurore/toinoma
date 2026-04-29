// ---------------------------------------------------------------------------
// retryWithBackoff — exponential-backoff retry helper for draft autosaves
// ---------------------------------------------------------------------------
// Used by the draft state machine to wrap the POST /api/draft call. The
// schedule is:  1s, 2s, 4s, 8s, 16s (cap). After `maxAttempts` failures the
// underlying error is re-thrown.
//
// 4xx errors are NOT retried with two exceptions: 408 (request timeout) and
// 429 (rate-limited) — both are transient signals the server itself wants
// us to retry. Any other 4xx (400, 401, 403, 413, ...) is a permanent
// client-side bug and retrying just wastes battery.
// ---------------------------------------------------------------------------

export const DEFAULT_MAX_ATTEMPTS = 5;
export const DEFAULT_BASE_DELAY_MS = 1_000;
export const DEFAULT_MAX_DELAY_MS = 16_000;

/**
 * Throwable carrying the HTTP status alongside a human-readable message.
 * The status drives the retry decision in {@link retryWithBackoff}.
 */
export class RetryableError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "RetryableError";
    this.status = status;
  }
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Fires BEFORE each retry-sleep with the upcoming attempt # and delay. */
  onAttempt?: (attempt: number, nextDelayMs: number) => void;
  signal: AbortSignal;
}

// 4xx codes that ARE retried because the server is asking us to.
const RETRYABLE_4XX = new Set<number>([408, 429]);

function isRetryable(error: unknown): boolean {
  if (error instanceof RetryableError && error.status !== undefined) {
    const s = error.status;
    if (s >= 400 && s < 500) return RETRYABLE_4XX.has(s);
    return true; // 5xx and the rare 3xx oddity → retry
  }
  // Network errors / TypeError fetch failures / AbortError-from-server →
  // treat as retryable. AbortError caused by our own signal is filtered
  // separately by the abort check before sleep.
  return true;
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("aborted"));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      reject(new Error("aborted"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Run `fn` with exponential backoff retries.
 *
 * @returns The resolved value of `fn` on first success.
 * @throws The last thrown error after exhausting attempts, OR a synthetic
 *         "aborted" error if the signal fires during a backoff window.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts: RetryOptions
): Promise<T> {
  const {
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
    onAttempt,
    signal,
  } = opts;

  let lastError: unknown = new Error("retryWithBackoff invoked with maxAttempts=0");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal.aborted) {
      throw new Error("aborted");
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryable(error)) {
        throw error;
      }

      // Out of attempts — re-throw the underlying error so callers see
      // status codes / messages, not a wrapped synthetic.
      if (attempt >= maxAttempts) {
        throw error;
      }

      // Backoff: 1s, 2s, 4s, 8s, ... capped at maxDelayMs.
      // attempt is 1-indexed; first retry waits baseDelayMs * 2^(attempt-1)
      // = baseDelayMs * 2^0 = baseDelayMs on the first failure.
      const nextDelayMs = Math.min(
        baseDelayMs * 2 ** (attempt - 1),
        maxDelayMs
      );

      onAttempt?.(attempt + 1, nextDelayMs);

      try {
        await delay(nextDelayMs, signal);
      } catch (abortError) {
        throw abortError;
      }
    }
  }

  // Unreachable — the loop returns or throws — but keeps TS happy.
  throw lastError;
}
