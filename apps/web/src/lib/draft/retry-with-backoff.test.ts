// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  retryWithBackoff,
  RetryableError,
  DEFAULT_BASE_DELAY_MS,
  DEFAULT_MAX_DELAY_MS,
  DEFAULT_MAX_ATTEMPTS,
} from "./retry-with-backoff";

// ---------------------------------------------------------------------------
// retryWithBackoff (TDD §7.2)
// ---------------------------------------------------------------------------
// Contract:
//   - Default 5 attempts, 1s base, 16s cap, doubling: 1s, 2s, 4s, 8s, 16s
//   - 4xx errors (except 408 timeout, 429 rate-limit) MUST NOT retry
//   - onAttempt(attempt, nextDelayMs) fires BEFORE each retry sleep
//   - signal: AbortSignal cancels mid-loop
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("RetryableError", () => {
  it("preserves message and HTTP status field", () => {
    const err = new RetryableError("network down", 503);
    expect(err.message).toBe("network down");
    expect(err.status).toBe(503);
    expect(err).toBeInstanceOf(Error);
  });

  it("supports omitted status (treated as transient/unknown)", () => {
    const err = new RetryableError("unknown");
    expect(err.status).toBeUndefined();
  });
});

describe("default constants", () => {
  it("DEFAULT_MAX_ATTEMPTS = 5", () => {
    expect(DEFAULT_MAX_ATTEMPTS).toBe(5);
  });

  it("DEFAULT_BASE_DELAY_MS = 1000", () => {
    expect(DEFAULT_BASE_DELAY_MS).toBe(1_000);
  });

  it("DEFAULT_MAX_DELAY_MS = 16000", () => {
    expect(DEFAULT_MAX_DELAY_MS).toBe(16_000);
  });
});

describe("retryWithBackoff — happy paths", () => {
  it("returns the value when fn succeeds on the first attempt", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const promise = retryWithBackoff(fn, {
      signal: new AbortController().signal,
    });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on transient error and eventually succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new RetryableError("transient", 503))
      .mockRejectedValueOnce(new RetryableError("transient", 503))
      .mockResolvedValue("ok");

    const onAttempt = vi.fn();
    const promise = retryWithBackoff(fn, {
      signal: new AbortController().signal,
      onAttempt,
    });

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("retryWithBackoff — exhaustion", () => {
  it("rejects after maxAttempts retries", async () => {
    const fn = vi.fn().mockRejectedValue(new RetryableError("fail", 503));
    const promise = retryWithBackoff(fn, {
      maxAttempts: 5,
      signal: new AbortController().signal,
    });

    const settled = promise.catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await settled;
    expect((err as Error).message).toBe("fail");
    expect(fn).toHaveBeenCalledTimes(5);
  });

  it("respects custom maxAttempts", async () => {
    const fn = vi.fn().mockRejectedValue(new RetryableError("fail", 503));
    const promise = retryWithBackoff(fn, {
      maxAttempts: 2,
      signal: new AbortController().signal,
    });

    const settled = promise.catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await settled;
    expect((err as Error).message).toBe("fail");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("retryWithBackoff — 4xx no-retry policy", () => {
  it("does not retry on 400 Bad Request", async () => {
    const fn = vi.fn().mockRejectedValue(new RetryableError("bad request", 400));
    const promise = retryWithBackoff(fn, {
      signal: new AbortController().signal,
    });
    const settled = promise.catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await settled;
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe("bad request");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not retry on 401 Unauthorized", async () => {
    const fn = vi.fn().mockRejectedValue(new RetryableError("unauth", 401));
    const promise = retryWithBackoff(fn, {
      signal: new AbortController().signal,
    });
    const settled = promise.catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await settled;
    expect((err as Error).message).toBe("unauth");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not retry on 403 Forbidden", async () => {
    const fn = vi.fn().mockRejectedValue(new RetryableError("forbid", 403));
    const promise = retryWithBackoff(fn, {
      signal: new AbortController().signal,
    });
    const settled = promise.catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await settled;
    expect((err as Error).message).toBe("forbid");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not retry on 413 Payload Too Large", async () => {
    const fn = vi.fn().mockRejectedValue(new RetryableError("too big", 413));
    const promise = retryWithBackoff(fn, {
      signal: new AbortController().signal,
    });
    const settled = promise.catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await settled;
    expect((err as Error).message).toBe("too big");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("DOES retry on 408 Request Timeout (4xx exception)", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new RetryableError("timeout", 408))
      .mockResolvedValue("ok");
    const promise = retryWithBackoff(fn, {
      signal: new AbortController().signal,
    });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("DOES retry on 429 Rate Limited (4xx exception)", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new RetryableError("rate", 429))
      .mockResolvedValue("ok");
    const promise = retryWithBackoff(fn, {
      signal: new AbortController().signal,
    });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("DOES retry on 5xx Internal Server Error", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new RetryableError("oops", 500))
      .mockResolvedValue("ok");
    const promise = retryWithBackoff(fn, {
      signal: new AbortController().signal,
    });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("DOES retry on errors without a status (e.g., network failures)", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("network failure"))
      .mockResolvedValue("ok");
    const promise = retryWithBackoff(fn, {
      signal: new AbortController().signal,
    });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("retryWithBackoff — abort signal", () => {
  it("aborts mid-backoff and rejects with AbortError-like error", async () => {
    const fn = vi.fn().mockRejectedValue(new RetryableError("transient", 503));
    const controller = new AbortController();

    const promise = retryWithBackoff(fn, {
      signal: controller.signal,
    });

    // Catch immediately so the rejection isn't unhandled while we wait
    const settled = promise.catch((e) => e);

    // Advance to inside the first backoff window, then abort
    await vi.advanceTimersByTimeAsync(500);
    controller.abort();
    await vi.advanceTimersByTimeAsync(2_000);

    const result = await settled;
    expect(result).toBeInstanceOf(Error);
    // Function only called once before the abort kicked in
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not start retries if signal is already aborted", async () => {
    const fn = vi.fn().mockRejectedValue(new RetryableError("fail", 503));
    const controller = new AbortController();
    controller.abort();

    const promise = retryWithBackoff(fn, {
      signal: controller.signal,
    });
    const settled = promise.catch((e) => e);
    await vi.runAllTimersAsync();
    const result = await settled;
    expect(result).toBeInstanceOf(Error);
    // Either 0 calls (early abort) or exactly 1 (called once, then aborted) —
    // the contract is "no retries"; whether the first call ran is acceptable.
    expect(fn.mock.calls.length).toBeLessThanOrEqual(1);
  });
});

describe("retryWithBackoff — onAttempt callback", () => {
  it("fires onAttempt with sequential attempt numbers and doubling delays", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new RetryableError("fail", 503))
      .mockRejectedValueOnce(new RetryableError("fail", 503))
      .mockRejectedValueOnce(new RetryableError("fail", 503))
      .mockResolvedValue("ok");

    const onAttempt = vi.fn();
    const promise = retryWithBackoff(fn, {
      signal: new AbortController().signal,
      onAttempt,
    });

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("ok");

    // 3 retries → 3 onAttempt calls, with delays 1s, 2s, 4s
    expect(onAttempt).toHaveBeenCalledTimes(3);
    expect(onAttempt).toHaveBeenNthCalledWith(1, 2, 1_000);
    expect(onAttempt).toHaveBeenNthCalledWith(2, 3, 2_000);
    expect(onAttempt).toHaveBeenNthCalledWith(3, 4, 4_000);
  });

  it("caps delay at maxDelayMs (default 16s) on later retries", async () => {
    const fn = vi.fn().mockRejectedValue(new RetryableError("fail", 503));
    const onAttempt = vi.fn();
    const promise = retryWithBackoff(fn, {
      maxAttempts: 6,
      signal: new AbortController().signal,
      onAttempt,
    });

    const settled = promise.catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await settled;
    expect(err).toBeInstanceOf(Error);

    // 5 retry callbacks: 1s, 2s, 4s, 8s, 16s (cap)
    expect(onAttempt).toHaveBeenCalledTimes(5);
    const delays = onAttempt.mock.calls.map((c) => c[1]);
    expect(delays).toEqual([1_000, 2_000, 4_000, 8_000, 16_000]);
  });
});
