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

export default function ResetPasswordPage() {
  const [accountEmail, setAccountEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Hydration sentinel.
  useEffect(() => {
    formRef.current?.setAttribute("data-hydrated", "true");
  }, []);

  // Hydrate the user's email if a session is present so password managers
  // can correctly associate the new credential with the existing account.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      if (data.user?.email) setAccountEmail(data.user.email);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Focus management — banner first when there's an error, else first
  // password field.
  useEffect(() => {
    if (isSuccess) return;
    if (error) {
      errorRef.current?.focus();
      return;
    }
    passwordInputRef.current?.focus();
  }, [error, isSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) return;

    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(mapAuthError(updateError, "reset"));
        return;
      }

      toast.success("パスワードを更新しました");
      setIsSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  const errorBannerId = "auth-error";
  const passwordHintId = "password-hint";
  const confirmPasswordHintId = "confirm-password-hint";

  // ──────────────────────────────────────────────
  // Success view
  // ──────────────────────────────────────────────

  if (isSuccess) {
    return (
      <AuthShell
        heading="パスワードを更新しました"
        subheading="新しいパスワードでログインできるようになりました"
      >
        <Button className="w-full" asChild>
          <Link href="/dashboard">ダッシュボードへ</Link>
        </Button>
      </AuthShell>
    );
  }

  // ──────────────────────────────────────────────
  // Default view — set new password
  // ──────────────────────────────────────────────

  const isExpired = error?.includes("有効期限") || error?.includes("セッション");

  return (
    <AuthShell
      heading="新しいパスワードを設定"
      subheading="新しいパスワードを入力してください"
    >
      {error && (
        <div
          ref={errorRef}
          id={errorBannerId}
          role="alert"
          tabIndex={-1}
          className="mb-6 space-y-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-center text-sm text-destructive focus:outline-none focus:ring-2 focus:ring-destructive/30"
        >
          <p>{error}</p>
          {isExpired && (
            <Link
              href="/forgot-password"
              className="inline-block text-xs font-medium text-primary hover:underline"
            >
              パスワードリセットを再リクエスト
            </Link>
          )}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        {/* Hidden username input — surfaces the account's email to password
            managers so the new password is stored under the right account.
            Hidden from sighted users via type="email" + hidden + tabIndex. */}
        <input
          type="email"
          name="email"
          autoComplete="username"
          value={accountEmail}
          readOnly
          hidden
          tabIndex={-1}
          aria-hidden="true"
        />

        <div className="space-y-2">
          <Label htmlFor="password">新しいパスワード</Label>
          <Input
            ref={passwordInputRef}
            id="password"
            name="password"
            type="password"
            placeholder=""
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
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
          <Label htmlFor="confirm-password">新しいパスワード（確認）</Label>
          <Input
            id="confirm-password"
            name="confirm-password"
            type="password"
            placeholder=""
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
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
          パスワードを更新
        </Button>
      </form>
    </AuthShell>
  );
}
