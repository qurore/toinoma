// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: () => ({ select: mockSelect }),
    })
  ),
}));

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`REDIRECT:${url}`);
  },
}));

// Import after mocks
const { requireAuth, getSellerTosStatus, requireSellerTos, requireCompleteSeller } =
  await import("./require-seller");

describe("requireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
  });

  it("redirects to /login when no user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(requireAuth()).rejects.toThrow("REDIRECT:/login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("returns user when authenticated", async () => {
    const user = { id: "user-1", email: "test@test.com" };
    mockGetUser.mockResolvedValue({ data: { user } });

    const result = await requireAuth();
    expect(result.user).toEqual(user);
  });
});

describe("getSellerTosStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
  });

  it("returns tosAccepted=false when no seller profile exists", async () => {
    const user = { id: "user-1", email: "test@test.com" };
    mockGetUser.mockResolvedValue({ data: { user } });
    mockSingle.mockResolvedValue({ data: null });

    const result = await getSellerTosStatus();
    expect(result.tosAccepted).toBe(false);
    expect(result.sellerProfile).toBeNull();
  });

  it("returns tosAccepted=false when tos_accepted_at is null", async () => {
    const user = { id: "user-1", email: "test@test.com" };
    mockGetUser.mockResolvedValue({ data: { user } });
    mockSingle.mockResolvedValue({
      data: { tos_accepted_at: null, stripe_account_id: null },
    });

    const result = await getSellerTosStatus();
    expect(result.tosAccepted).toBe(false);
  });

  it("returns tosAccepted=true when tos_accepted_at is set", async () => {
    const user = { id: "user-1", email: "test@test.com" };
    mockGetUser.mockResolvedValue({ data: { user } });
    mockSingle.mockResolvedValue({
      data: {
        tos_accepted_at: "2026-03-23T00:00:00Z",
        seller_display_name: "__pending__",
        stripe_account_id: null,
      },
    });

    const result = await getSellerTosStatus();
    expect(result.tosAccepted).toBe(true);
  });
});

describe("requireSellerTos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
  });

  it("redirects to /seller when ToS not accepted", async () => {
    const user = { id: "user-1", email: "test@test.com" };
    mockGetUser.mockResolvedValue({ data: { user } });
    mockSingle.mockResolvedValue({ data: null });

    await expect(requireSellerTos()).rejects.toThrow("REDIRECT:/seller");
    expect(mockRedirect).toHaveBeenCalledWith("/seller");
  });

  it("returns user and profile when ToS is accepted", async () => {
    const user = { id: "user-1", email: "test@test.com" };
    const profile = {
      id: "user-1",
      tos_accepted_at: "2026-03-23T00:00:00Z",
      seller_display_name: "Test Seller",
      stripe_account_id: null,
    };
    mockGetUser.mockResolvedValue({ data: { user } });
    mockSingle.mockResolvedValue({ data: profile });

    const result = await requireSellerTos();
    expect(result.user).toEqual(user);
    expect(result.sellerProfile).toEqual(profile);
  });
});

describe("requireCompleteSeller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
  });

  it("redirects to /seller/onboarding when Stripe not complete", async () => {
    const user = { id: "user-1", email: "test@test.com" };
    mockGetUser.mockResolvedValue({ data: { user } });
    mockSingle.mockResolvedValue({
      data: {
        tos_accepted_at: "2026-03-23T00:00:00Z",
        seller_display_name: "Test",
        stripe_account_id: null,
      },
    });

    await expect(requireCompleteSeller()).rejects.toThrow(
      "REDIRECT:/seller/onboarding"
    );
  });

  it("returns profile when fully onboarded", async () => {
    const user = { id: "user-1", email: "test@test.com" };
    const profile = {
      id: "user-1",
      tos_accepted_at: "2026-03-23T00:00:00Z",
      seller_display_name: "Test Seller",
      stripe_account_id: "acct_123",
    };
    mockGetUser.mockResolvedValue({ data: { user } });
    mockSingle.mockResolvedValue({ data: profile });

    const result = await requireCompleteSeller();
    expect(result.sellerProfile).toEqual(profile);
  });
});
