// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock helpers for Supabase's chainable query builder pattern
// ---------------------------------------------------------------------------

type MockQueryResult<T = unknown> = {
  data: T | null;
  error: { message: string; code: string } | null;
};

/**
 * Creates a chainable mock that mirrors Supabase's PostgREST builder.
 * Supports: from().select().eq().single() and from().insert()
 */
function createChainableQuery<T>(result: MockQueryResult<T>) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { current_uses: 0 }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  }),
}));

const mockStripeCheckoutCreate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    checkout: {
      sessions: {
        create: mockStripeCheckoutCreate,
      },
    },
  })),
}));

// Mock rate limiter to always allow requests in tests
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByUser: vi.fn().mockReturnValue({ allowed: true, remaining: 99, resetAt: 0 }),
}));

// Mock notifications (fire-and-forget, should not affect test outcomes)
vi.mock("@/lib/notifications", () => ({
  notifyPurchase: vi.fn().mockResolvedValue(undefined),
  notifySale: vi.fn().mockResolvedValue(undefined),
}));

// Import the mocked modules so we can configure them per test
const { createClient } = await import("@/lib/supabase/server");

// Import the route handler under test
const { POST } = await import("./route");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_USER_ID = "user-uuid-123";
const MOCK_USER_EMAIL = "student@example.com";
const MOCK_PROBLEM_SET_ID = "ps-uuid-456";

const publishedProblemSet = {
  id: MOCK_PROBLEM_SET_ID,
  title: "Test Problem Set",
  price: 500,
  seller_id: "seller-uuid-789",
  status: "published",
};

const freeProblemSet = {
  ...publishedProblemSet,
  price: 0,
};

const sellerProfile = {
  stripe_account_id: "acct_stripe_123",
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/purchase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("POST /api/purchase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://toinoma.jp";
  });

  // -----------------------------------------------------------------------
  // Helper to configure the Supabase mock per test.
  // Each call to `from(tableName)` returns a different chainable builder
  // depending on the table and the test scenario.
  // -----------------------------------------------------------------------
  function setupSupabaseMock(options: {
    user?: { id: string; email: string; user_metadata?: Record<string, string> } | null;
    problemSet?: typeof publishedProblemSet | null;
    existingPurchase?: { id: string } | null;
    insertResult?: MockQueryResult;
    sellerProfile?: typeof sellerProfile | null;
  }) {
    const {
      user = { id: MOCK_USER_ID, email: MOCK_USER_EMAIL },
      problemSet = publishedProblemSet,
      existingPurchase = null,
      insertResult = { data: null, error: null },
      sellerProfile: sp = sellerProfile,
    } = options;

    // Track which "from" call we're on for each table
    const fromCalls: Record<string, ReturnType<typeof createChainableQuery>[]> =
      {
        problem_sets: [
          createChainableQuery({ data: problemSet, error: null }),
        ],
        purchases: [
          // First call: check existing purchase
          createChainableQuery({ data: existingPurchase, error: null }),
          // Second call: insert (for free purchase)
          createChainableQuery(insertResult),
        ],
        seller_profiles: [
          createChainableQuery({ data: sp, error: null }),
        ],
      };

    const fromCallIndex: Record<string, number> = {};

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user },
        }),
      },
      from: vi.fn((table: string) => {
        if (!fromCallIndex[table]) fromCallIndex[table] = 0;
        const chains = fromCalls[table] ?? [
          createChainableQuery({ data: null, error: null }),
        ];
        const chain = chains[fromCallIndex[table]] ?? chains[chains.length - 1];
        fromCallIndex[table]++;
        return chain;
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
    return mockSupabase;
  }

  // -----------------------------------------------------------------------
  // 1. Authentication
  // -----------------------------------------------------------------------
  it("should return 401 for unauthenticated requests", async () => {
    setupSupabaseMock({ user: null });

    const res = await POST(makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  // -----------------------------------------------------------------------
  // 2. Missing problemSetId
  // -----------------------------------------------------------------------
  it("should return 400 when problemSetId is missing", async () => {
    setupSupabaseMock({});

    const res = await POST(makeRequest({}));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Missing or invalid problemSetId");
  });

  it("should return 400 when problemSetId is empty string", async () => {
    setupSupabaseMock({});

    const res = await POST(makeRequest({ problemSetId: "" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Missing or invalid problemSetId");
  });

  // -----------------------------------------------------------------------
  // 3. Non-existent or unpublished problem set
  // -----------------------------------------------------------------------
  it("should return 404 when problem set does not exist", async () => {
    setupSupabaseMock({ problemSet: null });

    const res = await POST(makeRequest({ problemSetId: "nonexistent-id" }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Problem set not found or not published");
  });

  // -----------------------------------------------------------------------
  // 4. Already purchased
  // -----------------------------------------------------------------------
  it("should return 409 when problem set is already purchased", async () => {
    setupSupabaseMock({
      existingPurchase: { id: "purchase-existing-uuid" },
    });

    const res = await POST(makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toBe("Already purchased");
  });

  // -----------------------------------------------------------------------
  // 5. Free purchase -- creates record directly, no Stripe
  // -----------------------------------------------------------------------
  it("should create a free purchase directly without Stripe", async () => {
    setupSupabaseMock({
      problemSet: freeProblemSet,
      insertResult: { data: null, error: null },
    });

    const res = await POST(makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.free).toBe(true);

    // Stripe checkout should never have been called for free purchase
    expect(mockStripeCheckoutCreate).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 6. Paid purchase -- creates Stripe Checkout session
  // -----------------------------------------------------------------------
  it("should create a Stripe checkout session for paid purchase", async () => {
    setupSupabaseMock({});

    const mockCheckoutUrl = "https://checkout.stripe.com/session-xyz";
    mockStripeCheckoutCreate.mockResolvedValue({
      url: mockCheckoutUrl,
    });

    const res = await POST(makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.checkoutUrl).toBe(mockCheckoutUrl);

    // Verify stripe.checkout.sessions.create was called
    expect(mockStripeCheckoutCreate).toHaveBeenCalledOnce();
    const callArgs = mockStripeCheckoutCreate.mock.calls[0][0];
    expect(callArgs.mode).toBe("payment");
    expect(callArgs.line_items[0].price_data.unit_amount).toBe(publishedProblemSet.price);
    expect(callArgs.metadata.problem_set_id).toBe(MOCK_PROBLEM_SET_ID);
    expect(callArgs.metadata.user_id).toBe(MOCK_USER_ID);
  });

  // -----------------------------------------------------------------------
  // 7. Seller has no Stripe account
  // -----------------------------------------------------------------------
  it("should return 400 when seller has no Stripe account configured", async () => {
    setupSupabaseMock({
      sellerProfile: { stripe_account_id: null as unknown as string },
    });

    const res = await POST(makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Seller payment not configured");
  });

  it("should return 400 when seller profile does not exist", async () => {
    setupSupabaseMock({
      sellerProfile: null,
    });

    const res = await POST(makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Seller payment not configured");
  });

  // -----------------------------------------------------------------------
  // 8. Edge cases
  // -----------------------------------------------------------------------
  it("should use empty string for customerEmail when user has no email", async () => {
    setupSupabaseMock({
      user: { id: MOCK_USER_ID, email: undefined as unknown as string },
    });

    const mockCheckoutUrl = "https://checkout.stripe.com/session-abc";
    mockStripeCheckoutCreate.mockResolvedValue({
      url: mockCheckoutUrl,
    });

    const res = await POST(makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.checkoutUrl).toBe(mockCheckoutUrl);

    const callArgs = mockStripeCheckoutCreate.mock.calls[0][0];
    expect(callArgs.customer_email).toBe("");
  });

  it("should query problem_sets with published status filter", async () => {
    const mockSb = setupSupabaseMock({});
    mockStripeCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/test",
    });

    await POST(makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID }));

    // Verify the first from("problem_sets") call chains .eq("status", "published")
    const problemSetsChain = mockSb.from.mock.results[0].value;
    expect(problemSetsChain.eq).toHaveBeenCalledWith("id", MOCK_PROBLEM_SET_ID);
    expect(problemSetsChain.eq).toHaveBeenCalledWith("status", "published");
  });

  it("should check purchase existence with user_id and problem_set_id", async () => {
    const mockSb = setupSupabaseMock({});
    mockStripeCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/test",
    });

    await POST(makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID }));

    // The second from() call should be to "purchases" to check existing
    const purchasesChain = mockSb.from.mock.results[1].value;
    expect(purchasesChain.eq).toHaveBeenCalledWith("user_id", MOCK_USER_ID);
    expect(purchasesChain.eq).toHaveBeenCalledWith(
      "problem_set_id",
      MOCK_PROBLEM_SET_ID
    );
  });

  // -----------------------------------------------------------------------
  // 9. Self-purchase prevention
  // -----------------------------------------------------------------------
  it("should return 400 when seller tries to buy own problem set", async () => {
    setupSupabaseMock({
      user: { id: "seller-uuid-789", email: MOCK_USER_EMAIL },
      problemSet: publishedProblemSet,
    });

    const res = await POST(makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Cannot purchase your own problem set");
  });
});
