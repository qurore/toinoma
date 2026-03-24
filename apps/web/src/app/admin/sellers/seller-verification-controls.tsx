"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { verifySeller, unverifySeller } from "./actions";

// ──────────────────────────────────────────────
// ADM-006: Seller verification toggle controls
// ──────────────────────────────────────────────

interface SellerVerificationControlsProps {
  sellerId: string;
  isVerified: boolean;
}

export function SellerVerificationControls({
  sellerId,
  isVerified,
}: SellerVerificationControlsProps) {
  const [isPending, startTransition] = useTransition();
  const [verified, setVerified] = useState(isVerified);

  const handleToggle = () => {
    startTransition(async () => {
      const action = verified ? unverifySeller : verifySeller;
      const result = await action(sellerId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setVerified(!verified);
      toast.success(
        verified
          ? "出品者の認証を解除しました"
          : "出品者を認証しました"
      );
    });
  };

  return (
    <Button
      variant={verified ? "outline" : "default"}
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : verified ? (
        <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
      ) : (
        <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
      )}
      {verified ? "認証を解除" : "認証する"}
    </Button>
  );
}
