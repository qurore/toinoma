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
import { AuthShell } from "@/components/auth/auth-shell";
import { mapAuthError } from "@/lib/supabase/auth-errors";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Hydration sentinel.
  useEffect(() => {
    formRef.current?.setAttribute("data-hydrated", "true");
  }, []);

  // Auto-focus management — banner first if error, else email field.
  useEffect(() => {
    if (isSent) return;
    if (error) {
      errorRef.current?.focus();
      return;
    }
    emailInputRef.current?.focus();
  }, [error, isSent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        }
      );

      if (resetError) {
        setError(mapAuthError(resetError, "forgot"));
        return;
      }

      toast.success("パスワードリセットメールを送信しました");
      setIsSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  function handleResendDifferentEmail() {
    setIsSent(false);
    setEmail("");
    setError(null);
  }

  const errorBannerId = "auth-error";

  // ──────────────────────────────────────────────
  // Sent view
  // ──────────────────────────────────────────────

  if (isSent) {
    return (
      <AuthShell
        heading="メールを確認してください"
        subheading="メール内のリンクから新しいパスワードを設定できます"
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
              にパスワードリセットメールを送信しました
            </p>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResendDifferentEmail}
            >
              別のメールアドレスで再送信
            </Button>
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/login">ログインに戻る</Link>
            </Button>
          </div>
        </div>
      </AuthShell>
    );
  }

  // ──────────────────────────────────────────────
  // Default view — request reset
  // ──────────────────────────────────────────────

  return (
    <AuthShell
      heading="パスワードをリセット"
      subheading="登録済みのメールアドレスを入力してください。パスワードリセットのリンクを送信します。"
      footer={
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          ログインに戻る
        </Link>
      }
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

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
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
            disabled={isLoading}
            autoComplete="email username"
            spellCheck={false}
            autoCorrect="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorBannerId : undefined}
          />
        </div>
        <Button
          type="submit"
          className="h-12 w-full"
          disabled={isLoading}
          aria-busy={isLoading}
        >
          <Loader2
            className={cn(
              "mr-2 h-4 w-4 animate-spin",
              !isLoading && "invisible"
            )}
            aria-hidden="true"
          />
          リセットメールを送信
        </Button>
      </form>
    </AuthShell>
  );
}
