"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Save } from "lucide-react";
import { createCoupon } from "@/app/(seller)/sell/coupons/actions";
import { toast } from "sonner";

interface CouponFormProps {
  sellerSets: Array<{ id: string; title: string }>;
  onSuccess?: () => void;
}

/**
 * Generate a random 8-character alphanumeric coupon code.
 */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function CouponForm({ sellerSets, onSuccess }: CouponFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [couponType, setCouponType] = useState<"percentage" | "fixed">(
    "percentage"
  );
  const [scope, setScope] = useState<"all" | "specific">("all");

  const handleAutoGenerate = () => {
    setCode(generateCode());
  };

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createCoupon(formData);
      if (result.error) {
        setError(result.error);
      } else {
        toast.success("クーポンを作成しました");
        onSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form action={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Coupon code */}
      <div className="space-y-2">
        <Label htmlFor="coupon-code">クーポンコード *</Label>
        <div className="flex gap-2">
          <Input
            id="coupon-code"
            name="code"
            required
            minLength={3}
            maxLength={20}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="例: SUMMER2026"
            className="flex-1 font-mono uppercase tracking-wider"
          />
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={handleAutoGenerate}
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            自動生成
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          半角英数字・ハイフン・アンダースコアのみ (3〜20文字)
        </p>
      </div>

      {/* Discount type + value */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>割引タイプ *</Label>
          <Select
            name="coupon_type"
            value={couponType}
            onValueChange={(v) => setCouponType(v as "percentage" | "fixed")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">割引率 (%)</SelectItem>
              <SelectItem value="fixed">割引額 (円)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="discount-value">
            {couponType === "percentage" ? "割引率 (%) *" : "割引額 (円) *"}
          </Label>
          <Input
            id="discount-value"
            name="discount_value"
            type="number"
            required
            min={1}
            max={couponType === "percentage" ? 100 : undefined}
            step={couponType === "percentage" ? 1 : 100}
            placeholder={couponType === "percentage" ? "例: 20" : "例: 500"}
          />
          {couponType === "percentage" && (
            <p className="text-xs text-muted-foreground">1〜100%</p>
          )}
        </div>
      </div>

      {/* Min purchase */}
      <div className="space-y-2">
        <Label htmlFor="min-purchase">最低購入金額 (円)</Label>
        <Input
          id="min-purchase"
          name="min_purchase"
          type="number"
          min={0}
          step={100}
          defaultValue={0}
          placeholder="0（制限なし）"
        />
        <p className="text-xs text-muted-foreground">
          0の場合は金額制限なし
        </p>
      </div>

      {/* Max uses */}
      <div className="space-y-2">
        <Label htmlFor="max-uses">利用上限回数</Label>
        <Input
          id="max-uses"
          name="max_uses"
          type="number"
          min={1}
          placeholder="空欄の場合は無制限"
        />
      </div>

      {/* Scope */}
      <div className="space-y-2">
        <Label>適用範囲 *</Label>
        <Select
          name="scope"
          value={scope}
          onValueChange={(v) => setScope(v as "all" | "specific")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全問題セット</SelectItem>
            <SelectItem value="specific">特定の問題セット</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Problem set selector (shown only when scope is specific) */}
      {scope === "specific" && (
        <div className="space-y-2">
          <Label>対象の問題セット *</Label>
          {sellerSets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              公開中の問題セットがありません
            </p>
          ) : (
            <Select name="problem_set_id">
              <SelectTrigger>
                <SelectValue placeholder="問題セットを選択" />
              </SelectTrigger>
              <SelectContent>
                {sellerSets.map((ps) => (
                  <SelectItem key={ps.id} value={ps.id}>
                    {ps.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Dates */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="starts-at">開始日</Label>
          <Input
            id="starts-at"
            name="starts_at"
            type="datetime-local"
            defaultValue={toLocalDatetimeString(new Date())}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expires-at">終了日</Label>
          <Input
            id="expires-at"
            name="expires_at"
            type="datetime-local"
          />
          <p className="text-xs text-muted-foreground">
            空欄の場合は無期限
          </p>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        クーポンを作成
      </Button>
    </form>
  );
}

/**
 * Convert a Date to a local datetime string suitable for datetime-local inputs.
 */
function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
