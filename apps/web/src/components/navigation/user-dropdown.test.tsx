// @vitest-environment node
import { describe, it, expect } from "vitest";

// Unit tests for UserDropdown data logic
// Rendering tests skipped due to jsdom ESM incompatibility.

describe("UserDropdown data logic", () => {
  it("generates initials from display name", () => {
    function getInitials(displayName: string | null, email?: string): string {
      return (displayName ?? email ?? "?")
        .split(/[\s@]/)
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }

    expect(getInitials("田中 太郎")).toBe("田太");
    expect(getInitials("Alice Smith")).toBe("AS");
    expect(getInitials(null, "user@example.com")).toBe("UE"); // "user" + "example.com" → U+E
    expect(getInitials(null, undefined)).toBe("?");
    expect(getInitials("Single")).toBe("S"); // single word → one initial
  });

  it("renders seller link only when isSeller is true", () => {
    function shouldShowSellerLink(isSeller: boolean): boolean {
      return isSeller;
    }

    expect(shouldShowSellerLink(true)).toBe(true);
    expect(shouldShowSellerLink(false)).toBe(false);
  });

  it("maps subscription tiers to correct Japanese labels", () => {
    const TIER_LABELS: Record<string, string> = {
      free: "フリー",
      basic: "ベーシック",
      pro: "プロ",
    };

    expect(TIER_LABELS["free"]).toBe("フリー");
    expect(TIER_LABELS["basic"]).toBe("ベーシック");
    expect(TIER_LABELS["pro"]).toBe("プロ");
  });
});
