// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock helpers — Supabase chainable query builder
// ---------------------------------------------------------------------------

type MockResult<T = unknown> = {
  data: T | null;
  error: { message: string; code?: string } | null;
};

interface DraftRow {
  answers: Record<string, unknown>;
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Module mocks (must be registered before importing route handlers)
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitByUser: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 59,
    resetAt: 0,
  }),
}));

const { createClient } = await import("@/lib/supabase/server");
const { rateLimitByUser } = await import("@/lib/rate-limit");

const { POST, GET, DELETE } = await import("./route");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID = "550e8400-e29b-41d4-a716-446655440001";
const USER_EMAIL = "student@example.com";
const PROBLEM_SET_ID = "550e8400-e29b-41d4-a716-446655440002";
const OTHER_USER_ID = "550e8400-e29b-41d4-a716-446655440099";

const validAnswers = {
  "1-(1)": { type: "essay", text: "in progress" },
  "1-(2)": { type: "mark_sheet", selected: "A" },
};

interface SupabaseMockOptions {
  user?: { id: string; email?: string } | null;
  purchase?: { id: string } | null;
  draft?: DraftRow | null;
  upsertResult?: MockResult;
  selectResult?: MockResult<DraftRow | null>;
  deleteResult?: MockResult;
}

interface FromBuilder {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

function setupSupabaseMock(opts: SupabaseMockOptions = {}) {
  const {
    user = { id: USER_ID, email: USER_EMAIL },
    purchase = { id: "purchase-1" },
    draft = null,
    upsertResult = { data: null, error: null },
    selectResult,
    deleteResult = { data: null, error: null },
  } = opts;

  const purchasesBuilder: FromBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: purchase, error: null }),
    single: vi.fn().mockResolvedValue({ data: purchase, error: null }),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    delete: vi.fn().mockReturnThis(),
  };

  const draftsBuilder: FromBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(
      selectResult ?? { data: draft, error: null }
    ),
    single: vi.fn().mockResolvedValue(
      selectResult ?? { data: draft, error: null }
    ),
    upsert: vi.fn().mockResolvedValue(upsertResult),
    delete: vi.fn().mockReturnThis(),
  };

  // delete().eq().eq() must resolve to deleteResult — simulate the awaitable
  // returned by the second .eq() call.
  draftsBuilder.delete = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(deleteResult),
    }),
  });

  const fromMap: Record<string, FromBuilder> = {
    purchases: purchasesBuilder,
    submission_drafts: draftsBuilder,
  };

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn((table: string) => {
      return fromMap[table] ?? purchasesBuilder;
    }),
  };

  vi.mocked(createClient).mockResolvedValue(supabase as never);
  // also expose builders for assertions
  return { supabase, purchasesBuilder, draftsBuilder };
}

// Helper to build POST request
function makePostRequest(
  body: unknown,
  contentType = "application/json",
  extraHeaders: Record<string, string> = {}
): Request {
  return new Request("http://localhost:3000/api/draft", {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      ...extraHeaders,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function makeGetRequest(url: string): Request {
  return new Request(url, {
    method: "GET",
  });
}

function makeDeleteRequest(url: string): Request {
  return new Request(url, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // restore default rate-limit mock to allow
  vi.mocked(rateLimitByUser).mockResolvedValue({
    allowed: true,
    remaining: 59,
    resetAt: 0,
  });
});

// ---------------------------------------------------------------------------
// POST /api/draft
// ---------------------------------------------------------------------------

describe("POST /api/draft", () => {
  it("returns 401 when unauthenticated", async () => {
    setupSupabaseMock({ user: null });
    const res = await POST(
      makePostRequest({ problemSetId: PROBLEM_SET_ID, answers: validAnswers })
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 429 when rate limited", async () => {
    setupSupabaseMock({});
    vi.mocked(rateLimitByUser).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });

    const res = await POST(
      makePostRequest({ problemSetId: PROBLEM_SET_ID, answers: validAnswers })
    );
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain("リクエスト");
  });

  it("calls rateLimitByUser with 60/minute budget", async () => {
    setupSupabaseMock({});
    await POST(
      makePostRequest({ problemSetId: PROBLEM_SET_ID, answers: validAnswers })
    );
    expect(rateLimitByUser).toHaveBeenCalledWith(USER_ID, 60, 60_000);
  });

  it("returns 413 when payload exceeds 256KB", async () => {
    setupSupabaseMock({});
    const huge = "x".repeat(260 * 1024);
    const req = new Request("http://localhost:3000/api/draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(huge.length + 100),
      },
      body: JSON.stringify({
        problemSetId: PROBLEM_SET_ID,
        answers: { "1-(1)": { type: "essay", text: huge } },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it("returns 400 when JSON is malformed", async () => {
    setupSupabaseMock({});
    const res = await POST(makePostRequest("not-json{{{"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 400 when Zod validation fails (bad shape)", async () => {
    setupSupabaseMock({});
    const res = await POST(
      makePostRequest({ problemSetId: "not-a-uuid", answers: {} })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when answers contains an invalid draft entry", async () => {
    setupSupabaseMock({});
    const res = await POST(
      makePostRequest({
        problemSetId: PROBLEM_SET_ID,
        answers: { "1-(1)": { type: "garbage" } },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when user has not purchased the problem set", async () => {
    setupSupabaseMock({ purchase: null });
    const res = await POST(
      makePostRequest({ problemSetId: PROBLEM_SET_ID, answers: validAnswers })
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 with savedAt on successful upsert", async () => {
    const { draftsBuilder } = setupSupabaseMock({});
    const res = await POST(
      makePostRequest({ problemSetId: PROBLEM_SET_ID, answers: validAnswers })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(typeof json.savedAt).toBe("string");
    // ISO 8601 with timezone
    expect(json.savedAt).toMatch(/T.*Z|[+-]\d\d:\d\d/);

    // Upsert called on submission_drafts with correct payload
    expect(draftsBuilder.upsert).toHaveBeenCalledTimes(1);
    const upsertArgs = draftsBuilder.upsert.mock.calls[0];
    const payload = upsertArgs[0];
    expect(payload.user_id).toBe(USER_ID);
    expect(payload.problem_set_id).toBe(PROBLEM_SET_ID);
    expect(payload.answers).toEqual(validAnswers);
    // onConflict ensures upsert is keyed by (user, problem_set)
    const conflictOpts = upsertArgs[1];
    expect(conflictOpts?.onConflict).toBe("user_id,problem_set_id");
  });

  it("accepts text/plain;charset=UTF-8 (sendBeacon default)", async () => {
    setupSupabaseMock({});
    const res = await POST(
      makePostRequest(
        { problemSetId: PROBLEM_SET_ID, answers: validAnswers },
        "text/plain;charset=UTF-8"
      )
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("returns 500 when supabase upsert fails", async () => {
    setupSupabaseMock({
      upsertResult: { data: null, error: { message: "db down" } },
    });
    const res = await POST(
      makePostRequest({ problemSetId: PROBLEM_SET_ID, answers: validAnswers })
    );
    expect(res.status).toBe(500);
  });

  it("isolates writes to the authenticated user (RLS-aware payload)", async () => {
    // The supabase client used here is the user-scoped server client
    // (auth.getUser() returns USER_ID). The route MUST set user_id from the
    // session, never from the request body — this guards against payload
    // forgery even before RLS would block the write.
    const { draftsBuilder } = setupSupabaseMock({ user: { id: USER_ID } });
    await POST(
      makePostRequest({
        problemSetId: PROBLEM_SET_ID,
        answers: validAnswers,
        // Pretend a malicious client tries to override user_id
        user_id: OTHER_USER_ID,
      })
    );
    const upsertPayload = draftsBuilder.upsert.mock.calls[0][0];
    expect(upsertPayload.user_id).toBe(USER_ID);
    expect(upsertPayload.user_id).not.toBe(OTHER_USER_ID);
  });
});

// ---------------------------------------------------------------------------
// GET /api/draft
// ---------------------------------------------------------------------------

describe("GET /api/draft", () => {
  it("returns 401 when unauthenticated", async () => {
    setupSupabaseMock({ user: null });
    const res = await GET(
      makeGetRequest(
        `http://localhost:3000/api/draft?problemSetId=${PROBLEM_SET_ID}`
      )
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when problemSetId is missing", async () => {
    setupSupabaseMock({});
    const res = await GET(makeGetRequest("http://localhost:3000/api/draft"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when problemSetId is not a UUID", async () => {
    setupSupabaseMock({});
    const res = await GET(
      makeGetRequest("http://localhost:3000/api/draft?problemSetId=not-a-uuid")
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 with null draft when none exists", async () => {
    setupSupabaseMock({ draft: null });
    const res = await GET(
      makeGetRequest(
        `http://localhost:3000/api/draft?problemSetId=${PROBLEM_SET_ID}`
      )
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.draft).toBeNull();
  });

  it("returns 200 with draft data when present", async () => {
    const now = new Date().toISOString();
    setupSupabaseMock({
      draft: {
        answers: validAnswers,
        last_active_at: now,
        created_at: now,
        updated_at: now,
      },
    });
    const res = await GET(
      makeGetRequest(
        `http://localhost:3000/api/draft?problemSetId=${PROBLEM_SET_ID}`
      )
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.draft).toBeTruthy();
    expect(json.draft.answers).toEqual(validAnswers);
    expect(json.draft.lastActiveAt).toBe(now);
    expect(typeof json.draft.expiresAt).toBe("string");
  });

  it("returns 429 when rate limited", async () => {
    setupSupabaseMock({});
    vi.mocked(rateLimitByUser).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const res = await GET(
      makeGetRequest(
        `http://localhost:3000/api/draft?problemSetId=${PROBLEM_SET_ID}`
      )
    );
    expect(res.status).toBe(429);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/draft
// ---------------------------------------------------------------------------

describe("DELETE /api/draft", () => {
  it("returns 401 when unauthenticated", async () => {
    setupSupabaseMock({ user: null });
    const res = await DELETE(
      makeDeleteRequest(
        `http://localhost:3000/api/draft?problemSetId=${PROBLEM_SET_ID}`
      )
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when problemSetId is missing", async () => {
    setupSupabaseMock({});
    const res = await DELETE(
      makeDeleteRequest("http://localhost:3000/api/draft")
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 with deleted=true on successful delete", async () => {
    const { draftsBuilder } = setupSupabaseMock({});
    const res = await DELETE(
      makeDeleteRequest(
        `http://localhost:3000/api/draft?problemSetId=${PROBLEM_SET_ID}`
      )
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe(true);
    expect(draftsBuilder.delete).toHaveBeenCalledTimes(1);
  });
});
