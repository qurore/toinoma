import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-forest/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-green" />
          <div className="flex flex-col">
            <span className="font-display text-lg font-bold leading-tight text-white">
              問の間
            </span>
            <span className="text-[10px] font-medium leading-tight text-white/60">
              Toinoma
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/explore"
            className="text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            問題を探す
          </Link>
          <Link
            href="/sell/onboarding"
            className="text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            出題する
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login" className="text-white/80 hover:text-white">
              ログイン
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/login">無料で始める</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
