import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Search, BookOpen, ArrowRight } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="mb-2 text-7xl font-bold text-primary/20">404</p>
      <h1 className="mb-3 text-2xl font-bold tracking-tight">
        ページが見つかりませんでした
      </h1>
      <p className="mb-8 max-w-md text-sm text-muted-foreground">
        お探しのページは存在しないか、移動した可能性があります。
        URLをご確認いただくか、以下からお探しください。
      </p>

      {/* Search bar */}
      <form action="/explore" method="GET" className="mb-8 w-full max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            placeholder="問題セットを検索..."
            className="pl-9"
            aria-label="問題セットを検索"
          />
        </div>
      </form>

      {/* Primary CTAs */}
      <div className="mb-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">
            <Home className="mr-1.5 h-4 w-4" />
            ホームに戻る
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/explore">
            <BookOpen className="mr-1.5 h-4 w-4" />
            問題を探す
          </Link>
        </Button>
      </div>

      {/* Navigation suggestions */}
      <div className="w-full max-w-sm space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          よくアクセスされるページ
        </p>
        <nav className="space-y-1">
          {[
            { href: "/dashboard", label: "ダッシュボード" },
            { href: "/dashboard/history", label: "解答履歴" },
            { href: "/rankings", label: "ランキング" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
