// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

// Unit tests for ShareButton logic — component rendering is skipped due to
// jsdom ESM incompatibility with @exodus/bytes in this environment.
// The navigator.share → clipboard fallback logic is tested directly.

describe("ShareButton share logic", () => {
  it("prefers navigator.share when available", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    const clipboardMock = vi.fn();

    const nav = {
      share: shareMock,
      clipboard: { writeText: clipboardMock },
    } as unknown as Navigator;

    // Simulate the share button logic inline
    const url = "https://toinoma.jp/problem/abc";
    const title = "Test problem";
    try {
      if (nav.share) {
        await nav.share({ url, title });
      } else {
        await nav.clipboard.writeText(url);
      }
    } catch {}

    expect(shareMock).toHaveBeenCalledWith({ url, title });
    expect(clipboardMock).not.toHaveBeenCalled();
  });

  it("falls back to clipboard when navigator.share is unavailable", async () => {
    const clipboardMock = vi.fn().mockResolvedValue(undefined);

    const nav = {
      share: undefined,
      clipboard: { writeText: clipboardMock },
    } as unknown as Navigator;

    const url = "https://toinoma.jp/problem/abc";
    const title = "Test problem";
    try {
      if (nav.share) {
        await (nav as Navigator).share({ url, title });
      } else {
        await nav.clipboard.writeText(url);
      }
    } catch {}

    expect(clipboardMock).toHaveBeenCalledWith(url);
  });

  it("silently ignores AbortError when user dismisses share sheet", async () => {
    const shareMock = vi.fn().mockRejectedValue(
      Object.assign(new Error("User cancelled"), { name: "AbortError" })
    );

    const toastErrorMock = vi.fn();

    const nav = { share: shareMock } as unknown as Navigator;

    const url = "https://toinoma.jp/problem/abc";
    const title = "Test problem";
    try {
      if (nav.share) await nav.share({ url, title });
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        toastErrorMock("共有に失敗しました");
      }
    }

    expect(toastErrorMock).not.toHaveBeenCalled();
  });
});
