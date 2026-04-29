// @vitest-environment node
import { describe, it, expect } from "vitest";
import { AuthError } from "@supabase/supabase-js";
import { mapAuthError } from "./auth-errors";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function makeError(message: string, code?: string): AuthError {
  // Supabase AuthError exposes message + code; constructor signature is
  // (message, status?, code?). We supply 400 as a generic status so tests
  // mirror the shape returned at runtime by signInWithPassword/signUp.
  return new AuthError(message, 400, code);
}

// ──────────────────────────────────────────────
// mapAuthError — covers the documented Supabase error code taxonomy
// across all four auth contexts (login, signup, forgot, reset).
// ──────────────────────────────────────────────

describe("mapAuthError", () => {
  describe("invalid_credentials", () => {
    it("maps invalid_credentials code to credentials message in login context", () => {
      const error = makeError("Invalid login credentials", "invalid_credentials");
      expect(mapAuthError(error, "login")).toBe(
        "メールアドレスまたはパスワードが正しくありません"
      );
    });

    it("falls back to message string when code is absent", () => {
      const error = makeError("Invalid login credentials");
      expect(mapAuthError(error, "login")).toBe(
        "メールアドレスまたはパスワードが正しくありません"
      );
    });
  });

  describe("email_not_confirmed", () => {
    it("maps email_not_confirmed in login context", () => {
      const error = makeError("Email not confirmed", "email_not_confirmed");
      expect(mapAuthError(error, "login")).toBe(
        "メールアドレスが未確認です。受信したメールから確認を完了してください"
      );
    });
  });

  describe("rate limits", () => {
    it("maps over_email_send_rate_limit to rate-limit message", () => {
      const error = makeError("rate limit exceeded", "over_email_send_rate_limit");
      expect(mapAuthError(error, "signup")).toBe(
        "リクエストが多すぎます。しばらく待ってから再度お試しください"
      );
    });

    it("maps over_request_rate_limit to rate-limit message", () => {
      const error = makeError("too many requests", "over_request_rate_limit");
      expect(mapAuthError(error, "login")).toBe(
        "リクエストが多すぎます。しばらく待ってから再度お試しください"
      );
    });

    it("falls back to message scan when code missing", () => {
      const error = makeError("rate limit exceeded for ip");
      expect(mapAuthError(error, "login")).toBe(
        "リクエストが多すぎます。しばらく待ってから再度お試しください"
      );
    });
  });

  describe("user_already_exists", () => {
    it("maps user_already_exists in signup context", () => {
      const error = makeError("User already registered", "user_already_exists");
      expect(mapAuthError(error, "signup")).toBe(
        "このメールアドレスは既に登録されています"
      );
    });

    it("matches case-insensitive 'already registered' fallback when code missing", () => {
      const error = makeError("User Already Registered");
      expect(mapAuthError(error, "signup")).toBe(
        "このメールアドレスは既に登録されています"
      );
    });

    it("matches email_exists code (Supabase variant)", () => {
      const error = makeError("Email exists", "email_exists");
      expect(mapAuthError(error, "signup")).toBe(
        "このメールアドレスは既に登録されています"
      );
    });
  });

  describe("weak_password", () => {
    it("maps weak_password in signup context", () => {
      const error = makeError("Password is too weak", "weak_password");
      expect(mapAuthError(error, "signup")).toBe(
        "パスワードが弱すぎます。より複雑なパスワードを設定してください"
      );
    });

    it("maps weak_password in reset context", () => {
      const error = makeError("Password is too weak", "weak_password");
      expect(mapAuthError(error, "reset")).toBe(
        "パスワードが弱すぎます。より複雑なパスワードを設定してください"
      );
    });
  });

  describe("same_password", () => {
    it("maps same_password in reset context", () => {
      const error = makeError("New password must differ", "same_password");
      expect(mapAuthError(error, "reset")).toBe(
        "新しいパスワードは現在のものと異なる必要があります"
      );
    });
  });

  describe("session_not_found", () => {
    it("maps session_not_found in reset context", () => {
      const error = makeError("Session not found", "session_not_found");
      expect(mapAuthError(error, "reset")).toBe(
        "セッションの有効期限が切れました。リンクを再発行してください"
      );
    });
  });

  describe("email_address_invalid", () => {
    it("maps email_address_invalid in forgot context", () => {
      const error = makeError("Email is invalid", "email_address_invalid");
      expect(mapAuthError(error, "forgot")).toBe(
        "メールアドレスの形式が正しくありません"
      );
    });
  });

  describe("signup_disabled", () => {
    it("maps signup_disabled in signup context", () => {
      const error = makeError("Signups are disabled", "signup_disabled");
      expect(mapAuthError(error, "signup")).toBe(
        "新規登録は現在受け付けておりません"
      );
    });
  });

  describe("context-aware fallbacks", () => {
    it("returns login generic for unknown error in login context", () => {
      const error = makeError("Some unexpected error");
      expect(mapAuthError(error, "login")).toBe(
        "ログインに失敗しました。もう一度お試しください"
      );
    });

    it("returns signup generic for unknown error in signup context", () => {
      const error = makeError("Some unexpected error");
      expect(mapAuthError(error, "signup")).toBe(
        "アカウントの作成に失敗しました。もう一度お試しください"
      );
    });

    it("returns forgot generic for unknown error in forgot context", () => {
      const error = makeError("Some unexpected error");
      expect(mapAuthError(error, "forgot")).toBe(
        "パスワードリセットメールの送信に失敗しました。もう一度お試しください"
      );
    });

    it("returns reset generic for unknown error in reset context", () => {
      const error = makeError("Some unexpected error");
      expect(mapAuthError(error, "reset")).toBe(
        "パスワードの更新に失敗しました。リンクの有効期限が切れている可能性があります"
      );
    });
  });

  describe("network-shaped errors", () => {
    it("treats fetch failure messages as network errors in login context", () => {
      const error = makeError("Failed to fetch");
      expect(mapAuthError(error, "login")).toBe(
        "通信エラーが発生しました。しばらくしてから再度お試しください"
      );
    });

    it("treats NetworkError variant identically", () => {
      const error = makeError("NetworkError when attempting to fetch resource");
      expect(mapAuthError(error, "signup")).toBe(
        "通信エラーが発生しました。しばらくしてから再度お試しください"
      );
    });
  });
});
