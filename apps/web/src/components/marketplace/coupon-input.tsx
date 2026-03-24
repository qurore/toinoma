"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Tag, X } from "lucide-react";

interface CouponValidationResult {
  valid: boolean;
  discount_amount?: number;
  coupon_type?: "percentage" | "fixed";
  discount_value?: number;
  coupon_id?: string;
  error?: string;
}

interface AppliedCoupon {
  couponId: string;
  code: string;
  couponType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
}

interface CouponInputProps {
  problemSetId: string;
  sellerId: string;
  originalPrice: number;
  onCouponApplied: (coupon: AppliedCoupon | null) => void;
}

export function CouponInput({
  problemSetId,
  sellerId,
  originalPrice,
  onCouponApplied,
}: CouponInputProps) {
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(
    null
  );

  const handleApply = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) return;

    setIsValidating(true);
    setError(null);

    try {
      const res = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: trimmedCode,
          problem_set_id: problemSetId,
          seller_id: sellerId,
        }),
      });

      const data = (await res.json()) as CouponValidationResult;

      if (!data.valid) {
        setError(data.error ?? "無効なクーポンコードです");
        return;
      }

      const coupon: AppliedCoupon = {
        couponId: data.coupon_id!,
        code: trimmedCode,
        couponType: data.coupon_type!,
        discountValue: data.discount_value!,
        discountAmount: data.discount_amount!,
      };

      setAppliedCoupon(coupon);
      onCouponApplied(coupon);
    } catch {
      setError("クーポンの検証に失敗しました");
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemove = () => {
    setAppliedCoupon(null);
    setCode("");
    setError(null);
    onCouponApplied(null);
  };

  // Coupon is applied -- show the discount breakdown
  if (appliedCoupon) {
    const discountedPrice = Math.max(
      0,
      originalPrice - appliedCoupon.discountAmount
    );
    const discountLabel =
      appliedCoupon.couponType === "percentage"
        ? `${appliedCoupon.discountValue}% OFF`
        : `¥${appliedCoupon.discountValue.toLocaleString()} OFF`;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <span className="font-mono text-sm font-semibold tracking-wider">
              {appliedCoupon.code}
            </span>
            <span className="text-xs text-primary">{discountLabel}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRemove}
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">クーポンを解除</span>
          </Button>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">割引後の価格</span>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground line-through">
              ¥{originalPrice.toLocaleString()}
            </span>
            <span className="font-bold text-primary">
              {discountedPrice === 0
                ? "無料"
                : `¥${discountedPrice.toLocaleString()}`}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // No coupon applied -- show the input form
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          placeholder="クーポンコード"
          className="flex-1 font-mono uppercase tracking-wider"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleApply();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleApply}
          disabled={isValidating || !code.trim()}
        >
          {isValidating ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Tag className="mr-1.5 h-4 w-4" />
          )}
          適用
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
