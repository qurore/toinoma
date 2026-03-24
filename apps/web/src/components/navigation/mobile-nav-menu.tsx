"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  House,
  Grid2x2,
  LayoutDashboard,
  Store,
  Settings,
  HelpCircle,
  LogIn,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileNavMenuProps {
  user: { id: string; email?: string } | null;
  isSeller: boolean;
}

const NAV_ITEMS = [
  { href: "/", label: "ホーム", icon: House },
  { href: "/explore", label: "問題を探す", icon: Grid2x2 },
  { href: "/dashboard", label: "マイページ", icon: LayoutDashboard },
];

const SELLER_NAV_ITEMS = [
  { href: "/sell", label: "出品者モード", icon: Store },
  { href: "/settings", label: "設定", icon: Settings },
  { href: "/help", label: "ヘルプ", icon: HelpCircle },
];

const NON_SELLER_NAV_ITEMS = [
  { href: "/sell/onboarding", label: "出品者になる", icon: UserPlus },
  { href: "/settings", label: "設定", icon: Settings },
  { href: "/help", label: "ヘルプ", icon: HelpCircle },
];

const GUEST_NAV_ITEMS = [
  { href: "/login", label: "ログイン", icon: LogIn },
  { href: "/help", label: "ヘルプ", icon: HelpCircle },
];

export function MobileNavMenu({ user, isSeller }: MobileNavMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const secondaryItems = !user
    ? GUEST_NAV_ITEMS
    : isSeller
      ? SELLER_NAV_ITEMS
      : NON_SELLER_NAV_ITEMS;

  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
    }
  }, []);

  // Focus trap + escape handler
  useEffect(() => {
    if (!open) return;

    document.addEventListener("keydown", handleKeyDown);

    // Focus first link on open
    const firstLink = navRef.current?.querySelector("a");
    firstLink?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  // Trap focus within the nav when open
  useEffect(() => {
    if (!open || !navRef.current) return;

    const nav = navRef.current;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = nav.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [open]);

  return (
    <div className="md:hidden">
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        aria-label={open ? "メニューを閉じる" : "メニューを開く"}
        aria-expanded={open}
        className="h-11 w-11 p-0"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {open && (
        <>
          <div
            className="fixed inset-0 top-16 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <nav
            ref={navRef}
            className="fixed inset-x-0 top-16 z-50 border-b border-border bg-background shadow-lg animate-slide-down-fade"
            aria-label="モバイルナビゲーション"
          >
            <div className="mx-auto max-w-7xl divide-y divide-border px-4 py-2">
              {/* Primary navigation */}
              <div className="space-y-0.5 py-2">
                {NAV_ITEMS.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <item.icon className="h-4.5 w-4.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              {/* Secondary navigation — personalized based on seller status */}
              <div className="space-y-0.5 py-2">
                {secondaryItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4.5 w-4.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
