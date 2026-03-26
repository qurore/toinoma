"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-destructive">エラーが発生しました</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">
        申し訳ございません
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {error.message || "予期しないエラーが発生しました。しばらく経ってから再度お試しください。"}
      </p>
      {error.digest && (
        <p className="mt-3 rounded-md bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">
          エラーID: {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <Button variant="outline" size="sm" onClick={reset}>
          再試行
        </Button>
        <Button size="sm" asChild>
          <Link href="/">ホームに戻る</Link>
        </Button>
      </div>
    </div>
  );
}
