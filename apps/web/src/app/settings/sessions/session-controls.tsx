"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LogOut, Loader2, Monitor } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

// ──────────────────────────────────────────────
// USR-013: Session controls (sign out others / everywhere)
// ──────────────────────────────────────────────

export function SessionControls() {
  const router = useRouter();
  const [signingOutOthers, setSigningOutOthers] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<
    "others" | "all" | null
  >(null);

  const handleSignOutOthers = async () => {
    setSigningOutOthers(true);
    setConfirmDialog(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut({ scope: "others" });

      if (error) {
        toast.error("他のセッションのログアウトに失敗しました");
        return;
      }

      toast.success("他のすべてのセッションをログアウトしました");
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setSigningOutOthers(false);
    }
  };

  const handleSignOutAll = async () => {
    setSigningOutAll(true);
    setConfirmDialog(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut({ scope: "global" });

      if (error) {
        toast.error("ログアウトに失敗しました");
        return;
      }

      toast.success("すべてのセッションをログアウトしました");
      router.push("/login");
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setSigningOutAll(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">セッション操作</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sign out other sessions */}
          <div className="flex items-start justify-between gap-4 rounded-md border border-border p-4">
            <div className="flex items-start gap-3">
              <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  他のセッションをログアウト
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  このデバイス以外のすべてのセッションをログアウトします。不正アクセスの疑いがある場合に使用してください。
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDialog("others")}
              disabled={signingOutOthers}
            >
              {signingOutOthers ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
              )}
              ログアウト
            </Button>
          </div>

          {/* Sign out everywhere */}
          <div className="flex items-start justify-between gap-4 rounded-md border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <LogOut className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  すべてのセッションをログアウト
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  このデバイスを含むすべてのセッションをログアウトします。再度ログインが必要になります。
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDialog("all")}
              disabled={signingOutAll}
            >
              {signingOutAll ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
              )}
              ログアウト
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <Dialog
        open={confirmDialog !== null}
        onOpenChange={() => setConfirmDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog === "all"
                ? "すべてのセッションをログアウトしますか？"
                : "他のセッションをログアウトしますか？"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog === "all"
                ? "このデバイスを含むすべてのセッションがログアウトされます。再度ログインが必要です。"
                : "このデバイス以外のすべてのセッションがログアウトされます。"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(null)}
            >
              キャンセル
            </Button>
            <Button
              variant={confirmDialog === "all" ? "destructive" : "default"}
              onClick={
                confirmDialog === "all"
                  ? handleSignOutAll
                  : handleSignOutOthers
              }
            >
              ログアウトする
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
