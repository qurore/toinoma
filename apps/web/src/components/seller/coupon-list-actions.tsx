"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  MoreHorizontal,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  toggleCouponActive,
  deleteCoupon,
} from "@/app/(seller)/seller/coupons/actions";
import { CouponForm } from "@/components/seller/coupon-form";
import type { Database } from "@/types/database";

type CouponRow = Database["public"]["Tables"]["coupons"]["Row"];

interface CouponListActionsProps {
  coupons: Array<CouponRow & { problem_sets: { title: string } | null }>;
  sellerSets: Array<{ id: string; title: string }>;
  /** If provided, render inline row actions for this coupon instead of the create trigger. */
  activeCouponId?: string;
  /** Trigger element for the create-coupon dialog (used when activeCouponId is not set). */
  trigger?: React.ReactNode;
}

export function CouponListActions({
  sellerSets,
  activeCouponId,
  trigger,
  coupons,
}: CouponListActionsProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // --- Create dialog trigger mode ---
  if (!activeCouponId && trigger) {
    return (
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>クーポンを作成</DialogTitle>
            <DialogDescription>
              割引クーポンの詳細を設定してください
            </DialogDescription>
          </DialogHeader>
          <CouponForm
            sellerSets={sellerSets}
            onSuccess={() => {
              setCreateOpen(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // --- Row actions mode ---
  const coupon = coupons.find((c) => c.id === activeCouponId);
  if (!coupon) return null;

  const isActive = coupon.active;
  const hasUses = coupon.current_uses > 0;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(coupon.code);
    toast.success("クーポンコードをコピーしました");
  };

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleCouponActive(coupon.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          result.active ? "クーポンを有効にしました" : "クーポンを無効にしました"
        );
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCoupon(coupon.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("クーポンを削除しました");
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending}>
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">操作</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopyCode}>
          <Copy className="mr-2 h-4 w-4" />
          コードをコピー
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleToggle}>
          {isActive ? (
            <>
              <PowerOff className="mr-2 h-4 w-4" />
              無効にする
            </>
          ) : (
            <>
              <Power className="mr-2 h-4 w-4" />
              有効にする
            </>
          )}
        </DropdownMenuItem>
        {!hasUses && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              削除する
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
