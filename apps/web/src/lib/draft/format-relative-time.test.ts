// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  formatRelativeTimeJa,
  RELATIVE_TIME_TICK_MS,
} from "./format-relative-time";

// ---------------------------------------------------------------------------
// formatRelativeTimeJa — Japanese relative-time formatter
// ---------------------------------------------------------------------------
// Boundaries (per TDD §7.3):
//   <    5_000 → 「たった今」
//   <   60_000 → 「N秒前」
//   < 3_600_000 → 「N分前」
//   < 86_400_000 → 「N時間前」
//   else → 「N日前」
// ---------------------------------------------------------------------------

describe("formatRelativeTimeJa", () => {
  describe("「たった今」 (just now) class — elapsed < 5s", () => {
    it("returns 「たった今」 for 0ms", () => {
      expect(formatRelativeTimeJa(0)).toBe("たった今");
    });

    it("returns 「たった今」 for 4_999ms (just under 5s)", () => {
      expect(formatRelativeTimeJa(4_999)).toBe("たった今");
    });

    it("returns 「たった今」 for negative inputs (clock skew)", () => {
      expect(formatRelativeTimeJa(-1_000)).toBe("たった今");
    });
  });

  describe("seconds class — 5s <= elapsed < 60s", () => {
    it("returns 「5秒前」 at the 5s boundary", () => {
      expect(formatRelativeTimeJa(5_000)).toBe("5秒前");
    });

    it("returns 「30秒前」 at 30s", () => {
      expect(formatRelativeTimeJa(30_000)).toBe("30秒前");
    });

    it("returns 「59秒前」 at 59_999ms (just under 1min)", () => {
      expect(formatRelativeTimeJa(59_999)).toBe("59秒前");
    });
  });

  describe("minutes class — 60s <= elapsed < 1h", () => {
    it("returns 「1分前」 at the 60s boundary", () => {
      expect(formatRelativeTimeJa(60_000)).toBe("1分前");
    });

    it("returns 「30分前」 at 30min", () => {
      expect(formatRelativeTimeJa(30 * 60_000)).toBe("30分前");
    });

    it("returns 「59分前」 at 59min59s", () => {
      expect(formatRelativeTimeJa(60 * 60_000 - 1)).toBe("59分前");
    });
  });

  describe("hours class — 1h <= elapsed < 1day", () => {
    it("returns 「1時間前」 at the 1h boundary", () => {
      expect(formatRelativeTimeJa(60 * 60_000)).toBe("1時間前");
    });

    it("returns 「12時間前」 at 12h", () => {
      expect(formatRelativeTimeJa(12 * 60 * 60_000)).toBe("12時間前");
    });

    it("returns 「23時間前」 just under 1day", () => {
      expect(formatRelativeTimeJa(24 * 60 * 60_000 - 1)).toBe("23時間前");
    });
  });

  describe("days class — elapsed >= 1day", () => {
    it("returns 「1日前」 at the 1day boundary", () => {
      expect(formatRelativeTimeJa(24 * 60 * 60_000)).toBe("1日前");
    });

    it("returns 「7日前」 at 7days", () => {
      expect(formatRelativeTimeJa(7 * 24 * 60 * 60_000)).toBe("7日前");
    });

    it("returns 「365日前」 at 1 year", () => {
      expect(formatRelativeTimeJa(365 * 24 * 60 * 60_000)).toBe("365日前");
    });
  });
});

describe("RELATIVE_TIME_TICK_MS", () => {
  it("is exported as 30_000ms (30 seconds)", () => {
    expect(RELATIVE_TIME_TICK_MS).toBe(30_000);
  });
});
