"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  BookOpen,
  ShoppingCart,
  CheckCircle2,
  LogIn,
} from "lucide-react";
import { CouponInput } from "@/components/marketplace/coupon-input";

interface AppliedCoupon {
  couponId: string;
  code: string;
  couponType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
}

export function PurchaseSection({
  problemSetId,
  price,
  hasPurchased,
  isLoggedIn,
  sellerId,
}: {
  problemSetId: string;
  price: number;
  hasPurchased: boolean;
  isLoggedIn: boolean;
  sellerId?: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  // ── Purchased state: solve CTA + history link ──
  if (hasPurchased) {
    return (
      <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
            <span className="text-sm font-medium text-success">購入済み</span>
          </div>
          <Button size="lg" className="w-full" asChild>
            <Link href={`/problem/${problemSetId}/solve`}>
              <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
              この問題を解く
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href={`/problem/${problemSetId}/history`}>
              解答履歴を見る
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Not logged in state ──
  if (!isLoggedIn) {
    return (
      <Card>
        <CardContent className="space-y-4 p-5">
          {/* Price display */}
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">
              {price === 0 ? "無料" : `¥${price.toLocaleString("ja-JP")}`}
            </p>
            {price === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                アカウントを作成して無料で始めましょう
              </p>
            )}
          </div>
          <Button size="lg" className="w-full" asChild>
            <Link href={`/login?next=/problem/${problemSetId}`}>
              <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
              ログインして購入
            </Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            安全なお支払い（Stripe）
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Purchase flow ──
  const handlePurchase = async () => {
    setIsLoading(true);
    setError(null);
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
        setError(data.error ?? "購入に失敗しました");
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        // Free purchase — redirect to success-like state
        router.push(`/problem/${problemSetId}/solve`);
      }
    } catch {
      setError("ネットワークエラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  const effectivePrice = appliedCoupon
    ? Math.max(0, price - appliedCoupon.discountAmount)
    : price;
  const isFree = effectivePrice === 0;
  const hasDiscount = appliedCoupon && appliedCoupon.discountAmount > 0;

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        {/* Price display */}
        <div className="text-center">
          {hasDiscount && (
            <p className="text-sm text-muted-foreground line-through">
              ¥{price.toLocaleString()}
            </p>
          )}
          <p className="text-3xl font-bold text-foreground">
            {isFree ? "無料" : `¥${effectivePrice.toLocaleString()}`}
          </p>
          {hasDiscount && (
            <Badge variant="destructive" className="mt-1 text-xs">
              {appliedCoupon!.couponType === "percentage"
                ? `${appliedCoupon!.discountValue}%OFF`
                : `¥${appliedCoupon!.discountAmount.toLocaleString()}OFF`}
            </Badge>
          )}
        </div>

        {/* Coupon input for paid problem sets */}
        {price > 0 && sellerId && (
          <CouponInput
            problemSetId={problemSetId}
            sellerId={sellerId}
            originalPrice={price}
            onCouponApplied={setAppliedCoupon}
          />
        )}

        {error && (
          <p role="alert" className="text-center text-sm text-destructive">{error}</p>
        )}

        {/* Purchase button — text never changes per button stability rule */}
        <Button
          size="lg"
          onClick={handlePurchase}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ShoppingCart className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          この問題を入手する
        </Button>

        {/* What you get list */}
        <ul className="space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          <li>AI採点による即時フィードバック</li>
          <li>何度でも繰り返し解答可能</li>
          <li>得点推移の確認・比較機能</li>
        </ul>

        {/* Trust signals */}
        {!isFree && (
          <p className="text-center text-xs text-muted-foreground">
            安全なお支払い（Stripe）
          </p>
        )}
      </CardContent>
    </Card>
  );
}
