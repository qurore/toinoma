"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Heart, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@toinoma/shared/utils";

// MKT-016: Shopping cart (wishlist-to-cart flow)
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
  initialCount?: number;
}

export function CartDrawer({ userId, initialCount = 0 }: CartDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(initialCount);

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
    setItems((prev) => prev.filter((item) => item.id !== favoriteId));
    setCount((prev) => Math.max(0, prev - 1));

    try {
      const supabase = createClient();
      await supabase.from("favorites").delete().eq("id", favoriteId);
    } catch {
      fetchItems();
    }
  };

  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="お気に入りを開く"
        >
          <Heart className="h-5 w-5" />
          {count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center px-1 text-[10px]"
            >
              {count > 99 ? "99+" : count}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full max-w-sm flex-col p-0">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
            <Heart className="h-4 w-4" aria-hidden="true" />
            お気に入り
            {items.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {items.length}件
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">
            お気に入りに追加した問題セットの一覧です
          </SheetDescription>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <Heart className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">
                お気に入りがまだありません
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                気になる問題セットを見つけたら、ハートボタンで追加しましょう
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
                      aria-label={`${item.title}をお気に入りから削除`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {formatPrice(item.price)}
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
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        {item.price === 0 ? "取得する" : "購入する"}
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border px-4 pb-3 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                合計 ({items.length}件)
              </span>
              <span className="text-base font-bold">
                {formatPrice(total)}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground/60">
              各問題セットの購入ページから個別に購入できます
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
