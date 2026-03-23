"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="mb-2 text-6xl font-bold text-destructive/20">500</p>
      <h1 className="mb-3 text-xl font-semibold tracking-tight">
        エラーが発生しました
      </h1>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        しばらく経ってから再度お試しください。問題が解決しない場合は、お問い合わせください。
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>再読み込み</Button>
        <Button
          variant="outline"
          onClick={() => (window.location.href = "/")}
        >
          ホームに戻る
        </Button>
      </div>
    </main>
  );
}
