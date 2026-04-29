// @vitest-environment node
//
// Component-rendering tests are skipped because jsdom + @testing-library has
// an ESM incompatibility with @exodus/bytes in this monorepo (see ShareButton
// and other component tests for the same workaround). Instead we test the
// pure `derivePresentation()` function which contains all the user-visible
// behavior of AutoSaveIndicator.

import { describe, expect, it } from "vitest";

import { derivePresentation } from "./auto-save-indicator";
import type { DraftState } from "@/lib/draft/save-state-machine";

function makeState(overrides: Partial<DraftState> = {}): DraftState {
  return {
    status: "idle",
    lastSavedAt: null,
    errorMessage: null,
    attempt: 0,
    nextRetryDelayMs: 0,
    ...overrides,
  };
}

describe("derivePresentation", () => {
  it("returns null icon and empty text when idle", () => {
    const out = derivePresentation(makeState(), "");
    expect(out.iconKey).toBeNull();
    expect(out.visibleText).toBe("");
    expect(out.ariaText).toBe("");
    expect(out.showRetryButton).toBe(false);
  });

  it("renders saving with loader and Japanese text", () => {
    const out = derivePresentation(makeState({ status: "saving" }), "");
    expect(out.iconKey).toBe("loader");
    expect(out.visibleText).toBe("保存中…");
    expect(out.ariaText).toBe("下書きを保存しています");
    expect(out.toneClass).toBe("text-muted-foreground");
  });

  it("renders saved with relative time when lastSavedAt is present", () => {
    const out = derivePresentation(
      makeState({
        status: "saved",
        lastSavedAt: new Date().toISOString(),
      }),
      "10秒前"
    );
    expect(out.iconKey).toBe("check");
    expect(out.visibleText).toBe("保存済み · 10秒前");
    expect(out.ariaText).toBe("下書きが保存されました");
    expect(out.toneClass).toBe("text-success");
  });

  it("renders saved without relative time when lastSavedAt is null", () => {
    const out = derivePresentation(makeState({ status: "saved" }), "");
    expect(out.visibleText).toBe("保存済み");
  });

  it("renders retrying with attempt count and ETA seconds", () => {
    const out = derivePresentation(
      makeState({ status: "retrying", attempt: 2, nextRetryDelayMs: 4000 }),
      ""
    );
    expect(out.iconKey).toBe("rotate");
    expect(out.visibleText).toBe("再送信中 (2/5) · 4秒後に再試行");
    expect(out.ariaText).toContain("2回目");
    expect(out.toneClass).toBe("text-amber-600");
  });

  it("rounds retrying ETA up (ceil) to nearest second", () => {
    const out = derivePresentation(
      makeState({ status: "retrying", attempt: 1, nextRetryDelayMs: 1500 }),
      ""
    );
    expect(out.visibleText).toContain("2秒後に再試行");
  });

  it("clamps negative retrying ETA to 0", () => {
    const out = derivePresentation(
      makeState({ status: "retrying", attempt: 1, nextRetryDelayMs: -100 }),
      ""
    );
    expect(out.visibleText).toContain("0秒後に再試行");
  });

  it("renders offline with wifi-off icon", () => {
    const out = derivePresentation(makeState({ status: "offline" }), "");
    expect(out.iconKey).toBe("wifi-off");
    expect(out.visibleText).toContain("オフライン中");
    expect(out.toneClass).toBe("text-amber-600");
  });

  it("renders syncing with refresh icon", () => {
    const out = derivePresentation(makeState({ status: "syncing" }), "");
    expect(out.iconKey).toBe("refresh");
    expect(out.visibleText).toBe("同期中…");
    expect(out.toneClass).toBe("text-primary");
  });

  it("renders error with retry button enabled", () => {
    const out = derivePresentation(
      makeState({ status: "error", errorMessage: "boom" }),
      ""
    );
    expect(out.iconKey).toBe("alert");
    expect(out.visibleText).toBe("保存に失敗しました");
    expect(out.showRetryButton).toBe(true);
    expect(out.toneClass).toBe("text-destructive");
  });

  it("aria-text is independent of relative-time text (no second tick)", () => {
    // The aria-live region must not contain ticking values, otherwise screen
    // readers re-announce every second.
    const out1 = derivePresentation(
      makeState({ status: "saved", lastSavedAt: "2026-04-29T01:00:00Z" }),
      "5秒前"
    );
    const out2 = derivePresentation(
      makeState({ status: "saved", lastSavedAt: "2026-04-29T01:00:00Z" }),
      "10秒前"
    );
    expect(out1.ariaText).toBe(out2.ariaText);
    expect(out1.ariaText).not.toContain("秒前");
  });

  it("color is never the only signal — every non-idle state has both icon and text", () => {
    const states: DraftState["status"][] = [
      "saving",
      "saved",
      "retrying",
      "offline",
      "syncing",
      "error",
    ];
    for (const status of states) {
      const out = derivePresentation(
        makeState({
          status,
          lastSavedAt:
            status === "saved" ? new Date().toISOString() : null,
        }),
        "0秒前"
      );
      expect(out.iconKey).not.toBeNull();
      expect(out.visibleText.length).toBeGreaterThan(0);
    }
  });
});
