"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
// OAuth callback error mapping (URL-driven, so it stays a small switch)
// ──────────────────────────────────────────────

function mapCallbackError(errorParam: string | null): string | null {
  if (!errorParam) return null;
  switch (errorParam) {
    case "auth_callback_failed":
      return "認証に失敗しました。もう一度お試しください。";
    case "access_denied":
      return "認証がキャンセルされました。";
    case "server_error":
      return "サーバーエラーが発生しました。しばらく時間をおいてお試しください。";
    case "session_expired":
      return "セッションの有効期限が切れました。再度ログインしてください。";
    default:
      return "ログインに失敗しました。もう一度お試しください。";
  }
}

// ──────────────────────────────────────────────
// Redirect validation
// ──────────────────────────────────────────────

function getSafeRedirect(next: string | null): string {
  if (!next || next === "/login" || next === "/signup") {
    return "/dashboard";
  }
  return next;
}

// ──────────────────────────────────────────────
// Login content (requires useSearchParams)
// ──────────────────────────────────────────────

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const next = getSafeRedirect(searchParams.get("next"));
  const errorParam = searchParams.get("error");

  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    mapCallbackError(errorParam)
  );

  const formRef = useRef<HTMLFormElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Hydration sentinel — flipped to "true" once React mounts on the client.
  // Used by ops to detect silent hydration regressions in production logs
  // and by the middleware guard (see middleware.ts) as a defensive check.
  useEffect(() => {
    formRef.current?.setAttribute("data-hydrated", "true");
  }, []);

  // Auto-focus the email input on initial render UNLESS an error banner is
  // present — in that case the banner is focused first so AT users hear it.
  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
      return;
    }
    emailInputRef.current?.focus();
    // We intentionally only run this when `error` toggles between
    // null/non-null; tracking individual error message text would over-fire.
  }, [error]);

  // OAuth safety timeout: if the redirect never happens (browser blocks
  // popup, network drops, etc.) reset the spinner after 30 seconds so the
  // button doesn't appear hung forever.
  useEffect(() => {
    if (!loadingProvider) return;
    const timer = window.setTimeout(() => setLoadingProvider(null), 30_000);
    return () => window.clearTimeout(timer);
  }, [loadingProvider]);

  async function handleOAuth(provider: "google" | "twitter") {
    setLoadingProvider(provider);
    setError(null);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;

    setIsEmailLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(mapAuthError(signInError, "login"));
        return;
      }

      // Toast success BEFORE navigation so the user sees confirmation even
      // if the destination is slow to render.
      toast.success("ログインしました");
      router.push(next);
      router.refresh();
    } finally {
      // Always reset loading — middleware bounces, network errors, and the
      // happy path all need the button restored. router.push does not
      // unmount the page synchronously, so this is safe.
      setIsEmailLoading(false);
    }
  }

  const isDisabled = loadingProvider !== null || isEmailLoading;
  const errorBannerId = "auth-error";

  return (
    <AuthShell
      heading="ログイン"
      subheading="アカウントにログインして学習を続けましょう"
      footer={
        <>
          アカウントをお持ちでないですか？{" "}
          <Link
            href="/signup"
            className="font-medium text-primary hover:underline"
          >
            新規登録
          </Link>
        </>
      }
      legal={
        <>
          ログインすることで、
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
      {/* Error banner — focusable so the auto-focus effect can hand it
          to the screen reader before the form fields. */}
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

      {/* OAuth buttons — spinner slot is always reserved so the icon swap
          doesn't shift the label horizontally. */}
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
          Googleでログイン
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
          X (Twitter) でログイン
        </Button>
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-muted-foreground">
            またはメールでログイン
          </span>
        </div>
      </div>

      {/* Email + Password form */}
      <form ref={formRef} onSubmit={handleEmailLogin} className="space-y-3">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">パスワード</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              パスワードをお忘れですか？
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder=""
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isDisabled}
            autoComplete="current-password"
            spellCheck={false}
            autoCorrect="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorBannerId : undefined}
          />
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
          ログイン
        </Button>
      </form>
    </AuthShell>
  );
}

// ──────────────────────────────────────────────
// Page component with Suspense for useSearchParams
// ──────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center"
          role="status"
        >
          <Loader2
            className="h-8 w-8 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
          <span className="sr-only">読み込み中</span>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
