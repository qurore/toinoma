"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LegalError({
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
        <h2 className="text-lg font-semibold">エラーが発生しました</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          法的情報ページの読み込み中にエラーが発生しました。しばらく経ってから再度お試しください。
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={reset} variant="outline" size="sm">
            やり直す
          </Button>
          <Button asChild size="sm">
            <Link href="/">
              ホームに戻る
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
