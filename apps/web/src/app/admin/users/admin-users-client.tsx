"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  MoreHorizontal,
  Eye,
  AlertTriangle,
  Ban,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { banUser, suspendUser, warnUser, unbanUser } from "../actions";
import type { AdminUserRow } from "./page";

interface AdminUsersClientProps {
  users: AdminUserRow[];
  query: string;
  roleFilter: string;
  statusFilter: string;
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

type ActionType = "warn" | "suspend" | "ban" | null;

function getUserStatus(
  user: AdminUserRow
): { label: string; variant: "destructive" | "default" | "secondary" } {
  if (user.banned_at) return { label: "BAN", variant: "destructive" };
  if (
    user.suspended_until &&
    new Date(user.suspended_until) > new Date()
  ) {
    return { label: "停止中", variant: "default" };
  }
  return { label: "有効", variant: "secondary" };
}

export function AdminUsersClient({
  users,
  query,
  roleFilter,
  statusFilter,
  currentPage,
  totalPages,
  totalCount,
}: AdminUsersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(query);

  // Dialog state
  const [dialogAction, setDialogAction] = useState<ActionType>(null);
  const [dialogUser, setDialogUser] = useState<AdminUserRow | null>(null);
  const [reason, setReason] = useState("");
  const [suspendDays, setSuspendDays] = useState("7");
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
    // Reset page to 1 when filters change (except when page itself is updated)
    if (!("page" in updates)) {
      params.delete("page");
    }
    router.push(`/admin/users?${params.toString()}`);
  }

  function handleSearch() {
    updateParams({ q: searchValue });
  }

  function openActionDialog(action: ActionType, user: AdminUserRow) {
    setDialogAction(action);
    setDialogUser(user);
    setReason("");
    setSuspendDays("7");
  }

  async function executeAction() {
    if (!dialogUser || !dialogAction) return;
    setIsActionPending(true);

    try {
      let result: { success?: boolean; error?: string };

      switch (dialogAction) {
        case "warn":
          result = await warnUser(dialogUser.id, reason);
          break;
        case "suspend":
          result = await suspendUser(
            dialogUser.id,
            reason,
            parseInt(suspendDays, 10)
          );
          break;
        case "ban":
          result = await banUser(dialogUser.id, reason);
          break;
        default:
          return;
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        const labels = { warn: "警告", suspend: "一時停止", ban: "BAN" };
        toast.success(
          `${dialogUser.display_name ?? "ユーザー"}を${labels[dialogAction]}しました`
        );
        router.refresh();
      }
    } catch {
      toast.error("操作に失敗しました");
    } finally {
      setIsActionPending(false);
      setDialogAction(null);
      setDialogUser(null);
    }
  }

  async function handleUnban(user: AdminUserRow) {
    startTransition(async () => {
      const result = await unbanUser(user.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `${user.display_name ?? "ユーザー"}の制限を解除しました`
        );
        router.refresh();
      }
    });
  }

  const actionLabels: Record<string, string> = {
    warn: "警告する",
    suspend: "一時停止する",
    ban: "BANする",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">ユーザー管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalCount.toLocaleString()}件のユーザーを管理しています
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="表示名で検索..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(v) => updateParams({ role: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="ロール" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="sellers">出品者</SelectItem>
            <SelectItem value="subscribers">有料会員</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            updateParams({ status: v === "all" ? "" : v })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="active">有効</SelectItem>
            <SelectItem value="suspended">停止中</SelectItem>
            <SelectItem value="banned">BAN</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ユーザー一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <div className="rounded-full bg-muted p-3">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">条件に一致するユーザーが見つかりません</p>
              <p className="text-sm text-muted-foreground">
                検索条件やフィルターを変更してお試しください
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">ユーザー</th>
                    <th className="pb-3 pr-4 font-medium">ステータス</th>
                    <th className="pb-3 pr-4 font-medium">プラン</th>
                    <th className="pb-3 pr-4 font-medium">出品者</th>
                    <th className="pb-3 pr-4 font-medium">登録日</th>
                    <th className="pb-3 font-medium">
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u) => {
                    const status = getUserStatus(u);
                    const initials = (u.display_name ?? "?")
                      .slice(0, 2)
                      .toUpperCase();
                    const isBannedOrSuspended =
                      !!u.banned_at ||
                      (!!u.suspended_until &&
                        new Date(u.suspended_until) > new Date());

                    return (
                      <tr key={u.id} className="hover:bg-muted/50">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage
                                src={u.avatar_url ?? undefined}
                              />
                              <AvatarFallback className="bg-primary/10 text-xs text-primary">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <span className="block truncate font-medium">
                                {u.display_name ?? "—"}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {u.id.slice(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant={status.variant}
                            className="text-xs"
                          >
                            {status.label}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant={
                              u.tier === "pro"
                                ? "default"
                                : u.tier === "basic"
                                  ? "secondary"
                                  : "outline"
                            }
                            className="text-xs"
                          >
                            {u.tier}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          {u.is_seller ? (
                            <Badge
                              variant="secondary"
                              className="text-xs"
                            >
                              出品者
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString(
                            "ja-JP"
                          )}
                        </td>
                        <td className="py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">操作</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(
                                    `/sellers/${u.id}`,
                                    "_blank"
                                  )
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                プロフィールを表示
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {isBannedOrSuspended ? (
                                <DropdownMenuItem
                                  onClick={() => handleUnban(u)}
                                  disabled={isPending}
                                >
                                  <ShieldCheck className="mr-2 h-4 w-4" />
                                  制限を解除
                                </DropdownMenuItem>
                              ) : (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      openActionDialog("warn", u)
                                    }
                                  >
                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                    警告する
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      openActionDialog("suspend", u)
                                    }
                                  >
                                    <Clock className="mr-2 h-4 w-4" />
                                    一時停止する
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() =>
                                      openActionDialog("ban", u)
                                    }
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    BANする
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

      {/* Action dialog */}
      <Dialog
        open={dialogAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialogAction(null);
            setDialogUser(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction
                ? actionLabels[dialogAction]
                : ""}
            </DialogTitle>
            <DialogDescription>
              {dialogUser?.display_name ?? "ユーザー"}に対して
              {dialogAction === "warn" && "警告を送ります。"}
              {dialogAction === "suspend" && "一時停止を適用します。"}
              {dialogAction === "ban" && "BANを適用します。この操作は取り消し可能です。"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="action-reason">理由</Label>
              <Textarea
                id="action-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="操作の理由を入力してください"
                rows={3}
              />
            </div>

            {dialogAction === "suspend" && (
              <div className="space-y-1.5">
                <Label htmlFor="suspend-days">停止期間（日数）</Label>
                <Select
                  value={suspendDays}
                  onValueChange={setSuspendDays}
                >
                  <SelectTrigger id="suspend-days">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1日</SelectItem>
                    <SelectItem value="3">3日</SelectItem>
                    <SelectItem value="7">7日</SelectItem>
                    <SelectItem value="14">14日</SelectItem>
                    <SelectItem value="30">30日</SelectItem>
                    <SelectItem value="90">90日</SelectItem>
                    <SelectItem value="365">365日</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogAction(null);
                setDialogUser(null);
              }}
              disabled={isActionPending}
            >
              キャンセル
            </Button>
            <Button
              variant={dialogAction === "ban" ? "destructive" : "default"}
              onClick={executeAction}
              disabled={isActionPending || !reason.trim()}
            >
              {isActionPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {dialogAction ? actionLabels[dialogAction] : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
