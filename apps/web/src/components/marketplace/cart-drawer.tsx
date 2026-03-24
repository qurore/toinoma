"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ShoppingCart, X, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// ──────────────────────────────────────────────
// MKT-016: Shopping cart (wishlist-to-cart flow)
// ──────────────────────────────────────────────
// Uses the existing favorites table as a cart source.
// Each item links directly to its purchase page.

interface CartItem {
  id: string;
  problem_set_id: string;
  title: string;
  price: number;
  subject: string;
  seller_name: string | null;
}

interface CartDrawerProps {
  userId: string;
  /** Initial count from server (for badge rendering before hydration) */
  initialCount?: number;
}

export function CartDrawer({ userId, initialCount = 0 }: CartDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(initialCount);

  // Fetch favorites (cart items) when drawer opens
  const fetchItems = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const supabase = createClient();

      const { data } = await supabase
        .from("favorites")
        .select(
          "id, problem_set_id, problem_sets(id, title, price, subject, seller_profiles(seller_display_name))"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      const mapped: CartItem[] = (data ?? []).map((fav: Record<string, unknown>) => {
        const ps = fav.problem_sets as Record<string, unknown> | null;
        const seller = ps?.seller_profiles as Record<string, unknown> | null;
        return {
          id: fav.id as string,
          problem_set_id: fav.problem_set_id as string,
          title: (ps?.title as string) ?? "---",
          price: (ps?.price as number) ?? 0,
          subject: (ps?.subject as string) ?? "",
          seller_name: (seller?.seller_display_name as string) ?? null,
        };
      });

      setItems(mapped);
      setCount(mapped.length);
    } catch {
      // Graceful degradation
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      fetchItems();
    }
  }, [isOpen, fetchItems]);

  const removeItem = async (favoriteId: string) => {
    // Optimistic remove
    setItems((prev) => prev.filter((item) => item.id !== favoriteId));
    setCount((prev) => Math.max(0, prev - 1));

    try {
      const supabase = createClient();
      await supabase.from("favorites").delete().eq("id", favoriteId);
    } catch {
      // Re-fetch to restore consistent state
      fetchItems();
    }
  };

  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <>
      {/* Cart icon button with badge */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(true)}
        aria-label="カートを開く"
      >
        <ShoppingCart className="h-5 w-5" />
        {count > 0 && (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center px-1 text-[10px]"
          >
            {count > 99 ? "99+" : count}
          </Badge>
        )}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border bg-background shadow-xl transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="お気に入り / カート"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            <h2 className="text-sm font-semibold">
              お気に入り
            </h2>
            {items.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {items.length}件
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            aria-label="閉じる"
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">
                お気に入りがまだありません
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                問題セットをお気に入りに追加すると、ここに表示されます
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                asChild
              >
                <Link href="/explore" onClick={() => setIsOpen(false)}>
                  問題を探す
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-md border border-border p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/problem/${item.problem_set_id}`}
                        className="text-sm font-medium hover:underline"
                        onClick={() => setIsOpen(false)}
                      >
                        {item.title}
                      </Link>
                      {item.seller_name && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.seller_name}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                      aria-label="お気に入りから削除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {item.price === 0
                        ? "無料"
                        : `¥${item.price.toLocaleString()}`}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      asChild
                    >
                      <Link
                        href={`/problem/${item.problem_set_id}`}
                        onClick={() => setIsOpen(false)}
                      >
                        <ExternalLink className="h-3 w-3" />
                        {item.price === 0 ? "取得する" : "購入する"}
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer — total & summary */}
        {items.length > 0 && (
          <div className="border-t border-border px-4 py-3">
            <Separator className="mb-3" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                合計 ({items.length}件)
              </span>
              <span className="text-base font-bold">
                ¥{total.toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground/60">
              各問題セットの購入ページから個別に購入できます
            </p>
          </div>
        )}
      </div>
    </>
  );
}
