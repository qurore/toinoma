"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { GoogleIcon, XIcon } from "@/components/auth/oauth-icons";
import { AuthShell } from "@/components/auth/auth-shell";
import { mapAuthError } from "@/lib/supabase/auth-errors";

// ──────────────────────────────────────────────
// Resend cooldown (seconds) — Supabase rate-limits resend at 60s by default;
// matching the value in UI prevents user confusion.
// ──────────────────────────────────────────────

const RESEND_COOLDOWN_SECONDS = 60;

export default function SignupPage() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Hydration sentinel (see middleware.ts for the consumer).
  useEffect(() => {
    formRef.current?.setAttribute("data-hydrated", "true");
  }, []);

  // Auto-focus email on mount unless an error banner is up; in that case
  // hand focus to the banner so SR users hear it first.
  useEffect(() => {
    if (isSuccess) return;
    if (error) {
      errorRef.current?.focus();
      return;
    }
    emailInputRef.current?.focus();
  }, [error, isSuccess]);

  // OAuth safety timeout — see login page for rationale.
  useEffect(() => {
    if (!loadingProvider) return;
    const timer = window.setTimeout(() => setLoadingProvider(null), 30_000);
    return () => window.clearTimeout(timer);
  }, [loadingProvider]);

  // Resend cooldown countdown — decrements once a second until zero.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(
      () => setResendCooldown((s) => s - 1),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  async function handleOAuth(provider: "google" | "twitter") {
    setLoadingProvider(provider);
    setError(null);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`,
      },
    });
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) return;

    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    setIsEmailLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (signUpError) {
        setError(mapAuthError(signUpError, "signup"));
        return;
      }

      // Confirmation toast precedes the success view so the user gets two
      // signals (toast + screen) instead of just a layout swap.
      toast.success("確認メールを送信しました");
      setIsSuccess(true);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setIsEmailLoading(false);
    }
  };

  async function handleResend() {
    if (resendCooldown > 0 || !email) return;
    setIsResending(true);
    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (resendError) {
        toast.error(mapAuthError(resendError, "signup"));
        return;
      }
      toast.success("確認メールを再送信しました");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setIsResending(false);
    }
  }

  function handleStartOver() {
    setIsSuccess(false);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setResendCooldown(0);
  }

  const isDisabled = loadingProvider !== null || isEmailLoading;
  const errorBannerId = "auth-error";
  const passwordHintId = "password-hint";
  const confirmPasswordHintId = "confirm-password-hint";

  // ──────────────────────────────────────────────
  // Success view — confirmation email sent.
  // ──────────────────────────────────────────────

  if (isSuccess) {
    return (
      <AuthShell
        heading="確認メールを送信しました"
        subheading="メール内のリンクをクリックしてアカウントを有効化してください"
      >
        <div className="space-y-4">
          <div
            role="status"
            className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center text-sm"
          >
            <p className="break-all">
              <strong>{email}</strong>
            </p>
            <p className="mt-1 text-muted-foreground">
              に確認メールを送信しました
            </p>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending}
              aria-busy={isResending}
            >
              <Loader2
                className={cn(
                  "mr-2 h-4 w-4 animate-spin",
                  !isResending && "invisible"
                )}
                aria-hidden="true"
              />
              {resendCooldown > 0
                ? `確認メールを再送信 (${resendCooldown}秒)`
                : "確認メールを再送信"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleStartOver}
            >
              別のメールアドレスで登録
            </Button>

            <Button variant="ghost" className="w-full" asChild>
              <Link href="/login">ログインページに戻る</Link>
            </Button>
          </div>
        </div>
      </AuthShell>
    );
  }

  // ──────────────────────────────────────────────
  // Default view — signup form.
  // ──────────────────────────────────────────────

  return (
    <AuthShell
      heading="アカウントを作成"
      subheading="問の間に登録して、問題の購入やAI採点を始めましょう"
      footer={
        <>
          既にアカウントをお持ちですか？{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            ログイン
          </Link>
        </>
      }
      legal={
        <>
          登録することで、
          <Link href="/legal/terms" className="text-primary hover:underline">
            利用規約
          </Link>
          および
          <Link href="/legal/privacy" className="text-primary hover:underline">
            プライバシーポリシー
          </Link>
          に同意したものとみなされます。
        </>
      }
      showMobileBenefits
    >
      {error && (
        <div
          ref={errorRef}
          id={errorBannerId}
          role="alert"
          tabIndex={-1}
          className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-center text-sm text-destructive focus:outline-none focus:ring-2 focus:ring-destructive/30"
        >
          {error}
        </div>
      )}

      {/* OAuth buttons — spinner slot reserved to prevent label shift */}
      <div className="space-y-3">
        <Button
          variant="outline"
          className="h-12 w-full justify-center gap-3 text-sm font-medium shadow-sm transition-all hover:shadow-md"
          onClick={() => handleOAuth("google")}
          disabled={isDisabled}
          aria-busy={loadingProvider === "google"}
        >
          <span className="relative inline-flex h-5 w-5 items-center justify-center">
            <GoogleIcon
              className={cn(
                "h-5 w-5",
                loadingProvider === "google" && "invisible"
              )}
            />
            {loadingProvider === "google" && (
              <Loader2
                className="absolute h-5 w-5 animate-spin"
                aria-hidden="true"
              />
            )}
          </span>
          Googleで登録
        </Button>

        <Button
          variant="outline"
          className="h-12 w-full justify-center gap-3 text-sm font-medium shadow-sm transition-all hover:shadow-md"
          onClick={() => handleOAuth("twitter")}
          disabled={isDisabled}
          aria-busy={loadingProvider === "twitter"}
        >
          <span className="relative inline-flex h-5 w-5 items-center justify-center">
            <XIcon
              className={cn(
                "h-5 w-5",
                loadingProvider === "twitter" && "invisible"
              )}
            />
            {loadingProvider === "twitter" && (
              <Loader2
                className="absolute h-5 w-5 animate-spin"
                aria-hidden="true"
              />
            )}
          </span>
          X (Twitter) で登録
        </Button>
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-muted-foreground">
            またはメールで登録
          </span>
        </div>
      </div>

      {/* Email + Password form */}
      <form ref={formRef} onSubmit={handleSignup} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            ref={emailInputRef}
            id="email"
            name="email"
            type="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isDisabled}
            autoComplete="email username"
            spellCheck={false}
            autoCorrect="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorBannerId : undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">パスワード</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder=""
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isDisabled}
            minLength={8}
            autoComplete="new-password"
            spellCheck={false}
            autoCorrect="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={
              error ? `${errorBannerId} ${passwordHintId}` : passwordHintId
            }
          />
          <p
            id={passwordHintId}
            className="text-xs text-muted-foreground"
          >
            8文字以上で入力してください
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">パスワード（確認）</Label>
          <Input
            id="confirm-password"
            name="confirm-password"
            type="password"
            placeholder=""
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isDisabled}
            minLength={8}
            autoComplete="new-password"
            spellCheck={false}
            autoCorrect="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={
              error
                ? `${errorBannerId} ${confirmPasswordHintId}`
                : confirmPasswordHintId
            }
          />
          <p
            id={confirmPasswordHintId}
            className="text-xs text-muted-foreground"
          >
            上のパスワードと一致するように入力してください
          </p>
        </div>
        <Button
          type="submit"
          className="h-12 w-full"
          disabled={isDisabled}
          aria-busy={isEmailLoading}
        >
          <Loader2
            className={cn(
              "mr-2 h-4 w-4 animate-spin",
              !isEmailLoading && "invisible"
            )}
            aria-hidden="true"
          />
          アカウントを作成
        </Button>
      </form>
    </AuthShell>
  );
}
