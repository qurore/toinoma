// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks for Supabase + helpers
// ---------------------------------------------------------------------------

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));
vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { createClient } = await import("@/lib/supabase/server");
const { createAdminClient } = await import("@/lib/supabase/admin");
const { checkRateLimit } = await import("@/lib/rate-limit");
const { createNotification } = await import("@/lib/notifications");

const {
  setSubscriptionOverride,
  creditAiUsage,
  deductAiUsage,
  resetAiUsage,
} = await import("./actions");

// ---------------------------------------------------------------------------
// Fixtures and helpers
// ---------------------------------------------------------------------------

const ADMIN_ID = "admin-uuid";
const TARGET_ID = "target-uuid";
const VALID_REASON = "Customer support compensation for incident #1234";

interface MockSubRow {
  tier: "free" | "basic" | "pro";
  manual_override_tier: "free" | "basic" | "pro" | null;
  manual_override_at: string | null;
  version: number;
  current_period_start: string | null;
  current_period_end: string | null;
}

const DEFAULT_SUB: MockSubRow = {
  tier: "free",
  manual_override_tier: null,
  manual_override_at: null,
  version: 5,
  current_period_start: "2026-04-01T00:00:00.000Z",
  current_period_end: "2026-05-01T00:00:00.000Z",
};

const ADMIN_EMAIL = "admin@test.com";
const NON_ADMIN_EMAIL = "student@test.com";

function setupAuthAsAdmin() {
  vi.stubEnv("ADMIN_EMAILS", ADMIN_EMAIL);
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: ADMIN_ID, email: ADMIN_EMAIL } } }),
    },
  } as never);
}

function setupAuthAsNonAdmin() {
  vi.stubEnv("ADMIN_EMAILS", ADMIN_EMAIL);
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: ADMIN_ID, email: NON_ADMIN_EMAIL } } }),
    },
  } as never);
}

function setupAdminClient(opts: {
  sub?: Partial<MockSubRow> | null;
  updatedRow?: { version: number } | null;
  tokenRows?: Array<{ tokens_used: number; adjustment_type?: string | null }>;
  consumptionRows?: Array<{ tokens_used: number }>;
  insertError?: { message: string } | null;
}) {
  const sub = opts.sub === null ? null : { ...DEFAULT_SUB, ...opts.sub };
  const tokenRows = opts.tokenRows ?? [];
  const consumptionRows = opts.consumptionRows ?? [];
  const updatedRow = opts.updatedRow ?? { version: (sub?.version ?? 0) + 1 };
  const insertError = opts.insertError ?? null;

  const insertMock = vi.fn().mockResolvedValue({ error: insertError });

  vi.mocked(createAdminClient).mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === "user_subscriptions") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: sub, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: sub, error: null }),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  maybeSingle: vi
                    .fn()
                    .mockResolvedValue({ data: updatedRow, error: null }),
                })),
              })),
            })),
          })),
        };
      }
      if (table === "admin_audit_logs") {
        return { insert: insertMock };
      }
      if (table === "token_usage") {
        return {
          insert: insertMock,
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockResolvedValue({ data: tokenRows, error: null }),
        };
      }
      if (table === "token_usage_consumption") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockResolvedValue({ data: consumptionRows, error: null }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    }),
  } as never);

  return { insertMock };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.mocked(checkRateLimit).mockResolvedValue({
    allowed: true,
    remaining: 49,
    resetAt: Date.now() + 3_600_000,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// setSubscriptionOverride
// ---------------------------------------------------------------------------

describe("setSubscriptionOverride", () => {
  it("rejects non-admin caller with UNAUTHORIZED", async () => {
    setupAuthAsNonAdmin();
    const result = await setSubscriptionOverride({
      userId: TARGET_ID,
      tier: "pro",
      reason: VALID_REASON,
      expectedVersion: 5,
    });
    expect("error" in result && result.error).toBe("UNAUTHORIZED");
  });

  it("rejects when rate limit exceeded with RATE_LIMITED", async () => {
    setupAuthAsAdmin();
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const result = await setSubscriptionOverride({
      userId: TARGET_ID,
      tier: "pro",
      reason: VALID_REASON,
      expectedVersion: 5,
    });
    expect("error" in result && result.error).toBe("RATE_LIMITED");
  });

  it("rejects reason shorter than 10 chars", async () => {
    setupAuthAsAdmin();
    setupAdminClient({});
    const result = await setSubscriptionOverride({
      userId: TARGET_ID,
      tier: "pro",
      reason: "短い",
      expectedVersion: 5,
    });
    expect("error" in result && result.error).toBe("INVALID_INPUT");
  });

  it("returns CONFLICT when expectedVersion does not match", async () => {
    setupAuthAsAdmin();
    setupAdminClient({ sub: { version: 7 } });
    const result = await setSubscriptionOverride({
      userId: TARGET_ID,
      tier: "pro",
      reason: VALID_REASON,
      expectedVersion: 5,
    });
    expect("error" in result && result.error).toBe("CONFLICT");
    expect("currentVersion" in result && result.currentVersion).toBe(7);
  });

  it("succeeds and bumps version when expectedVersion matches", async () => {
    setupAuthAsAdmin();
    setupAdminClient({ sub: { version: 5 } });
    const result = await setSubscriptionOverride({
      userId: TARGET_ID,
      tier: "pro",
      reason: VALID_REASON,
      expectedVersion: 5,
    });
    expect("success" in result && result.success).toBe(true);
    expect("newVersion" in result && result.newVersion).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// creditAiUsage
// ---------------------------------------------------------------------------

describe("creditAiUsage", () => {
  it("rejects non-admin", async () => {
    setupAuthAsNonAdmin();
    const result = await creditAiUsage({
      userId: TARGET_ID,
      tokens: 1000,
      reason: VALID_REASON,
    });
    expect("error" in result && result.error).toBe("UNAUTHORIZED");
  });

  it("rejects tokens below 1", async () => {
    setupAuthAsAdmin();
    setupAdminClient({});
    const result = await creditAiUsage({
      userId: TARGET_ID,
      tokens: 0,
      reason: VALID_REASON,
    });
    expect("error" in result && result.error).toBe("INVALID_INPUT");
  });

  it("rejects tokens above 10M", async () => {
    setupAuthAsAdmin();
    setupAdminClient({});
    const result = await creditAiUsage({
      userId: TARGET_ID,
      tokens: 10_000_001,
      reason: VALID_REASON,
    });
    expect("error" in result && result.error).toBe("INVALID_INPUT");
  });

  it("inserts a negative-tokens row on success", async () => {
    setupAuthAsAdmin();
    const { insertMock } = setupAdminClient({
      tokenRows: [{ tokens_used: 5000 }],
    });
    const result = await creditAiUsage({
      userId: TARGET_ID,
      tokens: 1000,
      reason: VALID_REASON,
    });
    expect("success" in result && result.success).toBe(true);
    // Should be called twice: audit log insert + token_usage insert
    expect(insertMock).toHaveBeenCalledTimes(2);
    const tokenUsageCall = insertMock.mock.calls.find(
      (call) =>
        call[0] && typeof call[0] === "object" && "adjustment_type" in call[0]
    );
    expect(tokenUsageCall?.[0]).toMatchObject({
      tokens_used: -1000,
      adjustment_type: "credit",
    });
  });
});

// ---------------------------------------------------------------------------
// deductAiUsage
// ---------------------------------------------------------------------------

describe("deductAiUsage", () => {
  it("returns INSUFFICIENT_BALANCE when deduction exceeds balance", async () => {
    setupAuthAsAdmin();
    setupAdminClient({ tokenRows: [{ tokens_used: 2000 }] });
    const result = await deductAiUsage({
      userId: TARGET_ID,
      tokens: 5000,
      reason: VALID_REASON,
    });
    expect("error" in result && result.error).toBe("INSUFFICIENT_BALANCE");
    expect("currentBalance" in result && result.currentBalance).toBe(2000);
  });

  it("succeeds when balance covers deduction", async () => {
    setupAuthAsAdmin();
    const { insertMock } = setupAdminClient({
      tokenRows: [{ tokens_used: 8000 }],
    });
    const result = await deductAiUsage({
      userId: TARGET_ID,
      tokens: 3000,
      reason: VALID_REASON,
    });
    expect("success" in result && result.success).toBe(true);
    const tokenUsageCall = insertMock.mock.calls.find(
      (call) =>
        call[0] && typeof call[0] === "object" && "adjustment_type" in call[0]
    );
    expect(tokenUsageCall?.[0]).toMatchObject({
      tokens_used: 3000,
      adjustment_type: "deduct",
    });
  });

  it("allows exact-balance deduction (post-balance = 0)", async () => {
    setupAuthAsAdmin();
    setupAdminClient({ tokenRows: [{ tokens_used: 1000 }] });
    const result = await deductAiUsage({
      userId: TARGET_ID,
      tokens: 1000,
      reason: VALID_REASON,
    });
    expect("success" in result && result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// resetAiUsage
// ---------------------------------------------------------------------------

describe("resetAiUsage", () => {
  it("inserts an offset row equal to negative organic consumption", async () => {
    setupAuthAsAdmin();
    const { insertMock } = setupAdminClient({
      tokenRows: [{ tokens_used: 7000 }],
      consumptionRows: [
        { tokens_used: 1500 },
        { tokens_used: 3000 },
        { tokens_used: 2500 },
      ],
    });
    const result = await resetAiUsage({
      userId: TARGET_ID,
      reason: VALID_REASON,
    });
    expect("success" in result && result.success).toBe(true);
    expect("offsetTokens" in result && result.offsetTokens).toBe(7000);
    const tokenUsageCall = insertMock.mock.calls.find(
      (call) =>
        call[0] && typeof call[0] === "object" && "adjustment_type" in call[0]
    );
    expect(tokenUsageCall?.[0]).toMatchObject({
      tokens_used: -7000,
      adjustment_type: "reset",
    });
  });

  it("dispatches a notification when notifyUser is true", async () => {
    setupAuthAsAdmin();
    setupAdminClient({
      tokenRows: [{ tokens_used: 5000 }],
      consumptionRows: [{ tokens_used: 5000 }],
    });
    await resetAiUsage({
      userId: TARGET_ID,
      reason: VALID_REASON,
      notifyUser: true,
    });
    expect(createNotification).toHaveBeenCalledTimes(1);
  });

  it("does NOT dispatch notification when notifyUser is false", async () => {
    setupAuthAsAdmin();
    setupAdminClient({
      tokenRows: [{ tokens_used: 5000 }],
      consumptionRows: [{ tokens_used: 5000 }],
    });
    await resetAiUsage({
      userId: TARGET_ID,
      reason: VALID_REASON,
      notifyUser: false,
    });
    expect(createNotification).not.toHaveBeenCalled();
  });
});
