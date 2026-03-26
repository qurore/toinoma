"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CollectionDetailError({
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
        コレクションを読み込めませんでした
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {error.message || "しばらく経ってから再度お試しください。"}
      </p>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" size="sm" onClick={reset}>
          再試行
        </Button>
        <Button size="sm" asChild>
          <Link href="/dashboard">マイページ</Link>
        </Button>
      </div>
    </div>
  );
}
