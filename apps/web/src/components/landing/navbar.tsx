"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/explore", label: "問題を探す" },
  { href: "/rankings", label: "ランキング" },
  { href: "/seller/onboarding", label: "出題する" },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const isScrolled = window.scrollY > 16;
      setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-white/15 bg-forest/95 shadow-lg shadow-black/10 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent backdrop-blur-sm"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-green" />
          <div className="flex flex-col leading-none">
            <span className="font-display text-base font-bold text-white">問の間</span>
            <span className="text-[9px] font-medium tracking-wider text-white/50">
              TOINOMA
            </span>
          </div>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="メインナビゲーション">
          {NAV_LINKS.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "text-white"
                    : "text-white/70 hover:text-white"
                )}
              >
                {link.label}
                {isActive && (
                  <span className="absolute inset-x-3 -bottom-[17px] h-0.5 rounded-full bg-green" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop auth actions */}
        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm" asChild className="text-white/80 hover:bg-white/10 hover:text-white">
            <Link href="/login">ログイン</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">無料で始める</Link>
          </Button>
        </div>

        {/* Mobile auth actions — compact inline (no hamburger; bottom tab bar handles nav) */}
        <div className="flex items-center gap-2 md:hidden">
          <Button variant="ghost" size="sm" asChild className="text-white/80 hover:bg-white/10 hover:text-white">
            <Link href="/login">ログイン</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">始める</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
