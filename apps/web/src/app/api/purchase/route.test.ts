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

vi.mock("@/lib/stripe", () => ({
  createCheckoutSession: vi.fn(),
}));

// Import the mocked modules so we can configure them per test
const { createClient } = await import("@/lib/supabase/server");
const { createCheckoutSession } = await import("@/lib/stripe");

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
    user?: { id: string; email: string } | null;
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
    expect(json.error).toBe("Missing problemSetId");
  });

  it("should return 400 when problemSetId is empty string", async () => {
    setupSupabaseMock({});

    const res = await POST(makeRequest({ problemSetId: "" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Missing problemSetId");
  });

  // -----------------------------------------------------------------------
  // 3. Non-existent or unpublished problem set
  // -----------------------------------------------------------------------
  it("should return 404 when problem set does not exist", async () => {
    setupSupabaseMock({ problemSet: null });

    const res = await POST(makeRequest({ problemSetId: "nonexistent-id" }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Problem set not found");
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
  // 5. Free purchase — creates record directly, no Stripe
  // -----------------------------------------------------------------------
  it("should create a free purchase directly without Stripe", async () => {
    const mockSb = setupSupabaseMock({
      problemSet: freeProblemSet,
      insertResult: { data: null, error: null },
    });

    const res = await POST(makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    // Verify insert was called on the purchases table
    const purchaseInsertChain = mockSb.from.mock.results.find(
      (_r: { value: unknown }, i: number) => mockSb.from.mock.calls[i][0] === "purchases"
    );
    expect(purchaseInsertChain).toBeDefined();

    // Stripe should never have been called for free purchase
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("should return 500 when free purchase insert fails", async () => {
    setupSupabaseMock({
      problemSet: freeProblemSet,
      insertResult: {
        data: null,
        error: { message: "DB insert failed", code: "23505" },
      },
    });

    const res = await POST(makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Failed to create purchase");
  });

  // -----------------------------------------------------------------------
  // 6. Paid purchase — creates Stripe Checkout session
  // -----------------------------------------------------------------------
  it("should create a Stripe checkout session for paid purchase", async () => {
    setupSupabaseMock({});

    const mockCheckoutUrl = "https://checkout.stripe.com/session-xyz";
    vi.mocked(createCheckoutSession).mockResolvedValue({
      url: mockCheckoutUrl,
    } as never);

    const res = await POST(makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.checkoutUrl).toBe(mockCheckoutUrl);

    // Verify createCheckoutSession was called with correct args
    expect(createCheckoutSession).toHaveBeenCalledOnce();
    expect(createCheckoutSession).toHaveBeenCalledWith({
      priceAmountJpy: publishedProblemSet.price,
      problemSetId: MOCK_PROBLEM_SET_ID,
      problemSetName: publishedProblemSet.title,
      creatorStripeAccountId: sellerProfile.stripe_account_id,
      customerEmail: MOCK_USER_EMAIL,
      successUrl: `https://toinoma.jp/problem/${MOCK_PROBLEM_SET_ID}?purchased=true`,
      cancelUrl: `https://toinoma.jp/problem/${MOCK_PROBLEM_SET_ID}`,
    });
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
  // Edge cases
  // -----------------------------------------------------------------------
  it("should use empty string for customerEmail when user has no email", async () => {
    setupSupabaseMock({
      user: { id: MOCK_USER_ID, email: undefined as unknown as string },
    });

    const mockCheckoutUrl = "https://checkout.stripe.com/session-abc";
    vi.mocked(createCheckoutSession).mockResolvedValue({
      url: mockCheckoutUrl,
    } as never);

    const res = await POST(makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.checkoutUrl).toBe(mockCheckoutUrl);

    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: "",
      })
    );
  });

  it("should query problem_sets with published status filter", async () => {
    const mockSb = setupSupabaseMock({});
    vi.mocked(createCheckoutSession).mockResolvedValue({
      url: "https://checkout.stripe.com/test",
    } as never);

    await POST(makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID }));

    // Verify the first from("problem_sets") call chains .eq("status", "published")
    const problemSetsChain = mockSb.from.mock.results[0].value;
    expect(problemSetsChain.eq).toHaveBeenCalledWith("id", MOCK_PROBLEM_SET_ID);
    expect(problemSetsChain.eq).toHaveBeenCalledWith("status", "published");
  });

  it("should check purchase existence with user_id and problem_set_id", async () => {
    const mockSb = setupSupabaseMock({});
    vi.mocked(createCheckoutSession).mockResolvedValue({
      url: "https://checkout.stripe.com/test",
    } as never);

    await POST(makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID }));

    // The second from() call should be to "purchases" to check existing
    const purchasesChain = mockSb.from.mock.results[1].value;
    expect(purchasesChain.eq).toHaveBeenCalledWith("user_id", MOCK_USER_ID);
    expect(purchasesChain.eq).toHaveBeenCalledWith(
      "problem_set_id",
      MOCK_PROBLEM_SET_ID
    );
  });
});
