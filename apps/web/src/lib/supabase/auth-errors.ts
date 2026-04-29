import type { AuthError } from "@supabase/supabase-js";

// ──────────────────────────────────────────────
// Auth error mapper
//
// Translates a Supabase AuthError (or any Error-shaped object the SDK
// surfaces) into a single user-facing Japanese string for the calling
// auth flow. Centralising this avoids drift between login / signup /
// forgot-password / reset-password and lets us cover the full
// documented Supabase error-code taxonomy in one place.
// ──────────────────────────────────────────────

export type AuthErrorContext = "login" | "signup" | "forgot" | "reset";

// Lightweight structural shape — we accept either the full AuthError
// class or an arbitrary `{ message, code? }` so callers can pass through
// network/unknown errors without a type cast.
type AuthErrorLike = {
  message?: string;
  code?: string;
};

// ──────────────────────────────────────────────
// Constant message table (single source of truth)
// ──────────────────────────────────────────────

const MSG = {
  invalidCredentials: "メールアドレスまたはパスワードが正しくありません",
  emailNotConfirmed:
    "メールアドレスが未確認です。受信したメールから確認を完了してください",
  rateLimit: "リクエストが多すぎます。しばらく待ってから再度お試しください",
  alreadyExists: "このメールアドレスは既に登録されています",
  weakPassword: "パスワードが弱すぎます。より複雑なパスワードを設定してください",
  samePassword: "新しいパスワードは現在のものと異なる必要があります",
  sessionNotFound: "セッションの有効期限が切れました。リンクを再発行してください",
  emailInvalid: "メールアドレスの形式が正しくありません",
  signupDisabled: "新規登録は現在受け付けておりません",
  network: "通信エラーが発生しました。しばらくしてから再度お試しください",
  generic: {
    login: "ログインに失敗しました。もう一度お試しください",
    signup: "アカウントの作成に失敗しました。もう一度お試しください",
    forgot:
      "パスワードリセットメールの送信に失敗しました。もう一度お試しください",
    reset:
      "パスワードの更新に失敗しました。リンクの有効期限が切れている可能性があります",
  } as const satisfies Record<AuthErrorContext, string>,
} as const;

// ──────────────────────────────────────────────
// Heuristics for cases where Supabase did not return a code
// (older SDKs, network errors, custom GoTrue deployments).
// Always lowercase the haystack before comparing.
// ──────────────────────────────────────────────

function messageMatches(haystack: string, needles: readonly string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

export function mapAuthError(
  error: AuthError | AuthErrorLike,
  context: AuthErrorContext
): string {
  const code = (error.code ?? "").toLowerCase();
  const message = (error.message ?? "").toLowerCase();

  // 1. Network / fetch failures — surface a friendly message regardless of
  //    context. Fetch errors typically arrive without a code.
  if (
    !code &&
    messageMatches(message, [
      "failed to fetch",
      "networkerror",
      "network error",
    ])
  ) {
    return MSG.network;
  }

  // 2. Code-driven branches (preferred path).
  switch (code) {
    case "invalid_credentials":
      return MSG.invalidCredentials;
    case "email_not_confirmed":
      return MSG.emailNotConfirmed;
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
    case "over_sms_send_rate_limit":
      return MSG.rateLimit;
    case "user_already_exists":
    case "email_exists":
      return MSG.alreadyExists;
    case "weak_password":
      return MSG.weakPassword;
    case "same_password":
      return MSG.samePassword;
    case "session_not_found":
    case "session_expired":
      return MSG.sessionNotFound;
    case "email_address_invalid":
    case "validation_failed":
      return MSG.emailInvalid;
    case "signup_disabled":
      return MSG.signupDisabled;
  }

  // 3. Message-string fallbacks for SDKs that did not send a code.
  if (messageMatches(message, ["invalid login credentials"])) {
    return MSG.invalidCredentials;
  }
  if (messageMatches(message, ["email not confirmed"])) {
    return MSG.emailNotConfirmed;
  }
  if (messageMatches(message, ["rate limit", "too many requests"])) {
    return MSG.rateLimit;
  }
  if (messageMatches(message, ["already registered", "already exists"])) {
    return MSG.alreadyExists;
  }
  if (messageMatches(message, ["weak password"])) {
    return MSG.weakPassword;
  }
  if (messageMatches(message, ["should be different", "same password"])) {
    return MSG.samePassword;
  }
  if (messageMatches(message, ["session", "expired"])) {
    // Only treat as session error in reset/forgot contexts where a token
    // expiry is the most likely cause; on login this might be misleading.
    if (context === "reset" || context === "forgot") {
      return MSG.sessionNotFound;
    }
  }

  // 4. Context-aware generic.
  return MSG.generic[context];
}
