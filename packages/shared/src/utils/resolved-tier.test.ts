import { describe, expect, it } from "vitest";
import { getResolvedTier, hasOverrideMismatch } from "./resolved-tier";

describe("getResolvedTier", () => {
  it("returns tier when no override", () => {
    expect(
      getResolvedTier({ tier: "pro", manual_override_tier: null })
    ).toBe("pro");
  });

  it("returns override when set, ignoring tier", () => {
    expect(
      getResolvedTier({ tier: "free", manual_override_tier: "pro" })
    ).toBe("pro");
  });

  it("returns override even when override matches tier", () => {
    expect(
      getResolvedTier({ tier: "basic", manual_override_tier: "basic" })
    ).toBe("basic");
  });

  it("handles all enum combinations", () => {
    const tiers = ["free", "basic", "pro"] as const;
    for (const tier of tiers) {
      expect(getResolvedTier({ tier, manual_override_tier: null })).toBe(tier);
      for (const override of tiers) {
        expect(
          getResolvedTier({ tier, manual_override_tier: override })
        ).toBe(override);
      }
    }
  });
});

describe("hasOverrideMismatch", () => {
  it("returns false when no override", () => {
    expect(
      hasOverrideMismatch({ tier: "pro", manual_override_tier: null })
    ).toBe(false);
  });

  it("returns false when override matches tier", () => {
    expect(
      hasOverrideMismatch({ tier: "pro", manual_override_tier: "pro" })
    ).toBe(false);
  });

  it("returns true when override differs from tier", () => {
    expect(
      hasOverrideMismatch({ tier: "free", manual_override_tier: "pro" })
    ).toBe(true);
  });
});
