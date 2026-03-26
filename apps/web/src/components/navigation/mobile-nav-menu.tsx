"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileNavMenuProps {
  user: { id: string; email?: string } | null;
  isSeller: boolean;
}

interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
}

// Primary navigation — matches all desktop-accessible top-level pages
const PRIMARY_ITEMS: NavItem[] = [
  { href: "/explore", label: "問題を探す" },
  { href: "/rankings", label: "ランキング" },
];

// Authenticated user navigation
const AUTH_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "マイページ" },
  { href: "/notifications", label: "通知" },
];

// Seller items — shown when user is a seller
const SELLER_ITEMS: NavItem[] = [
  { href: "/seller", label: "出品者モード" },
];

// Non-seller items — shown when user is not yet a seller
const NON_SELLER_ITEMS: NavItem[] = [
  { href: "/seller/onboarding", label: "出品者になる" },
];

// Utility items — always at the bottom
const UTILITY_ITEMS: NavItem[] = [
  { href: "/settings", label: "設定" },
  { href: "/help", label: "ヘルプ" },
];

// Guest items — shown when not logged in
const GUEST_ITEMS: NavItem[] = [
  { href: "/login", label: "ログイン" },
  { href: "/help", label: "ヘルプ" },
];

function NavSection({
  items,
  pathname,
  onClose,
}: {
  items: NavItem[];
  pathname: string;
  onClose: () => void;
}) {
  return (
    <div className="space-y-0.5 py-2">
      {items.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-foreground/80 hover:bg-muted hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function MobileNavMenu({ user, isSeller }: MobileNavMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

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

      {/* Overlay + sliding nav panel */}
      {open && (
        <>
          <div
            className="fixed inset-0 top-16 z-40 bg-black/20 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />
          <nav
            ref={navRef}
            className="fixed inset-x-0 top-16 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-border bg-background shadow-lg animate-slide-down-fade"
            aria-label="モバイルメニュー"
          >
            <div className="mx-auto max-w-7xl divide-y divide-border px-4 py-1">
              {/* Close button — discoverable close mechanism inside the panel */}
              <div className="flex justify-end py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={close}
                  className="h-8 gap-1 px-2 text-xs text-muted-foreground"
                  aria-label="メニューを閉じる"
                >
                  <X className="h-3.5 w-3.5" />
                  閉じる
                </Button>
              </div>
              {/* Browse / explore */}
              <NavSection items={PRIMARY_ITEMS} pathname={pathname} onClose={close} />

              {user ? (
                <>
                  {/* Authenticated user pages */}
                  <NavSection items={AUTH_ITEMS} pathname={pathname} onClose={close} />

                  {/* Seller section */}
                  <NavSection
                    items={isSeller ? SELLER_ITEMS : NON_SELLER_ITEMS}
                    pathname={pathname}
                    onClose={close}
                  />

                  {/* Settings & help */}
                  <NavSection items={UTILITY_ITEMS} pathname={pathname} onClose={close} />
                </>
              ) : (
                /* Guest items */
                <NavSection items={GUEST_ITEMS} pathname={pathname} onClose={close} />
              )}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
