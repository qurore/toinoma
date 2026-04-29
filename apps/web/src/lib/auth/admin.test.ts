// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetUser = vi.fn();
const mockRedirect = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
    })
  ),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`REDIRECT:${url}`);
  },
}));

const { isAdmin, requireAdmin, requireAdminAction } = await import("./admin");

describe("isAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false for null email", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    expect(isAdmin(null)).toBe(false);
  });

  it("returns false for undefined email", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    expect(isAdmin(undefined)).toBe(false);
  });

  it("returns false for empty string email", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    expect(isAdmin("")).toBe(false);
  });

  it("returns false when ADMIN_EMAILS is unset (fail-closed)", () => {
    vi.stubEnv("ADMIN_EMAILS", undefined as unknown as string);
    expect(isAdmin("admin@example.com")).toBe(false);
  });

  it("returns false when ADMIN_EMAILS is empty string (fail-closed)", () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(isAdmin("admin@example.com")).toBe(false);
  });

  it("returns true on exact match", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    expect(isAdmin("admin@example.com")).toBe(true);
  });

  it("returns true on case-insensitive match", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    expect(isAdmin("ADMIN@EXAMPLE.COM")).toBe(true);
    expect(isAdmin("Admin@Example.Com")).toBe(true);
  });

  it("returns true with whitespace trimmed on both sides", () => {
    vi.stubEnv("ADMIN_EMAILS", " admin@example.com ");
    expect(isAdmin("  admin@example.com  ")).toBe(true);
  });

  it("returns false for plus-addressed variant (NO normalization)", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    expect(isAdmin("admin+work@example.com")).toBe(false);
    expect(isAdmin("admin+admin@example.com")).toBe(false);
  });

  it("treats plus-addressed entry as distinct from base", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin+ops@example.com");
    expect(isAdmin("admin@example.com")).toBe(false);
    expect(isAdmin("admin+ops@example.com")).toBe(true);
  });

  it("supports multiple comma-separated emails", () => {
    vi.stubEnv("ADMIN_EMAILS", "a@x.com, b@y.com,c@z.com");
    expect(isAdmin("a@x.com")).toBe(true);
    expect(isAdmin("b@y.com")).toBe(true);
    expect(isAdmin("c@z.com")).toBe(true);
    expect(isAdmin("d@w.com")).toBe(false);
  });

  it("filters empty entries from malformed CSV", () => {
    vi.stubEnv("ADMIN_EMAILS", ",,a@x.com,,b@y.com,,");
    expect(isAdmin("a@x.com")).toBe(true);
    expect(isAdmin("b@y.com")).toBe(true);
    expect(isAdmin("")).toBe(false);
  });
});

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects to /login when no user", async () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to / when user is authenticated but email not in allowlist", async () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "student@example.com" } },
    });

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/");
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("redirects to / when user.email is null", async () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: null } },
    });

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/");
  });

  it("returns user when email is in allowlist", async () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    const user = { id: "u1", email: "admin@example.com" };
    mockGetUser.mockResolvedValue({ data: { user } });

    const result = await requireAdmin();
    expect(result.user).toEqual(user);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("returns user when email matches case-insensitively", async () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    const user = { id: "u1", email: "ADMIN@EXAMPLE.COM" };
    mockGetUser.mockResolvedValue({ data: { user } });

    const result = await requireAdmin();
    expect(result.user).toEqual(user);
  });

  it("redirects when ADMIN_EMAILS is unset (fail-closed)", async () => {
    vi.stubEnv("ADMIN_EMAILS", undefined as unknown as string);
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "admin@example.com" } },
    });

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/");
  });
});

describe("requireAdminAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns error when no user (does NOT redirect)", async () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await requireAdminAction();
    expect(result).toEqual({ error: "認証が必要です" });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("returns error when user not in allowlist (does NOT redirect)", async () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "student@example.com" } },
    });

    const result = await requireAdminAction();
    expect(result).toEqual({ error: "管理者権限が必要です" });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("returns error when user.email is null", async () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: null } },
    });

    const result = await requireAdminAction();
    expect(result).toEqual({ error: "管理者権限が必要です" });
  });

  it("returns adminId when authorized", async () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-uuid-123", email: "admin@example.com" } },
    });

    const result = await requireAdminAction();
    expect(result).toEqual({ adminId: "user-uuid-123" });
  });

  it("returns error when ADMIN_EMAILS is unset (fail-closed)", async () => {
    vi.stubEnv("ADMIN_EMAILS", undefined as unknown as string);
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "admin@example.com" } },
    });

    const result = await requireAdminAction();
    expect(result).toEqual({ error: "管理者権限が必要です" });
  });
});
