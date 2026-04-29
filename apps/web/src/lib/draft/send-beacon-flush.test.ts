// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// flushDraftToServer (TDD §7.5)
// ---------------------------------------------------------------------------
// Best-effort flush invoked from `pagehide` / `visibilitychange`. We try
// `navigator.sendBeacon` first because it survives navigation and is the
// only API the platform guarantees will not be cancelled by the browser
// during page unload. If sendBeacon is unavailable or the user-agent
// queue is full we fall back to `fetch(..., { keepalive: true })`.
// ---------------------------------------------------------------------------

async function importModule() {
  vi.resetModules();
  return await import("./send-beacon-flush");
}

interface SendBeaconStub {
  fn: ReturnType<typeof vi.fn>;
  calls: () => Array<[string, Blob | FormData | string]>;
}

function stubSendBeacon(returnValue: boolean | undefined): SendBeaconStub {
  const fn = vi.fn(() => returnValue);
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { sendBeacon: returnValue === undefined ? undefined : fn },
  });
  return {
    fn,
    calls: () =>
      fn.mock.calls as unknown as Array<[string, Blob | FormData | string]>,
  };
}

function stubFetch(returnValue: Response | Promise<Response> | Error) {
  const fetchMock = vi.fn(() => {
    if (returnValue instanceof Error) return Promise.reject(returnValue);
    return Promise.resolve(returnValue);
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: fetchMock,
  });
  return fetchMock;
}

beforeEach(() => {
  // @ts-expect-error — clearing browser globals between tests
  delete globalThis.navigator;
  // @ts-expect-error — clearing browser globals between tests
  delete globalThis.fetch;
});

afterEach(() => {
  // @ts-expect-error — clearing browser globals between tests
  delete globalThis.navigator;
  // @ts-expect-error — clearing browser globals between tests
  delete globalThis.fetch;
  vi.restoreAllMocks();
});

const samplePayload = {
  problemSetId: "550e8400-e29b-41d4-a716-446655440000",
  answers: { "1-(1)": { type: "essay" as const, text: "draft" } },
};

describe("flushDraftToServer — sendBeacon path", () => {
  it("returns true when sendBeacon accepts the queued send", async () => {
    const beacon = stubSendBeacon(true);
    const fetchMock = stubFetch(new Response("{}", { status: 200 }));

    const mod = await importModule();
    const result = mod.flushDraftToServer(samplePayload);

    expect(result).toBe(true);
    expect(beacon.fn).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to /api/draft with a JSON Blob via sendBeacon", async () => {
    const beacon = stubSendBeacon(true);

    const mod = await importModule();
    mod.flushDraftToServer(samplePayload);

    const [url, body] = beacon.calls()[0];
    expect(url).toBe("/api/draft");
    expect(body).toBeInstanceOf(Blob);
    const blob = body as Blob;
    expect(blob.type).toBe("application/json");
    const text = await blob.text();
    expect(JSON.parse(text)).toEqual(samplePayload);
  });
});

describe("flushDraftToServer — keepalive fetch fallback", () => {
  it("falls back to fetch when sendBeacon is unavailable on the platform", async () => {
    // navigator exists but sendBeacon is undefined.
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {},
    });
    const fetchMock = stubFetch(new Response("{}", { status: 200 }));

    const mod = await importModule();
    const result = mod.flushDraftToServer(samplePayload);

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/draft");
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    expect(init.headers).toEqual(
      expect.objectContaining({ "Content-Type": "application/json" })
    );
    expect(init.body).toBe(JSON.stringify(samplePayload));
  });

  it("falls back to fetch when navigator is undefined entirely", async () => {
    const fetchMock = stubFetch(new Response("{}", { status: 200 }));
    const mod = await importModule();

    const result = mod.flushDraftToServer(samplePayload);
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to fetch when sendBeacon returns false (queue full)", async () => {
    const beacon = stubSendBeacon(false);
    const fetchMock = stubFetch(new Response("{}", { status: 200 }));

    const mod = await importModule();
    const result = mod.flushDraftToServer(samplePayload);

    expect(beacon.fn).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });
});

describe("flushDraftToServer — both paths fail", () => {
  it("returns true when sendBeacon returns false and fetch resolves later (queued, not yet failed)", async () => {
    // Note: a fetch rejection is asynchronous; the request was successfully
    // QUEUED, the server will simply never accept it. The contract is "true
    // means queued", not "true means succeeded" — see TDD §7.5.
    stubSendBeacon(false);
    stubFetch(new Error("offline"));

    const mod = await importModule();
    const result = mod.flushDraftToServer(samplePayload);

    expect(result).toBe(true);
  });

  it("returns false when sendBeacon is missing and fetch throws synchronously", async () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {},
    });
    // Throwing synchronously inside fetch() to model environments where the
    // call site itself blows up (e.g., CSP-blocked URL).
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: () => {
        throw new Error("CSP blocked");
      },
    });

    const mod = await importModule();
    const result = mod.flushDraftToServer(samplePayload);
    expect(result).toBe(false);
  });

  it("returns false when both navigator.sendBeacon and fetch are absent", async () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {},
    });
    // @ts-expect-error — clearing fetch global to simulate non-browser env
    delete globalThis.fetch;

    const mod = await importModule();
    const result = mod.flushDraftToServer(samplePayload);
    expect(result).toBe(false);
  });
});

describe("flushDraftToServer — invariants", () => {
  it("does not throw when called with no globals (server context)", async () => {
    const mod = await importModule();
    expect(() => mod.flushDraftToServer(samplePayload)).not.toThrow();
  });
});
