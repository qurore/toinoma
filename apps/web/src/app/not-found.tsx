import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      {/* Subtle brand accent */}
      <div className="mb-6 h-1 w-16 rounded-full bg-hero" aria-hidden="true" />

      <h1 className="text-xl font-bold tracking-tight">
        この問いには、まだ答えがありません。
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        お探しのページは存在しないか、移動した可能性があります。
      </p>

      {/* Inline search for immediate recovery */}
      <form
        action="/explore"
        method="get"
        className="mt-6 flex w-full max-w-sm items-center gap-2"
      >
        <label htmlFor="notfound-search" className="sr-only">問題を検索</label>
        <input
          id="notfound-search"
          type="text"
          name="q"
          placeholder="教科名や大学名で検索..."
          required
          className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" size="sm">
          検索
        </Button>
      </form>

      <div className="mt-6 flex gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/">ホームに戻る</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/explore">問題を探す</Link>
        </Button>
      </div>
    </div>
  );
}
