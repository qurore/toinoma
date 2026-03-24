"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";

// Confirmation phrase the user must type to proceed
const CONFIRM_PHRASE = "退会する";

export function DeleteAccountConfirm() {
  const [phrase, setPhrase] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFinalDialog, setShowFinalDialog] = useState(false);
  const router = useRouter();

  const canDelete = phrase === CONFIRM_PHRASE;

  async function handleDelete() {
    setShowFinalDialog(false);
    setIsDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "アカウントの削除に失敗しました");
      }

      // Sign out and redirect
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/?deleted=1");
    } catch {
      toast.error("アカウントの削除に失敗しました。しばらく後に再試行してください。");
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="mt-4 space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            退会するには、下のフィールドに{" "}
            <strong className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-xs">
              {CONFIRM_PHRASE}
            </strong>{" "}
            と入力してください。
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-phrase" className="text-sm">
            確認フレーズ
          </Label>
          <Input
            id="confirm-phrase"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder={`「${CONFIRM_PHRASE}」と入力`}
            className="border-destructive/30 focus-visible:ring-destructive/30"
            autoComplete="off"
          />
        </div>

        <Button
          variant="destructive"
          onClick={() => setShowFinalDialog(true)}
          disabled={!canDelete || isDeleting}
          className="w-full"
        >
          {isDeleting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          退会手続きをする
        </Button>
      </div>

      {/* Final confirmation dialog */}
      <AlertDialog open={showFinalDialog} onOpenChange={setShowFinalDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              本当に退会しますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。アカウントに関連するすべてのデータ（購入履歴、解答履歴、お気に入り等）が完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              退会する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
