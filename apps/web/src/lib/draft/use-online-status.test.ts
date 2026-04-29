// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// useOnlineStatus (TDD §7.1)
// ---------------------------------------------------------------------------
// SSR-safe online detection via useSyncExternalStore. The hook subscribes
// to the browser's online/offline events and returns navigator.onLine.
// On the server (no window) it returns true to match the browser default
// before the first event fires.
// ---------------------------------------------------------------------------
//
// We test the three useSyncExternalStore building blocks directly
// (subscribe / getSnapshot / getServerSnapshot) — this gives full coverage
// of the SSR fallback and the listener wiring without booting jsdom.
// React's contract is: useSyncExternalStore re-reads `getSnapshot` whenever
// `subscribe` invokes its callback. As long as our trio honors that
// contract, the hook itself is correct.
// ---------------------------------------------------------------------------

// We will reset module imports between tests so window stub mutation doesn't
// leak across cases.
async function importModule() {
  vi.resetModules();
  return await import("./use-online-status");
}

interface FakeListenerStore {
  online: Set<EventListener>;
  offline: Set<EventListener>;
}

function buildFakeWindow() {
  const listeners: FakeListenerStore = {
    online: new Set(),
    offline: new Set(),
  };
  const win = {
    addEventListener: vi.fn(
      (event: keyof FakeListenerStore, handler: EventListener) => {
        listeners[event]?.add(handler);
      }
    ),
    removeEventListener: vi.fn(
      (event: keyof FakeListenerStore, handler: EventListener) => {
        listeners[event]?.delete(handler);
      }
    ),
    dispatchEvent(type: keyof FakeListenerStore) {
      listeners[type].forEach((h) => h(new Event(type)));
    },
  };
  return { win, listeners };
}

beforeEach(() => {
  // Reset globals — we attach window/navigator stubs per-test below.
  // @ts-expect-error — clearing browser globals between tests
  delete globalThis.window;
  // @ts-expect-error — clearing browser globals between tests
  delete globalThis.navigator;
});

afterEach(() => {
  // @ts-expect-error — populating globalThis to simulate browser globals
  delete globalThis.window;
  // @ts-expect-error — populating globalThis to simulate browser globals
  delete globalThis.navigator;
});

describe("useOnlineStatus internals", () => {
  it("getServerSnapshot returns true (the browser default)", async () => {
    const mod = await importModule();
    expect(mod.getServerSnapshot()).toBe(true);
  });

  it("getSnapshot returns navigator.onLine when window exists", async () => {
    const { win } = buildFakeWindow();
    // @ts-expect-error — minimal window stub
    globalThis.window = win;
    // @ts-expect-error — minimal navigator stub
    globalThis.navigator = { onLine: true };

    const mod = await importModule();
    expect(mod.getSnapshot()).toBe(true);

    // @ts-expect-error — replace navigator stub mid-test
    globalThis.navigator = { onLine: false };
    expect(mod.getSnapshot()).toBe(false);
  });

  it("getSnapshot returns true when window is undefined (SSR)", async () => {
    const mod = await importModule();
    expect(mod.getSnapshot()).toBe(true);
  });

  it("subscribe registers BOTH online and offline listeners", async () => {
    const { win } = buildFakeWindow();
    // @ts-expect-error — minimal browser window stub
    globalThis.window = win;
    // @ts-expect-error — minimal navigator stub
    globalThis.navigator = { onLine: true };

    const mod = await importModule();
    const callback = vi.fn();
    mod.subscribe(callback);

    expect(win.addEventListener).toHaveBeenCalledWith(
      "online",
      expect.any(Function)
    );
    expect(win.addEventListener).toHaveBeenCalledWith(
      "offline",
      expect.any(Function)
    );
  });

  it("subscribe invokes its callback on online and offline events", async () => {
    const { win, listeners } = buildFakeWindow();
    // @ts-expect-error — minimal browser window stub
    globalThis.window = win;
    // @ts-expect-error — minimal navigator stub
    globalThis.navigator = { onLine: true };

    const mod = await importModule();
    const callback = vi.fn();
    mod.subscribe(callback);

    expect(callback).not.toHaveBeenCalled();

    win.dispatchEvent("offline");
    expect(callback).toHaveBeenCalledTimes(1);

    win.dispatchEvent("online");
    expect(callback).toHaveBeenCalledTimes(2);

    // Sanity: handler is registered exactly once for each event.
    expect(listeners.online.size).toBe(1);
    expect(listeners.offline.size).toBe(1);
  });

  it("subscribe returns an unsubscribe function that removes both listeners", async () => {
    const { win, listeners } = buildFakeWindow();
    // @ts-expect-error — minimal browser window stub
    globalThis.window = win;
    // @ts-expect-error — minimal navigator stub
    globalThis.navigator = { onLine: true };

    const mod = await importModule();
    const callback = vi.fn();
    const unsubscribe = mod.subscribe(callback);

    expect(listeners.online.size).toBe(1);
    expect(listeners.offline.size).toBe(1);

    unsubscribe();

    expect(listeners.online.size).toBe(0);
    expect(listeners.offline.size).toBe(0);

    // Events fired after unsubscribe must NOT reach the callback.
    win.dispatchEvent("offline");
    win.dispatchEvent("online");
    expect(callback).not.toHaveBeenCalled();
  });

  it("subscribe returns a no-op unsubscribe when window is undefined (SSR)", async () => {
    const mod = await importModule();
    const callback = vi.fn();
    const unsubscribe = mod.subscribe(callback);
    // Must not throw.
    expect(() => unsubscribe()).not.toThrow();
    expect(callback).not.toHaveBeenCalled();
  });

  it("exposes useOnlineStatus as a named export (smoke check)", async () => {
    const mod = await importModule();
    expect(typeof mod.useOnlineStatus).toBe("function");
  });
});
