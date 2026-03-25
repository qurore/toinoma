"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./sidebar-nav";
import { cn } from "@/lib/utils";

// Mobile horizontal tab bar — shown below AppNavbar on small screens (md:hidden).
// Fixed at top-16 (below h-16 AppNavbar), height h-10, z-index below AppNavbar (z-40).
// Gradient fade masks indicate scrollable content off-screen.
export function MobileDashboardNav() {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  return (
    <nav
      className="fixed left-0 right-0 top-16 z-40 h-10 border-b border-border bg-card md:hidden"
      aria-label="ダッシュボードナビゲーション"
    >
      <div className="relative h-full">
        {/* Left fade mask */}
        {canScrollLeft && (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-card to-transparent"
            aria-hidden="true"
          />
        )}
        {/* Right fade mask */}
        {canScrollRight && (
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-card to-transparent"
            aria-hidden="true"
          />
        )}
        <ul ref={scrollRef} className="flex h-full overflow-x-auto scrollbar-thin">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href} className="flex shrink-0 items-stretch">
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center border-b-2 px-3 text-xs font-medium whitespace-nowrap",
                    "transition-colors duration-150",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
