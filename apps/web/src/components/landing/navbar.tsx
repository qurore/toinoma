"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { BookOpen, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/explore", label: "問題を探す" },
  { href: "/sell/onboarding", label: "出題する" },
  { href: "/help", label: "ヘルプ" },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const isScrolled = window.scrollY > 16;
      setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-white/15 bg-forest/95 shadow-lg shadow-black/10 backdrop-blur-lg"
          : "border-b border-transparent bg-forest/80 backdrop-blur-md"
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
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
                  <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-green" />
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
            <Link href="/login">無料で始める</Link>
          </Button>
        </div>

        {/* Mobile menu (Radix Dialog as side-sheet) */}
        <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogPrimitive.Trigger asChild>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white md:hidden"
              aria-label="メニューを開く"
            >
              <Menu className="h-5 w-5" />
            </button>
          </DialogPrimitive.Trigger>

          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content
              className="fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-forest shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300"
              aria-describedby={undefined}
            >
              <DialogPrimitive.Title className="sr-only">
                ナビゲーションメニュー
              </DialogPrimitive.Title>

              {/* Sheet header */}
              <div className="flex h-14 items-center justify-between border-b border-white/10 px-6">
                <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                  <BookOpen className="h-5 w-5 text-green" />
                  <span className="font-display text-base font-bold text-white">問の間</span>
                </Link>
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="メニューを閉じる"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </DialogPrimitive.Close>
              </div>

              {/* Sheet navigation links */}
              <nav className="flex flex-1 flex-col gap-1 px-4 py-4">
                {NAV_LINKS.map((link) => {
                  const isActive = pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex h-11 items-center rounded-md px-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Sheet auth actions */}
              <div className="border-t border-white/10 px-4 py-4">
                <div className="flex flex-col gap-2">
                  <Button variant="ghost" size="sm" asChild className="justify-center text-white/80 hover:bg-white/10 hover:text-white">
                    <Link href="/login" onClick={() => setMobileOpen(false)}>
                      ログイン
                    </Link>
                  </Button>
                  <Button size="sm" asChild className="justify-center">
                    <Link href="/login" onClick={() => setMobileOpen(false)}>
                      無料で始める
                    </Link>
                  </Button>
                </div>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </header>
  );
}
