"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  BookOpen,
  ShoppingCart,
  CheckCircle2,
  LogIn,
} from "lucide-react";

interface AppliedCoupon {
  couponId: string;
  code: string;
  couponType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
}

/**
 * Sticky bottom purchase bar for mobile viewports.
 * Hidden on lg+ where the sidebar purchase card is visible.
 * Shows price + CTA button in a compact bar.
 * Accepts appliedCoupon from parent to share coupon state with PurchaseSection.
 */
export function MobilePurchaseBar({
  problemSetId,
  price,
  hasPurchased,
  isLoggedIn,
  appliedCoupon,
}: {
  problemSetId: string;
  price: number;
  hasPurchased: boolean;
  isLoggedIn: boolean;
  appliedCoupon?: AppliedCoupon | null;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Purchased: show solve CTA
  if (hasPurchased) {
    return (
      <div className="fixed inset-x-0 bottom-14 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm md:bottom-0 lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
            <span className="font-medium text-success">購入済み</span>
          </div>
          <Button size="sm" className="min-w-[120px]" asChild>
            <Link href={`/problem/${problemSetId}/solve`}>
              <BookOpen className="mr-1.5 h-4 w-4" aria-hidden="true" />
              この問題を解く
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!isLoggedIn) {
    return (
      <div className="fixed inset-x-0 bottom-14 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm md:bottom-0 lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <p className="text-lg font-bold">
            {price === 0 ? "無料" : `¥${price.toLocaleString("ja-JP")}`}
          </p>
          <Button size="sm" className="min-w-[120px]" asChild>
            <Link href={`/login?next=/problem/${problemSetId}`}>
              <LogIn className="mr-1.5 h-4 w-4" aria-hidden="true" />
              ログインして購入
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Purchase flow — price accounts for applied coupon discount
  const effectivePrice = appliedCoupon
    ? Math.max(0, price - appliedCoupon.discountAmount)
    : price;
  const isFree = effectivePrice === 0;

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemSetId,
          ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "購入に失敗しました");
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        router.push(`/problem/${problemSetId}/solve`);
      }
    } catch {
      toast.error("ネットワークエラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-14 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm md:bottom-0 lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <div className="min-w-0">
          {appliedCoupon && appliedCoupon.discountAmount > 0 && (
            <p className="text-xs text-muted-foreground line-through">
              ¥{price.toLocaleString("ja-JP")}
            </p>
          )}
          <p className="text-lg font-bold leading-tight">
            {isFree ? "無料" : `¥${effectivePrice.toLocaleString("ja-JP")}`}
          </p>
        </div>
        <Button
          size="sm"
          className="min-w-[140px]"
          onClick={handlePurchase}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ShoppingCart className="mr-1.5 h-4 w-4" aria-hidden="true" />
          )}
          この問題を入手する
        </Button>
      </div>
    </div>
  );
}
