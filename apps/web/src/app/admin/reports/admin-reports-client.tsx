"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ExternalLink,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  XCircle,
  CheckCircle,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateReportStatus, takeReportAction } from "../actions";
import type { AdminReportRow } from "./page";

const STATUS_LABELS: Record<string, string> = {
  pending: "未対応",
  reviewed: "確認済み",
  action_taken: "対応済み",
  dismissed: "却下",
};

const STATUS_VARIANTS: Record<
  string,
  "destructive" | "default" | "secondary" | "outline"
> = {
  pending: "destructive",
  reviewed: "default",
  action_taken: "secondary",
  dismissed: "outline",
};

const REASON_LABELS: Record<string, string> = {
  copyright: "著作権侵害",
  inappropriate: "不適切な内容",
  spam: "スパム",
  other: "その他",
};

interface AdminReportsClientProps {
  reports: AdminReportRow[];
  statusFilter: string;
  reasonFilter: string;
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

type DialogType = "dismiss" | "action" | null;

export function AdminReportsClient({
  reports,
  statusFilter,
  reasonFilter,
  currentPage,
  totalPages,
  totalCount,
}: AdminReportsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Dialog state
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [activeReport, setActiveReport] = useState<AdminReportRow | null>(null);
  const [notes, setNotes] = useState("");
  const [isActionPending, setIsActionPending] = useState(false);

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val) {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    }
    if (!("page" in updates)) {
      params.delete("page");
    }
    router.push(`/admin/reports?${params.toString()}`);
  }

  function getTargetLabel(report: AdminReportRow): string {
    if (report.problem_set_id) return report.target_title ?? "問題セット";
    if (report.review_id) return "レビュー";
    if (report.qa_question_id) return "Q&A質問";
    return "不明";
  }

  function getTargetLink(report: AdminReportRow): string | null {
    if (report.problem_set_id) return `/problem/${report.problem_set_id}`;
    return null;
  }

  function openDialog(type: DialogType, report: AdminReportRow) {
    setDialogType(type);
    setActiveReport(report);
    setNotes("");
  }

  async function handleDismiss() {
    if (!activeReport) return;
    setIsActionPending(true);
    try {
      const result = await updateReportStatus(
        activeReport.id,
        "dismissed",
        notes
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("報告を却下しました");
        router.refresh();
      }
    } catch {
      toast.error("操作に失敗しました");
    } finally {
      setIsActionPending(false);
      setDialogType(null);
      setActiveReport(null);
    }
  }

  async function handleTakeAction() {
    if (!activeReport) return;
    setIsActionPending(true);
    try {
      const result = await takeReportAction(activeReport.id, notes);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("対応を完了しました");
        router.refresh();
      }
    } catch {
      toast.error("操作に失敗しました");
    } finally {
      setIsActionPending(false);
      setDialogType(null);
      setActiveReport(null);
    }
  }

  async function handleMarkReviewed(reportId: string) {
    startTransition(async () => {
      const result = await updateReportStatus(reportId, "reviewed");
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("確認済みにしました");
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">報告管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalCount.toLocaleString()}件の報告を管理しています
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            updateParams({ status: v === "all" ? "" : v })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのステータス</SelectItem>
            <SelectItem value="pending">未対応</SelectItem>
            <SelectItem value="reviewed">確認済み</SelectItem>
            <SelectItem value="action_taken">対応済み</SelectItem>
            <SelectItem value="dismissed">却下</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={reasonFilter}
          onValueChange={(v) =>
            updateParams({ reason: v === "all" ? "" : v })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="報告理由" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべての理由</SelectItem>
            <SelectItem value="copyright">著作権侵害</SelectItem>
            <SelectItem value="inappropriate">不適切な内容</SelectItem>
            <SelectItem value="spam">スパム</SelectItem>
            <SelectItem value="other">その他</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">報告一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <div className="rounded-full bg-muted p-3">
                <Shield className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">条件に一致する報告はありません</p>
              <p className="text-sm text-muted-foreground">
                フィルターを変更してお試しください
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => {
                const targetLink = getTargetLink(report);

                return (
                  <div
                    key={report.id}
                    className="rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              STATUS_VARIANTS[report.status] ?? "outline"
                            }
                            className="text-xs"
                          >
                            {STATUS_LABELS[report.status] ?? report.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {REASON_LABELS[report.reason] ?? report.reason}
                          </Badge>
                        </div>

                        {/* Target */}
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="text-muted-foreground">
                            対象:
                          </span>
                          {targetLink ? (
                            <a
                              href={targetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              {getTargetLabel(report)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span>{getTargetLabel(report)}</span>
                          )}
                        </div>

                        {/* Description */}
                        {report.description && (
                          <p className="text-sm text-foreground/80">
                            {report.description}
                          </p>
                        )}

                        {/* Meta */}
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>
                            報告者: {report.reporter_name ?? "不明"}
                          </span>
                          <span>
                            {new Date(
                              report.created_at
                            ).toLocaleString("ja-JP")}
                          </span>
                          {report.reviewed_at && (
                            <span>
                              対応日:{" "}
                              {new Date(
                                report.reviewed_at
                              ).toLocaleString("ja-JP")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {report.status === "pending" ||
                      report.status === "reviewed" ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">操作</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {report.status === "pending" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleMarkReviewed(report.id)
                                }
                                disabled={isPending}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                確認済みにする
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() =>
                                openDialog("action", report)
                              }
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              対応する（コンテンツ削除）
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                openDialog("dismiss", report)
                              }
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              却下する
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <p className="text-xs text-muted-foreground">
                {totalCount}件中{" "}
                {(currentPage - 1) * 20 + 1}〜
                {Math.min(currentPage * 20, totalCount)}件を表示
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() =>
                    updateParams({ page: String(currentPage - 1) })
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    updateParams({ page: String(currentPage + 1) })
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dismiss dialog */}
      <Dialog
        open={dialogType === "dismiss"}
        onOpenChange={(open) => {
          if (!open) {
            setDialogType(null);
            setActiveReport(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>報告を却下する</DialogTitle>
            <DialogDescription>
              この報告を却下します。理由を記録してください。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="dismiss-notes">管理者メモ</Label>
              <Textarea
                id="dismiss-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="却下の理由を入力してください"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogType(null);
                setActiveReport(null);
              }}
              disabled={isActionPending}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleDismiss}
              disabled={isActionPending || !notes.trim()}
            >
              {isActionPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              却下する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Take action dialog */}
      <Dialog
        open={dialogType === "action"}
        onOpenChange={(open) => {
          if (!open) {
            setDialogType(null);
            setActiveReport(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>対応する</DialogTitle>
            <DialogDescription>
              報告されたコンテンツを削除し、報告のステータスを「対応済み」に変更します。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="action-notes">管理者メモ</Label>
              <Textarea
                id="action-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="対応の詳細を記録してください"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogType(null);
                setActiveReport(null);
              }}
              disabled={isActionPending}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleTakeAction}
              disabled={isActionPending || !notes.trim()}
            >
              {isActionPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              対応する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
