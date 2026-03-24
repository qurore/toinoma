"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PoolError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive/60" />
        <h2 className="mt-4 text-lg font-semibold">エラーが発生しました</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          問題プールの読み込み中にエラーが発生しました。しばらく経ってから再度お試しください。
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={reset} variant="outline" size="sm">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            再試行
          </Button>
          <Button asChild size="sm">
            <Link href="/sell">
              <Home className="mr-1.5 h-3.5 w-3.5" />
              出品者ダッシュボードに戻る
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
