// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// global-ticker (TDD §7.4)
// ---------------------------------------------------------------------------
// Shared 1-second `setInterval` exposed via useSyncExternalStore. Multiple
// components subscribing to relative-time labels MUST share a single
// interval — running one timer per label scales linearly with the number
// of relative-time spans on a busy page.
//
// Lifecycle: the interval starts on the first subscribe and stops on the
// last unsubscribe (refcount-driven). getServerSnapshot returns 0.
// ---------------------------------------------------------------------------

async function importModule() {
  vi.resetModules();
  return await import("./global-ticker");
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("global-ticker — getServerSnapshot", () => {
  it("returns 0 (a stable value for SSR hydration)", async () => {
    const mod = await importModule();
    expect(mod.getServerSnapshot()).toBe(0);
  });
});

describe("global-ticker — getSnapshot", () => {
  it("returns 0 before any tick has fired", async () => {
    const mod = await importModule();
    expect(mod.getSnapshot()).toBe(0);
  });

  it("returns the latest tick count after the interval fires", async () => {
    const mod = await importModule();
    const callback = vi.fn();
    mod.subscribe(callback);

    expect(mod.getSnapshot()).toBe(0);
    vi.advanceTimersByTime(1_000);
    expect(mod.getSnapshot()).toBe(1);
    vi.advanceTimersByTime(2_000);
    expect(mod.getSnapshot()).toBe(3);
  });
});

describe("global-ticker — subscribe lifecycle", () => {
  it("first subscribe starts the interval", async () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const mod = await importModule();

    expect(setIntervalSpy).not.toHaveBeenCalled();
    mod.subscribe(vi.fn());
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    // Tick interval is 1 second.
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1_000);
  });

  it("subsequent subscribes share the same interval (no extra setInterval)", async () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const mod = await importModule();

    mod.subscribe(vi.fn());
    mod.subscribe(vi.fn());
    mod.subscribe(vi.fn());

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it("last unsubscribe clears the interval", async () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const mod = await importModule();

    const u1 = mod.subscribe(vi.fn());
    const u2 = mod.subscribe(vi.fn());

    expect(clearIntervalSpy).not.toHaveBeenCalled();
    u1();
    expect(clearIntervalSpy).not.toHaveBeenCalled();
    u2();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it("notifies all subscribers on every tick", async () => {
    const mod = await importModule();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const cb3 = vi.fn();
    mod.subscribe(cb1);
    mod.subscribe(cb2);
    mod.subscribe(cb3);

    vi.advanceTimersByTime(1_000);
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
    expect(cb3).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1_000);
    expect(cb1).toHaveBeenCalledTimes(2);
    expect(cb2).toHaveBeenCalledTimes(2);
    expect(cb3).toHaveBeenCalledTimes(2);
  });

  it("does not invoke an unsubscribed callback on later ticks", async () => {
    const mod = await importModule();
    const cb = vi.fn();
    const unsubscribe = mod.subscribe(cb);
    vi.advanceTimersByTime(1_000);
    expect(cb).toHaveBeenCalledTimes(1);

    unsubscribe();
    vi.advanceTimersByTime(5_000);
    // Timer should have been cleared (last subscriber gone), but even if
    // a stray tick fires, the callback must not be reached.
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("restarts the interval after a re-subscribe (lifecycle is idempotent)", async () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const mod = await importModule();

    const u1 = mod.subscribe(vi.fn());
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    u1();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

    // Re-subscribe — fresh interval is started.
    const u2 = mod.subscribe(vi.fn());
    expect(setIntervalSpy).toHaveBeenCalledTimes(2);
    u2();
  });
});

describe("global-ticker — useGlobalTick smoke check", () => {
  it("exports useGlobalTick as a function", async () => {
    const mod = await importModule();
    expect(typeof mod.useGlobalTick).toBe("function");
  });
});
