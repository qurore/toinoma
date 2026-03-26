"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { GoogleIcon, XIcon } from "@/components/auth/oauth-icons";

// ──────────────────────────────────────────────
// Benefits list for the brand panel
// ──────────────────────────────────────────────

const benefits = [
  "AI採点で記述式の部分点を即座に判定",
  "大学生作問者による本格入試対策問題",
  "9科目対応、難易度別の問題検索",
  "学習進捗の可視化で効率的な受験対策",
];

// ──────────────────────────────────────────────
// Error mapping for signInWithPassword
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// Error mapping for OAuth callback query params
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

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(mapSignInError(signInError.message));
      setIsEmailLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  const isDisabled = loadingProvider !== null || isEmailLoading;

  return (
    <div className="flex min-h-screen">
      {/* Left — Brand panel (hidden on mobile) */}
      <div className="hidden w-1/2 bg-hero lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Top — Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <BookOpen className="h-6 w-6 text-white" aria-hidden="true" />
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg font-bold text-white">
              問の間
            </span>
            <span className="text-[10px] font-medium tracking-wider text-white/60">
              TOINOMA
            </span>
          </div>
        </Link>

        {/* Center — Headline and benefits */}
        <div className="space-y-6 animate-fade-up">
          <h1 className="text-3xl font-bold leading-tight text-white">
            問いと答えが
            <br />
            出会う場所
          </h1>
          <ul className="space-y-2.5">
            {benefits.map((b) => (
              <li key={b} className="text-sm text-white/80 pl-3 relative before:absolute before:left-0 before:top-[0.55em] before:h-1 before:w-1 before:rounded-full before:bg-white/50">
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom — Copyright */}
        <p className="text-xs text-white/40">
          &copy; {new Date().getFullYear()} Toinoma
        </p>
      </div>

      {/* Right — Login form */}
      <main className="flex flex-1 items-center justify-center p-6 pb-16 lg:p-12 lg:pb-12">
        <div
          className={cn(
            "w-full max-w-sm",
            "animate-fade-up [animation-delay:150ms] [animation-fill-mode:backwards]"
          )}
        >
          {/* Mobile logo — visible only on small screens */}
          <Link
            href="/"
            className="mb-8 flex items-center gap-2 lg:hidden"
          >
            <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg font-bold">問の間</span>
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground">
                TOINOMA
              </span>
            </div>
          </Link>

          <h2 className="mb-1 text-2xl font-bold tracking-tight">
            ログイン
          </h2>
          <p className="mb-8 text-sm text-muted-foreground">
            アカウントにログインして学習を続けましょう
          </p>

          {/* Error banner */}
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-center text-sm text-destructive"
            >
              {error}
            </div>
          )}

          {/* OAuth buttons */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="h-12 w-full justify-center gap-3 text-sm font-medium shadow-sm transition-all hover:shadow-md"
              onClick={() => handleOAuth("google")}
              disabled={isDisabled}
            >
              {loadingProvider === "google" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <GoogleIcon className="h-5 w-5" />
              )}
              Googleでログイン
            </Button>

            <Button
              variant="outline"
              className="h-12 w-full justify-center gap-3 text-sm font-medium shadow-sm transition-all hover:shadow-md"
              onClick={() => handleOAuth("twitter")}
              disabled={isDisabled}
            >
              {loadingProvider === "twitter" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <XIcon className="h-5 w-5" />
              )}
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
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isDisabled}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">パスワード</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  tabIndex={-1}
                >
                  パスワードをお忘れですか？
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isDisabled}
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="h-12 w-full"
              disabled={isDisabled}
            >
              {isEmailLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              ログイン
            </Button>
          </form>

          {/* Signup link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            アカウントをお持ちでないですか？{" "}
            <Link
              href="/signup"
              className="font-medium text-primary hover:underline"
            >
              新規登録
            </Link>
          </p>

          {/* Mobile benefits — visible only on small screens */}
          <ul className="mt-8 space-y-1.5 lg:hidden">
            {benefits.map((b) => (
              <li
                key={b}
                className="text-xs text-muted-foreground pl-3 relative before:absolute before:left-0 before:top-[0.55em] before:h-1 before:w-1 before:rounded-full before:bg-muted-foreground/40"
              >
                {b}
              </li>
            ))}
          </ul>

          {/* Legal footer */}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            ログインすることで、
            <Link
              href="/legal/terms"
              className="text-primary hover:underline"
            >
              利用規約
            </Link>
            および
            <Link
              href="/legal/privacy"
              className="text-primary hover:underline"
            >
              プライバシーポリシー
            </Link>
            に同意したものとみなされます。
          </p>
        </div>
      </main>

      {/* Minimal footer for mobile (desktop has brand panel copyright) */}
      <footer className="fixed inset-x-0 bottom-0 flex items-center justify-center gap-4 bg-background/80 py-4 text-xs text-muted-foreground backdrop-blur-sm lg:hidden">
        <Link href="/legal/terms" className="hover:text-foreground transition-colors">
          利用規約
        </Link>
        <Link href="/legal/privacy" className="hover:text-foreground transition-colors">
          プライバシー
        </Link>
        <Link href="/help" className="hover:text-foreground transition-colors">
          ヘルプ
        </Link>
        <span>&copy; {new Date().getFullYear()} Toinoma</span>
      </footer>
    </div>
  );
}

// ──────────────────────────────────────────────
// Page component with Suspense for useSearchParams
// ──────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center" role="status">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">読み込み中</span>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
