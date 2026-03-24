"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from "lucide-react";
import { clearRecentlyViewedAction } from "./actions";
import { toast } from "sonner";

export function ClearHistoryButton() {
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);

  async function handleClear() {
    setIsClearing(true);
    try {
      await clearRecentlyViewedAction();
      toast.success("閲覧履歴を削除しました");
      router.refresh();
    } catch {
      toast.error("閲覧履歴の削除に失敗しました");
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isClearing}>
          {isClearing ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-1.5 h-4 w-4" />
          )}
          履歴を削除
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>閲覧履歴を削除</AlertDialogTitle>
          <AlertDialogDescription>
            すべての閲覧履歴を削除しますか？この操作は元に戻せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction onClick={handleClear}>
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
