import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="mb-2 text-6xl font-bold text-primary/20">404</p>
      <h1 className="mb-3 text-xl font-semibold tracking-tight">
        ページが見つかりませんでした
      </h1>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        お探しのページは存在しないか、移動した可能性があります。
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/">ホームに戻る</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/explore">問題を探す</Link>
        </Button>
      </div>
    </main>
  );
}
