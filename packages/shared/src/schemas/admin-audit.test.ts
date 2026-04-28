import { describe, expect, it } from "vitest";
import {
  aiUsageAdjustmentMetadataSchema,
  tierOverrideMetadataSchema,
} from "./admin-audit";

describe("tierOverrideMetadataSchema", () => {
  const valid = {
    from_tier: "free" as const,
    to_tier: "pro" as const,
    reason: "Customer support compensation for incident #1234",
    prior_override_tier: null,
    prior_override_at: null,
    expected_version: 1,
    new_version: 2,
    notify_user: true,
  };

  it("accepts a complete valid payload", () => {
    expect(() => tierOverrideMetadataSchema.parse(valid)).not.toThrow();
  });

  it("rejects reason shorter than 10 chars", () => {
    expect(() =>
      tierOverrideMetadataSchema.parse({ ...valid, reason: "short" })
    ).toThrow();
  });

  it("rejects reason longer than 500 chars", () => {
    expect(() =>
      tierOverrideMetadataSchema.parse({
        ...valid,
        reason: "x".repeat(501),
      })
    ).toThrow();
  });

  it("accepts null tiers (clearing override)", () => {
    expect(() =>
      tierOverrideMetadataSchema.parse({
        ...valid,
        from_tier: "pro" as const,
        to_tier: null,
      })
    ).not.toThrow();
  });
});

describe("aiUsageAdjustmentMetadataSchema", () => {
  const valid = {
    operation: "credit" as const,
    tokens: 1000,
    reason: "Goodwill gesture for incident #5678",
    period_start: "2026-04-01T00:00:00.000Z",
    period_end: "2026-05-01T00:00:00.000Z",
    balance_before: 5000,
    balance_after: 6000,
    notify_user: true,
  };

  it("accepts a valid credit payload", () => {
    expect(() => aiUsageAdjustmentMetadataSchema.parse(valid)).not.toThrow();
  });

  it("accepts a deduct operation", () => {
    expect(() =>
      aiUsageAdjustmentMetadataSchema.parse({
        ...valid,
        operation: "deduct" as const,
      })
    ).not.toThrow();
  });

  it("accepts a reset operation", () => {
    expect(() =>
      aiUsageAdjustmentMetadataSchema.parse({
        ...valid,
        operation: "reset" as const,
        tokens: -7000,
        balance_after: 0,
      })
    ).not.toThrow();
  });

  it("rejects malformed period_start", () => {
    expect(() =>
      aiUsageAdjustmentMetadataSchema.parse({
        ...valid,
        period_start: "not-an-iso",
      })
    ).toThrow();
  });
});
