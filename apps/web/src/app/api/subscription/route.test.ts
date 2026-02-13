// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock helpers for Supabase's chainable query builder pattern
// ---------------------------------------------------------------------------

type MockQueryResult<T = unknown> = {
  data: T | null;
  error: { message: string; code: string } | null;
};

function createChainableQuery<T>(result: MockQueryResult<T>) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    gte: vi.fn().mockReturnThis(),
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
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
}));

vi.mock("@/lib/stripe", () => ({
  createOrRetrieveCustomer: vi.fn(),
  createSubscriptionCheckout: vi.fn(),
  cancelSubscription: vi.fn(),
  resumeSubscription: vi.fn(),
  getSubscriptionPriceId: vi.fn(),
}));

// Import the mocked modules so we can configure them per test
const { createClient } = await import("@/lib/supabase/server");
const {
  createOrRetrieveCustomer,
  createSubscriptionCheckout,
  cancelSubscription,
  resumeSubscription,
  getSubscriptionPriceId,
} = await import("@/lib/stripe");

// Import the route handlers under test
const { POST, PATCH } = await import("./route");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_USER_ID = "user-uuid-123";
const MOCK_USER_EMAIL = "student@example.com";
const MOCK_CUSTOMER_ID = "cus_mock_123";
const MOCK_PRICE_ID = "price_mock_456";
const MOCK_SUBSCRIPTION_ID = "sub_mock_789";
const MOCK_CHECKOUT_URL = "https://checkout.stripe.com/session/mock";

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePatchRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/subscription", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("POST /api/subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Helper to configure the Supabase mock per test
  // -------------------------------------------------------------------------
  function setupSupabaseMock(options: {
    user?: { id: string; email?: string } | null;
  }) {
    const {
      user = { id: MOCK_USER_ID, email: MOCK_USER_EMAIL },
    } = options;

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user },
        }),
      },
      from: vi.fn().mockReturnValue(createChainableQuery({ data: null, error: null })),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    // Configure stripe mocks with defaults
    vi.mocked(getSubscriptionPriceId).mockReturnValue(MOCK_PRICE_ID);
    vi.mocked(createOrRetrieveCustomer).mockResolvedValue(MOCK_CUSTOMER_ID);
    vi.mocked(createSubscriptionCheckout).mockResolvedValue({
      url: MOCK_CHECKOUT_URL,
    } as never);

    return mockSupabase;
  }

  // -------------------------------------------------------------------------
  // 1. POST: Returns 401 when not authenticated
  // -------------------------------------------------------------------------
  it("should return 401 when not authenticated", async () => {
    setupSupabaseMock({ user: null });

    const res = await POST(
      makePostRequest({ tier: "pro", interval: "monthly" })
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  // -------------------------------------------------------------------------
  // 2. POST: Returns 400 when tier is missing
  // -------------------------------------------------------------------------
  it("should return 400 when tier is missing", async () => {
    setupSupabaseMock({});

    const res = await POST(
      makePostRequest({ interval: "monthly" })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid tier or interval");
  });

  // -------------------------------------------------------------------------
  // 3. POST: Returns 400 when interval is invalid
  // -------------------------------------------------------------------------
  it("should return 400 when interval is invalid", async () => {
    setupSupabaseMock({});

    const res = await POST(
      makePostRequest({ tier: "pro", interval: "weekly" })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid interval");
  });

  // -------------------------------------------------------------------------
  // 4. POST: Returns checkout URL on success
  // -------------------------------------------------------------------------
  it("should return checkout URL on success", async () => {
    setupSupabaseMock({});

    const res = await POST(
      makePostRequest({ tier: "pro", interval: "monthly" })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toBe(MOCK_CHECKOUT_URL);

    // Verify stripe functions were called correctly
    expect(getSubscriptionPriceId).toHaveBeenCalledWith("pro", "monthly");
    expect(createOrRetrieveCustomer).toHaveBeenCalledWith(
      MOCK_USER_EMAIL,
      MOCK_USER_ID
    );
    expect(createSubscriptionCheckout).toHaveBeenCalledWith({
      customerId: MOCK_CUSTOMER_ID,
      priceId: MOCK_PRICE_ID,
      successUrl: expect.stringContaining("/settings/subscription?success=true"),
      cancelUrl: expect.stringContaining("/settings/subscription?canceled=true"),
      userId: MOCK_USER_ID,
    });
  });

  it("should return 400 when tier is invalid value", async () => {
    setupSupabaseMock({});

    const res = await POST(
      makePostRequest({ tier: "enterprise", interval: "monthly" })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid tier or interval");
  });

  it("should upsert stripe customer ID into user_subscriptions", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        upsert: mockUpsert,
      }),
    } as never);

    setupSupabaseMock({});

    await POST(makePostRequest({ tier: "basic", interval: "annual" }));

    expect(vi.mocked(createAdminClient)).toHaveBeenCalled();
  });
});

describe("PATCH /api/subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Helper to configure the Supabase mock for PATCH tests
  // -------------------------------------------------------------------------
  function setupSupabaseMock(options: {
    user?: { id: string; email?: string } | null;
    subscription?: { stripe_subscription_id: string | null } | null;
  }) {
    const {
      user = { id: MOCK_USER_ID, email: MOCK_USER_EMAIL },
      subscription = { stripe_subscription_id: MOCK_SUBSCRIPTION_ID },
    } = options;

    const fromCalls: Record<
      string,
      ReturnType<typeof createChainableQuery>[]
    > = {
      user_subscriptions: [
        createChainableQuery({ data: subscription, error: null }),
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
    vi.mocked(cancelSubscription).mockResolvedValue(undefined as never);
    vi.mocked(resumeSubscription).mockResolvedValue(undefined as never);

    return mockSupabase;
  }

  // -------------------------------------------------------------------------
  // 5. PATCH: Returns 401 when not authenticated
  // -------------------------------------------------------------------------
  it("should return 401 when not authenticated", async () => {
    setupSupabaseMock({ user: null });

    const res = await PATCH(
      makePatchRequest({ action: "cancel" })
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  // -------------------------------------------------------------------------
  // 6. PATCH: Returns 400 when action is invalid
  // -------------------------------------------------------------------------
  it("should return 400 when action is invalid", async () => {
    setupSupabaseMock({});

    const res = await PATCH(
      makePatchRequest({ action: "upgrade" })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid action");
  });

  it("should return 400 when action is missing", async () => {
    setupSupabaseMock({});

    const res = await PATCH(makePatchRequest({}));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid action");
  });

  // -------------------------------------------------------------------------
  // 7. PATCH: Returns 404 when no subscription found
  // -------------------------------------------------------------------------
  it("should return 404 when no subscription found", async () => {
    setupSupabaseMock({ subscription: null });

    const res = await PATCH(
      makePatchRequest({ action: "cancel" })
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("No active subscription found");
  });

  it("should return 404 when subscription has no stripe_subscription_id", async () => {
    setupSupabaseMock({
      subscription: { stripe_subscription_id: null },
    });

    const res = await PATCH(
      makePatchRequest({ action: "cancel" })
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("No active subscription found");
  });

  // -------------------------------------------------------------------------
  // 8. PATCH: Returns success for cancel action
  // -------------------------------------------------------------------------
  it("should return success for cancel action", async () => {
    setupSupabaseMock({});

    const res = await PATCH(
      makePatchRequest({ action: "cancel" })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(cancelSubscription).toHaveBeenCalledWith(MOCK_SUBSCRIPTION_ID);
    expect(resumeSubscription).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 9. PATCH: Returns success for resume action
  // -------------------------------------------------------------------------
  it("should return success for resume action", async () => {
    setupSupabaseMock({});

    const res = await PATCH(
      makePatchRequest({ action: "resume" })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(resumeSubscription).toHaveBeenCalledWith(MOCK_SUBSCRIPTION_ID);
    expect(cancelSubscription).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Query verification
  // -------------------------------------------------------------------------
  it("should query user_subscriptions with correct user_id", async () => {
    const mockSb = setupSupabaseMock({});

    await PATCH(makePatchRequest({ action: "cancel" }));

    // Verify the from call targeted user_subscriptions
    expect(mockSb.from).toHaveBeenCalledWith("user_subscriptions");
    const subscriptionsChain = mockSb.from.mock.results[0].value;
    expect(subscriptionsChain.select).toHaveBeenCalledWith(
      "stripe_subscription_id"
    );
    expect(subscriptionsChain.eq).toHaveBeenCalledWith("user_id", MOCK_USER_ID);
  });
});
