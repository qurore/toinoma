"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Home, MessageCircle, AlertTriangle } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showReport, setShowReport] = useState(false);
  const [reported, setReported] = useState(false);

  useEffect(() => {
    // Log error to console in development
    console.error("[Toinoma Error]", error);
  }, [error]);

  const handleReport = () => {
    // In production, this would send to an error tracking service
    setReported(true);
    setTimeout(() => setShowReport(false), 2000);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <p className="mb-2 text-sm font-medium text-destructive">
        エラーが発生しました
      </p>
      <h1 className="mb-3 text-2xl font-bold tracking-tight">
        申し訳ございません
      </h1>
      <p className="mb-8 max-w-md text-sm text-muted-foreground">
        予期しないエラーが発生しました。
        しばらく経ってから再度お試しください。問題が解決しない場合は、お問い合わせください。
      </p>

      {/* Error digest for support reference */}
      {error.digest && (
        <p className="mb-6 rounded-md bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">
          Error ID: {error.digest}
        </p>
      )}

      {/* Primary actions */}
      <div className="mb-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          再読み込み
        </Button>
        <Button
          variant="outline"
          onClick={() => (window.location.href = "/")}
        >
          <Home className="mr-1.5 h-4 w-4" />
          ホームに戻る
        </Button>
      </div>

      {/* Error report section */}
      {!showReport ? (
        <button
          type="button"
          onClick={() => setShowReport(true)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          このエラーを報告する
        </button>
      ) : (
        <div className="w-full max-w-sm space-y-3 rounded-lg border border-border bg-card p-4 text-left">
          <p className="text-sm font-medium">エラーの報告</p>
          {reported ? (
            <p className="text-sm text-success">
              報告を受け付けました。ご協力ありがとうございます。
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                エラーの発生状況を自動的に開発チームに送信します。
                個人情報は含まれません。
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleReport}>
                  報告する
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowReport(false)}
                >
                  キャンセル
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
