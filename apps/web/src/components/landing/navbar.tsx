"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-forest/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
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
          <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
            <Link href="/login" className="text-white/80 hover:text-white">
              ログイン
            </Link>
          </Button>
          <Button size="sm" asChild className="hidden md:inline-flex">
            <Link href="/login">無料で始める</Link>
          </Button>

          {/* Mobile hamburger toggle */}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white md:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "メニューを閉じる" : "メニューを開く"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile slide-down panel */}
      <div
        className={cn(
          "overflow-hidden border-t border-white/10 bg-forest/95 backdrop-blur-md transition-[max-height] duration-300 ease-in-out md:hidden",
          mobileOpen ? "max-h-80" : "max-h-0 border-t-transparent"
        )}
      >
        <nav className="flex flex-col px-6 py-4 space-y-1">
          <Link
            href="/explore"
            onClick={() => setMobileOpen(false)}
            className="flex h-11 items-center rounded-md px-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            問題を探す
          </Link>
          <Link
            href="/sell/onboarding"
            onClick={() => setMobileOpen(false)}
            className="flex h-11 items-center rounded-md px-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            出題する
          </Link>
          <Link
            href="/help"
            onClick={() => setMobileOpen(false)}
            className="flex h-11 items-center rounded-md px-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            ヘルプ
          </Link>
          <div className="my-2 border-t border-white/10" />
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="flex h-11 items-center rounded-md px-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            ログイン
          </Link>
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="flex h-11 items-center justify-center rounded-md bg-green px-3 text-sm font-semibold text-forest transition-colors hover:bg-green/90"
          >
            無料で始める
          </Link>
        </nav>
      </div>
    </header>
  );
}
