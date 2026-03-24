"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";

export function ManagePaymentButton() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/billing-portal", {
        method: "POST",
      });

      const data = await res.json();

      if (data.url) {
        window.location.assign(data.url);
      } else {
        toast.error(data.error ?? "ポータルの作成に失敗しました");
        setLoading(false);
      }
    } catch {
      toast.error("エラーが発生しました。もう一度お試しください。");
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="mr-2 h-4 w-4" />
      )}
      お支払い方法を管理
    </Button>
  );
}
