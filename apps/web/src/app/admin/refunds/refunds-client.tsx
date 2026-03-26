"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { processRefund } from "./actions";

interface RefundRow {
  id: string;
  userId: string;
  userDisplayName: string | null;
  problemSetId: string;
  problemSetTitle: string;
  amountPaid: number;
  createdAt: string;
  hasSubmissions: boolean;
  eligible: boolean;
}

export function RefundsClient({ rows }: { rows: RefundRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmRow, setConfirmRow] = useState<RefundRow | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleRefund = async () => {
    if (!confirmRow) return;
    setProcessing(true);

    const result = await processRefund(confirmRow.id);

    setProcessing(false);
    setConfirmRow(null);

    if (result.error) {
      toast.error("返金に失敗しました", { description: result.error });
    } else {
      toast.success("返金が完了しました", {
        description: `¥${confirmRow.amountPaid.toLocaleString()} を返金しました`,
      });
      startTransition(() => {
        router.refresh();
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              返金対象の購入
            </CardTitle>
            <Badge variant="secondary">{rows.length}件</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              返金対象の購入はありません
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">日時</th>
                    <th className="pb-3 pr-4 font-medium">ユーザー</th>
                    <th className="pb-3 pr-4 font-medium">問題セット</th>
                    <th className="pb-3 pr-4 text-right font-medium">金額</th>
                    <th className="pb-3 pr-4 font-medium">ステータス</th>
                    <th className="pb-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/50">
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(row.createdAt).toLocaleString("ja-JP", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 pr-4">
                        <div>
                          <p className="font-medium">
                            {row.userDisplayName ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {row.userId.slice(0, 8)}...
                          </p>
                        </div>
                      </td>
                      <td className="py-3 pr-4 font-medium">
                        {row.problemSetTitle}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        ¥{row.amountPaid.toLocaleString()}
                      </td>
                      <td className="py-3 pr-4">
                        {row.hasSubmissions ? (
                          <Badge variant="outline" className="text-xs">
                            提出済み
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-xs"
                          >
                            返金可能
                          </Badge>
                        )}
                      </td>
                      <td className="py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!row.eligible || isPending}
                          onClick={() => setConfirmRow(row)}
                        >
                          返金
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refund confirmation dialog */}
      <Dialog
        open={!!confirmRow}
        onOpenChange={(open) => !open && setConfirmRow(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              返金の確認
            </DialogTitle>
            <DialogDescription>
              以下の購入に対して返金処理を実行しますか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>

          {confirmRow && (
            <div className="rounded-md border border-border bg-muted/50 p-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">ユーザー</p>
                  <p className="font-medium">
                    {confirmRow.userDisplayName ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">金額</p>
                  <p className="font-medium">
                    ¥{confirmRow.amountPaid.toLocaleString()}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">問題セット</p>
                  <p className="font-medium">{confirmRow.problemSetTitle}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmRow(null)}
              disabled={processing}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleRefund}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              返金を実行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
