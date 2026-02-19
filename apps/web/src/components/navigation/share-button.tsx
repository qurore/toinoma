"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ShareButtonProps {
  title: string;
  className?: string;
}

export function ShareButton({ title, className }: ShareButtonProps) {
  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url, title });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("リンクをコピーしました");
      }
    } catch (err) {
      // Silently ignore AbortError (user dismissed the native share sheet)
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error("共有に失敗しました");
      }
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleShare} className={className}>
      <Share2 className="mr-2 h-4 w-4" />
      共有する
    </Button>
  );
}
