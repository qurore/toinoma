"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Megaphone,
  MoreHorizontal,
  Pencil,
  Send,
  EyeOff,
  Trash2,
  Loader2,
  Users,
  Store,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { AnnouncementForm } from "./announcement-form";
import {
  publishAnnouncement,
  unpublishAnnouncement,
  deleteAnnouncement,
} from "./actions";
import type { AnnouncementRow } from "./page";

const TARGET_LABELS: Record<string, string> = {
  all: "全ユーザー",
  sellers: "出品者のみ",
  subscribers: "有料会員のみ",
};

const TARGET_ICONS: Record<string, typeof Users> = {
  all: Users,
  sellers: Store,
  subscribers: Crown,
};

interface AnnouncementsClientProps {
  announcements: AnnouncementRow[];
}

export function AnnouncementsClient({
  announcements,
}: AnnouncementsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<AnnouncementRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  function handlePublish(id: string) {
    setPublishingId(id);
  }

  function confirmPublish() {
    if (!publishingId) return;
    startTransition(async () => {
      const result = await publishAnnouncement(publishingId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("お知らせを公開しました");
        router.refresh();
      }
      setPublishingId(null);
    });
  }

  function handleUnpublish(id: string) {
    startTransition(async () => {
      const result = await unpublishAnnouncement(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("お知らせを非公開にしました");
        router.refresh();
      }
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
  }

  function confirmDelete() {
    if (!deletingId) return;
    startTransition(async () => {
      const result = await deleteAnnouncement(deletingId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("お知らせを削除しました");
        router.refresh();
      }
      setDeletingId(null);
    });
  }

  const publishingAnnouncement = announcements.find(
    (a) => a.id === publishingId
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">お知らせ管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ユーザーへのお知らせを作成・管理します
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          お知らせを作成
        </Button>
      </div>

      {/* Stats */}
      {announcements.length > 0 && (
        <div className="mb-6 flex items-center gap-4 text-sm text-muted-foreground">
          <span>{announcements.length} 件</span>
          <span>
            公開中: {announcements.filter((a) => a.published).length}
          </span>
          <span>
            下書き: {announcements.filter((a) => !a.published).length}
          </span>
        </div>
      )}

      {/* Empty state */}
      {announcements.length === 0 && !showCreateForm && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Megaphone className="h-6 w-6 text-foreground/60" />
            </div>
            <p className="mb-2 text-lg font-medium">
              お知らせがまだありません
            </p>
            <p className="mb-6 text-sm text-muted-foreground">
              ユーザーに向けたお知らせを作成しましょう
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              最初のお知らせを作成
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create form dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>お知らせを作成</DialogTitle>
            <DialogDescription>
              新しいお知らせを作成します。保存後に公開できます。
            </DialogDescription>
          </DialogHeader>
          <AnnouncementForm
            mode="create"
            onClose={() => setShowCreateForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit form dialog */}
      <Dialog
        open={editingAnnouncement !== null}
        onOpenChange={(open) => {
          if (!open) setEditingAnnouncement(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>お知らせを編集</DialogTitle>
            <DialogDescription>
              お知らせの内容を編集します。
            </DialogDescription>
          </DialogHeader>
          {editingAnnouncement && (
            <AnnouncementForm
              mode="edit"
              announcement={editingAnnouncement}
              onClose={() => setEditingAnnouncement(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Publish confirmation dialog */}
      <Dialog
        open={publishingId !== null}
        onOpenChange={(open) => {
          if (!open) setPublishingId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>お知らせを公開しますか？</DialogTitle>
            <DialogDescription>
              {publishingAnnouncement && (
                <>
                  「{publishingAnnouncement.title}」を
                  {TARGET_LABELS[publishingAnnouncement.target]}
                  に公開し、通知を送信します。
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPublishingId(null)}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button onClick={confirmPublish} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              公開する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deletingId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>お知らせを削除しますか？</DialogTitle>
            <DialogDescription>
              この操作は取り消せません。下書きのお知らせを完全に削除します。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingId(null)}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-4 w-4" />
              )}
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Announcements list */}
      {announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.map((ann) => {
            const TargetIcon = TARGET_ICONS[ann.target] ?? Users;

            return (
              <Card key={ann.id}>
                <CardContent className="flex items-start gap-4 p-4">
                  {/* Icon */}
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Megaphone className="h-4 w-4 text-foreground/60" />
                  </div>

                  {/* Main content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {ann.title}
                      </span>
                      <Badge
                        variant={ann.published ? "default" : "outline"}
                      >
                        {ann.published ? "公開中" : "下書き"}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {ann.body}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <TargetIcon className="h-3 w-3" />
                        {TARGET_LABELS[ann.target] ?? ann.target}
                      </span>
                      <span>
                        作成:{" "}
                        {new Date(ann.created_at).toLocaleDateString(
                          "ja-JP"
                        )}
                      </span>
                      {ann.published_at && (
                        <span>
                          公開:{" "}
                          {new Date(
                            ann.published_at
                          ).toLocaleDateString("ja-JP")}
                        </span>
                      )}
                      {ann.admin_name && (
                        <span>作成者: {ann.admin_name}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">操作</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setEditingAnnouncement(ann)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        編集
                      </DropdownMenuItem>
                      {!ann.published && (
                        <DropdownMenuItem
                          onClick={() => handlePublish(ann.id)}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          公開する
                        </DropdownMenuItem>
                      )}
                      {ann.published && (
                        <DropdownMenuItem
                          onClick={() => handleUnpublish(ann.id)}
                        >
                          <EyeOff className="mr-2 h-4 w-4" />
                          非公開にする
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {!ann.published && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(ann.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          削除
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
