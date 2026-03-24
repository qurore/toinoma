"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BookOpen, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────
// SVG icons for OAuth providers
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
// Login content (requires useSearchParams)
// ──────────────────────────────────────────────

function LoginContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const errorParam = searchParams.get("error");

  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error] = useState<string | null>(
    errorParam ? "ログインに失敗しました。もう一度お試しください。" : null
  );

  async function handleOAuth(provider: "google" | "twitter") {
    setLoadingProvider(provider);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  const isDisabled = loadingProvider !== null;

  return (
    <div className="flex min-h-screen">
      {/* Left — Brand panel (hidden on mobile) */}
      <div className="hidden w-1/2 bg-hero lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Top — Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <BookOpen className="h-6 w-6 text-white" />
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
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-light" />
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

      {/* Right — Login form */}
      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
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
            <BookOpen className="h-6 w-6 text-primary" />
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg font-bold">問の間</span>
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground">
                TOINOMA
              </span>
            </div>
          </Link>

          <h2 className="mb-1 text-2xl font-bold tracking-tight">
            無料で始める
          </h2>
          <p className="mb-8 text-sm text-muted-foreground">
            アカウントにログインして学習を続けましょう
          </p>

          {/* Error banner */}
          {error && (
            <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-center text-sm text-destructive">
              {error}
            </div>
          )}

          {/* OAuth buttons */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="h-11 w-full justify-center gap-3"
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
              className="h-11 w-full justify-center gap-3"
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

          {/* Mobile benefits — visible only on small screens */}
          <ul className="mt-8 space-y-2 lg:hidden">
            {benefits.map((b) => (
              <li
                key={b}
                className="flex items-start gap-2 text-muted-foreground"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="text-xs">{b}</span>
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
      </div>
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
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
