// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SUBSCRIPTION_TIERS } from "@toinoma/shared/constants";

// ---------------------------------------------------------------------------
// Mock helpers for Supabase's chainable query builder pattern
// ---------------------------------------------------------------------------

type MockQueryResult<T = unknown> = {
  data: T | null;
  error: { message: string; code: string } | null;
  count?: number | null;
};

function createChainableQuery<T>(
  result: MockQueryResult<T>,
  countValue?: number | null
) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    // For count queries that resolve to { count } instead of going through single()
  };
  // When a count query is needed, the chain resolves to { count } directly
  // after gte() (the last method in the chain for the submissions count query)
  if (countValue !== undefined) {
    chain.gte.mockResolvedValue({ count: countValue, data: null, error: null });
  }
  return chain;
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Import the mocked module so we can configure it per test
const { createClient } = await import("@/lib/supabase/server");

// Import the function under test
const { getSubscriptionState } = await import("./subscription");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_USER_ID = "user-uuid-123";

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("getSubscriptionState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Helper to configure the Supabase mock per test.
  // Tracks from() calls by table name and returns appropriate chain builders.
  // -------------------------------------------------------------------------
  function setupSupabaseMock(options: {
    subscription?: {
      tier: string;
      status: string;
      current_period_end: string | null;
      cancel_at_period_end: boolean;
    } | null;
    gradingCount?: number;
  }) {
    const { subscription = null, gradingCount = 0 } = options;

    // Build chainable queries for each table call
    const subscriptionQuery = createChainableQuery({
      data: subscription,
      error: subscription ? null : { message: "Not found", code: "PGRST116" },
    });

    const submissionsQuery = createChainableQuery(
      { data: null, error: null },
      gradingCount
    );

    const fromCalls: Record<string, ReturnType<typeof createChainableQuery>[]> =
      {
        user_subscriptions: [subscriptionQuery],
        submissions: [submissionsQuery],
      };

    const fromCallIndex: Record<string, number> = {};

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (!fromCallIndex[table]) fromCallIndex[table] = 0;
        const chains = fromCalls[table] ?? [
          createChainableQuery({ data: null, error: null }),
        ];
        const chain =
          chains[fromCallIndex[table]] ?? chains[chains.length - 1];
        fromCallIndex[table]++;
        return chain;
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
    return mockSupabase;
  }

  // -------------------------------------------------------------------------
  // 1. Returns free tier with 3 grading limit when no subscription exists
  // -------------------------------------------------------------------------
  it("should return free tier with 3 grading limit when no subscription exists", async () => {
    setupSupabaseMock({ subscription: null, gradingCount: 0 });

    const state = await getSubscriptionState(MOCK_USER_ID);

    expect(state.tier).toBe("free");
    expect(state.isActive).toBe(true);
    expect(state.gradingLimit).toBe(SUBSCRIPTION_TIERS.free.gradingLimit);
    expect(state.gradingLimit).toBe(3);
    expect(state.gradingsUsedThisMonth).toBe(0);
    expect(state.gradingsRemaining).toBe(3);
    expect(state.canGrade).toBe(true);
    expect(state.currentPeriodEnd).toBeNull();
    expect(state.cancelAtPeriodEnd).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 2. Returns correct grading usage count
  // -------------------------------------------------------------------------
  it("should return correct grading usage count", async () => {
    setupSupabaseMock({ subscription: null, gradingCount: 2 });

    const state = await getSubscriptionState(MOCK_USER_ID);

    expect(state.gradingsUsedThisMonth).toBe(2);
    expect(state.gradingsRemaining).toBe(1);
    expect(state.canGrade).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 3. Returns canGrade=false when limit reached for free tier
  // -------------------------------------------------------------------------
  it("should return canGrade=false when limit reached for free tier", async () => {
    setupSupabaseMock({ subscription: null, gradingCount: 3 });

    const state = await getSubscriptionState(MOCK_USER_ID);

    expect(state.tier).toBe("free");
    expect(state.gradingsUsedThisMonth).toBe(3);
    expect(state.gradingsRemaining).toBe(0);
    expect(state.canGrade).toBe(false);
  });

  it("should return canGrade=false when over limit for free tier", async () => {
    setupSupabaseMock({ subscription: null, gradingCount: 5 });

    const state = await getSubscriptionState(MOCK_USER_ID);

    expect(state.gradingsRemaining).toBe(0);
    expect(state.canGrade).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 4. Returns canGrade=true for pro tier (unlimited)
  // -------------------------------------------------------------------------
  it("should return canGrade=true for pro tier with unlimited grading", async () => {
    setupSupabaseMock({
      subscription: {
        tier: "pro",
        status: "active",
        current_period_end: "2026-03-13T00:00:00Z",
        cancel_at_period_end: false,
      },
      gradingCount: 100,
    });

    const state = await getSubscriptionState(MOCK_USER_ID);

    expect(state.tier).toBe("pro");
    expect(state.isActive).toBe(true);
    expect(state.gradingLimit).toBe(SUBSCRIPTION_TIERS.pro.gradingLimit);
    expect(state.gradingLimit).toBe(-1);
    expect(state.gradingsUsedThisMonth).toBe(100);
    expect(state.gradingsRemaining).toBe(Infinity);
    expect(state.canGrade).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 5. Returns correct tier and period info from subscription record
  // -------------------------------------------------------------------------
  it("should return correct tier and period info from active subscription", async () => {
    const periodEnd = "2026-03-15T00:00:00Z";

    setupSupabaseMock({
      subscription: {
        tier: "basic",
        status: "active",
        current_period_end: periodEnd,
        cancel_at_period_end: false,
      },
      gradingCount: 10,
    });

    const state = await getSubscriptionState(MOCK_USER_ID);

    expect(state.tier).toBe("basic");
    expect(state.isActive).toBe(true);
    expect(state.gradingLimit).toBe(SUBSCRIPTION_TIERS.basic.gradingLimit);
    expect(state.gradingLimit).toBe(30);
    expect(state.gradingsUsedThisMonth).toBe(10);
    expect(state.gradingsRemaining).toBe(20);
    expect(state.canGrade).toBe(true);
    expect(state.currentPeriodEnd).toBe(periodEnd);
    expect(state.cancelAtPeriodEnd).toBe(false);
  });

  it("should return correct info for subscription set to cancel at period end", async () => {
    const periodEnd = "2026-03-15T00:00:00Z";

    setupSupabaseMock({
      subscription: {
        tier: "pro",
        status: "active",
        current_period_end: periodEnd,
        cancel_at_period_end: true,
      },
      gradingCount: 50,
    });

    const state = await getSubscriptionState(MOCK_USER_ID);

    expect(state.tier).toBe("pro");
    expect(state.isActive).toBe(true);
    expect(state.cancelAtPeriodEnd).toBe(true);
    expect(state.currentPeriodEnd).toBe(periodEnd);
    expect(state.canGrade).toBe(true);
  });

  it("should treat trialing status as active", async () => {
    setupSupabaseMock({
      subscription: {
        tier: "basic",
        status: "trialing",
        current_period_end: "2026-04-01T00:00:00Z",
        cancel_at_period_end: false,
      },
      gradingCount: 0,
    });

    const state = await getSubscriptionState(MOCK_USER_ID);

    expect(state.isActive).toBe(true);
    expect(state.tier).toBe("basic");
  });

  // -------------------------------------------------------------------------
  // Query verification
  // -------------------------------------------------------------------------
  it("should query user_subscriptions with correct user_id and fields", async () => {
    const mockSb = setupSupabaseMock({ subscription: null, gradingCount: 0 });

    await getSubscriptionState(MOCK_USER_ID);

    // First from() call should be user_subscriptions
    expect(mockSb.from.mock.calls[0][0]).toBe("user_subscriptions");
    const subscriptionChain = mockSb.from.mock.results[0].value;
    expect(subscriptionChain.select).toHaveBeenCalledWith(
      "tier, status, current_period_end, cancel_at_period_end"
    );
    expect(subscriptionChain.eq).toHaveBeenCalledWith("user_id", MOCK_USER_ID);
  });

  it("should query submissions count with user_id and start of month", async () => {
    const mockSb = setupSupabaseMock({ subscription: null, gradingCount: 0 });

    await getSubscriptionState(MOCK_USER_ID);

    // Second from() call should be submissions
    expect(mockSb.from.mock.calls[1][0]).toBe("submissions");
    const submissionsChain = mockSb.from.mock.results[1].value;
    expect(submissionsChain.select).toHaveBeenCalledWith("id", {
      count: "exact",
      head: true,
    });
    expect(submissionsChain.eq).toHaveBeenCalledWith("user_id", MOCK_USER_ID);
    // The start-of-month timestamp depends on the local timezone, so we
    // match any ISO-8601 string that falls on the 1st of the current month.
    expect(submissionsChain.gte).toHaveBeenCalledWith(
      "created_at",
      expect.stringMatching(/^\d{4}-\d{2}-01T\d{2}:00:00\.000Z$/)
    );
  });

  // -------------------------------------------------------------------------
  // Edge case: basic tier at exactly its limit
  // -------------------------------------------------------------------------
  it("should return canGrade=false for basic tier at limit", async () => {
    setupSupabaseMock({
      subscription: {
        tier: "basic",
        status: "active",
        current_period_end: "2026-03-15T00:00:00Z",
        cancel_at_period_end: false,
      },
      gradingCount: 30,
    });

    const state = await getSubscriptionState(MOCK_USER_ID);

    expect(state.tier).toBe("basic");
    expect(state.gradingLimit).toBe(30);
    expect(state.gradingsUsedThisMonth).toBe(30);
    expect(state.gradingsRemaining).toBe(0);
    expect(state.canGrade).toBe(false);
  });
});
