"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface AdminNavItem {
  href: string;
  label: string;
  exact: boolean;
}

interface AdminMobileSidebarProps {
  navItems: AdminNavItem[];
}

export function AdminMobileSidebar({ navItems }: AdminMobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="管理者メニューを開く"
        aria-expanded={open}
        className="fixed left-3 top-[4.25rem] z-30 h-10 w-10 rounded-lg border border-border bg-background p-0 shadow-sm"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[260px] p-0">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-sm">管理者メニュー</SheetTitle>
            <SheetDescription className="sr-only">
              管理画面のナビゲーション
            </SheetDescription>
          </SheetHeader>
          <nav className="px-3 py-4" aria-label="管理者ナビゲーション">
            <ul className="space-y-0.5">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "relative flex items-center rounded-md px-3 py-2.5 text-sm font-medium",
                        "transition-colors duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                      )}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
