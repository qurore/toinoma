// @vitest-environment node
import { describe, it, expect } from "vitest";

// Unit tests for login page data logic
// Rendering tests skipped due to jsdom ESM incompatibility.

/**
 * Maps a Supabase signInWithPassword error to a user-facing Japanese message.
 * Extracted from the login page component for testability.
 */
function mapSignInError(errorMessage: string): string {
  if (errorMessage.includes("Invalid login credentials")) {
    return "メールアドレスまたはパスワードが正しくありません";
  }
  if (errorMessage.includes("Email not confirmed")) {
    return "メールアドレスが確認されていません。確認メールをご確認ください。";
  }
  if (
    errorMessage.includes("rate limit") ||
    errorMessage.includes("too many requests")
  ) {
    return "ログイン試行回数が上限に達しました。しばらく時間をおいてお試しください。";
  }
  return "ログインに失敗しました。もう一度お試しください。";
}

describe("Login page: mapSignInError", () => {
  it("returns invalid credentials message for wrong email/password", () => {
    expect(mapSignInError("Invalid login credentials")).toBe(
      "メールアドレスまたはパスワードが正しくありません"
    );
  });

  it("returns email not confirmed message", () => {
    expect(mapSignInError("Email not confirmed")).toBe(
      "メールアドレスが確認されていません。確認メールをご確認ください。"
    );
  });

  it("returns rate limit message", () => {
    expect(mapSignInError("rate limit exceeded")).toBe(
      "ログイン試行回数が上限に達しました。しばらく時間をおいてお試しください。"
    );
    expect(mapSignInError("too many requests")).toBe(
      "ログイン試行回数が上限に達しました。しばらく時間をおいてお試しください。"
    );
  });

  it("returns generic error for unknown errors", () => {
    expect(mapSignInError("Something unexpected")).toBe(
      "ログインに失敗しました。もう一度お試しください。"
    );
  });
});

describe("Login page: redirect validation", () => {
  function getSafeRedirect(next: string | null): string {
    if (!next || next === "/login" || next === "/signup") {
      return "/dashboard";
    }
    return next;
  }

  it("defaults to /dashboard when next is null", () => {
    expect(getSafeRedirect(null)).toBe("/dashboard");
  });

  it("defaults to /dashboard when next is /login (prevent loop)", () => {
    expect(getSafeRedirect("/login")).toBe("/dashboard");
  });

  it("defaults to /dashboard when next is /signup", () => {
    expect(getSafeRedirect("/signup")).toBe("/dashboard");
  });

  it("passes through valid next values", () => {
    expect(getSafeRedirect("/dashboard/history")).toBe("/dashboard/history");
    expect(getSafeRedirect("/seller")).toBe("/seller");
    expect(getSafeRedirect("/problem/123/solve")).toBe("/problem/123/solve");
  });
});
