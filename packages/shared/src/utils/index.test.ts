import { describe, it, expect } from "vitest";
import {
  PLATFORM_FEE_PERCENT,
  calculatePlatformFee,
  formatScore,
  formatScorePercent,
} from "./index";

describe("PLATFORM_FEE_PERCENT", () => {
  it("equals 15", () => {
    expect(PLATFORM_FEE_PERCENT).toBe(15);
  });
});

describe("calculatePlatformFee", () => {
  it("returns 15 for price 100 (15%)", () => {
    expect(calculatePlatformFee(100)).toBe(15);
  });

  it("returns 150 for price 1000", () => {
    expect(calculatePlatformFee(1000)).toBe(150);
  });

  it("returns 0 for price 0", () => {
    expect(calculatePlatformFee(0)).toBe(0);
  });

  it("rounds correctly for non-integer results", () => {
    // 7 * 0.15 = 1.05 → rounds to 1
    expect(calculatePlatformFee(7)).toBe(1);
    // 1 * 0.15 = 0.15 → rounds to 0
    expect(calculatePlatformFee(1)).toBe(0);
    // 3 * 0.15 = 0.45 → rounds to 0
    expect(calculatePlatformFee(3)).toBe(0);
    // 10 * 0.15 = 1.5 → rounds to 2
    expect(calculatePlatformFee(10)).toBe(2);
  });
});

describe("formatScore", () => {
  it("returns score/maxScore format", () => {
    expect(formatScore(10, 100)).toBe("10/100");
  });

  it("handles zero values", () => {
    expect(formatScore(0, 0)).toBe("0/0");
  });
});

describe("formatScorePercent", () => {
  it("returns 50% for half score", () => {
    expect(formatScorePercent(50, 100)).toBe("50%");
  });

  it("returns 0% when score is 0", () => {
    expect(formatScorePercent(0, 100)).toBe("0%");
  });

  it("returns 0% when maxScore is 0 (division by zero guard)", () => {
    expect(formatScorePercent(0, 0)).toBe("0%");
  });

  it("returns 100% for perfect score", () => {
    expect(formatScorePercent(100, 100)).toBe("100%");
  });

  it("rounds percentage to nearest integer", () => {
    expect(formatScorePercent(33, 100)).toBe("33%");
    expect(formatScorePercent(1, 3)).toBe("33%");
    expect(formatScorePercent(2, 3)).toBe("67%");
  });
});
