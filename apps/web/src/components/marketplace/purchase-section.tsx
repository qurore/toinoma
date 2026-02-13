"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, BookOpen, ShoppingCart } from "lucide-react";

export function PurchaseSection({
  problemSetId,
  price,
  hasPurchased,
  isLoggedIn,
}: {
  problemSetId: string;
  price: number;
  hasPurchased: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hasPurchased) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="mb-4 text-sm text-muted-foreground">購入済み</p>
          <Button size="lg" asChild>
            <Link href={`/problem/${problemSetId}/solve`}>
              <BookOpen className="mr-2 h-4 w-4" />
              解答を始める
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isLoggedIn) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="mb-4 text-muted-foreground">
            問題を購入するにはログインが必要です
          </p>
          <Button size="lg" asChild>
            <Link href={`/login?redirect=/problem/${problemSetId}`}>
              ログインして購入
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handlePurchase = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemSetId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "購入に失敗しました");
        return;
      }

      if (data.checkoutUrl) {
        // Redirect to Stripe Checkout for paid problems
        window.location.href = data.checkoutUrl;
      } else {
        // Free purchase — reload to show solve button
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 text-center">
        <p className="mb-2 text-3xl font-bold text-primary">
          {price === 0 ? "無料" : `¥${price.toLocaleString()}`}
        </p>
        {error && (
          <p className="mb-3 text-sm text-destructive">{error}</p>
        )}
        <Button
          size="lg"
          onClick={handlePurchase}
          disabled={isLoading}
          className="w-full max-w-xs"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShoppingCart className="mr-2 h-4 w-4" />
          )}
          {price === 0 ? "無料で入手" : "購入する"}
        </Button>
      </CardContent>
    </Card>
  );
}
