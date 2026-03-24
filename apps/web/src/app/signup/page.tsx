"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BookOpen, Loader2, CheckCircle2 } from "lucide-react";

// ──────────────────────────────────────────────
// SVG icons for OAuth providers (shared with login)
// ──────────────────────────────────────────────

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

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
// Error mapping for signup
// ──────────────────────────────────────────────

function mapSignUpError(errorMessage: string): string {
  if (errorMessage.includes("already registered")) {
    return "このメールアドレスは既に登録されています";
  }
  if (
    errorMessage.includes("rate limit") ||
    errorMessage.includes("too many requests")
  ) {
    return "リクエスト回数が上限に達しました。しばらく時間をおいてお試しください。";
  }
  return "アカウントの作成に失敗しました。もう一度お試しください。";
}

export default function SignupPage() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (signUpError) {
      setError(mapSignUpError(signUpError.message));
      setIsEmailLoading(false);
      return;
    }

    setIsSuccess(true);
    setIsEmailLoading(false);
  };

  const isDisabled = loadingProvider !== null || isEmailLoading;

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-success/10">
            <CheckCircle2 className="h-7 w-7 text-success" aria-hidden="true" />
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight">
            確認メールを送信しました
          </h1>
          <p className="mb-8 text-sm text-muted-foreground">
            <strong>{email}</strong>{" "}
            に確認メールを送信しました。メール内のリンクをクリックしてアカウントを有効化してください。
          </p>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/login">ログインページに戻る</Link>
          </Button>
        </div>
      </div>
    );
  }

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
          <ul className="space-y-3">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-white/80">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-light" aria-hidden="true" />
                <span className="text-sm">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom — Copyright */}
        <p className="text-xs text-white/40">
          &copy; {new Date().getFullYear()} Toinoma
        </p>
      </div>

      {/* Right — Signup form */}
      <main className="flex flex-1 items-center justify-center p-6 lg:p-12">
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
            アカウントを作成
          </h2>
          <p className="mb-8 text-sm text-muted-foreground">
            問の間に登録して、問題の購入やAI採点を始めましょう
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
              Googleで登録
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
          <form onSubmit={handleSignup} className="space-y-3">
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
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                placeholder="8文字以上"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isDisabled}
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">パスワード（確認）</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="もう一度入力してください"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isDisabled}
                minLength={8}
                autoComplete="new-password"
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
              アカウントを作成
            </Button>
          </form>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            既にアカウントをお持ちですか？{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              ログイン
            </Link>
          </p>

          {/* Mobile benefits — visible only on small screens */}
          <ul className="mt-8 space-y-2 lg:hidden">
            {benefits.map((b) => (
              <li
                key={b}
                className="flex items-start gap-2 text-muted-foreground"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span className="text-xs">{b}</span>
              </li>
            ))}
          </ul>

          {/* Legal footer */}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            登録することで、
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
      <footer className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 py-4 text-xs text-muted-foreground lg:hidden">
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
