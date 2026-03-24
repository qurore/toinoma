"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2, EyeOff, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";
import { bulkDeleteProblemSets, bulkUnpublishProblemSets } from "./bulk-actions";

// ──────────────────────────────────────────────
// SLR-022: Problem set list with bulk actions
// ──────────────────────────────────────────────

interface ProblemSetItem {
  id: string;
  title: string;
  subject: string;
  difficulty: string;
  price: number;
  status: string;
  created_at: string;
}

interface ProblemSetListProps {
  sets: ProblemSetItem[];
}

export function ProblemSetList({ sets }: ProblemSetListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<"delete" | "unpublish" | null>(null);
  const [isPending, startTransition] = useTransition();

  const allSelected = sets.length > 0 && selectedIds.size === sets.length;
  const someSelected = selectedIds.size > 0;
  const publishedSelectedCount = sets.filter(
    (s) => selectedIds.has(s.id) && s.status === "published"
  ).length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sets.map((s) => s.id)));
    }
  };

  const handleBulkDelete = () => {
    startTransition(async () => {
      const ids = Array.from(selectedIds);
      const result = await bulkDeleteProblemSets(ids);

      setConfirmAction(null);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setSelectedIds(new Set());
      toast.success(`${result.deletedCount}件の問題セットを削除しました`);
    });
  };

  const handleBulkUnpublish = () => {
    startTransition(async () => {
      const ids = Array.from(selectedIds);
      const result = await bulkUnpublishProblemSets(ids);

      setConfirmAction(null);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setSelectedIds(new Set());
      toast.success(`${result.updatedCount}件の問題セットを非公開にしました`);
    });
  };

  return (
    <div>
      {/* Bulk action toolbar */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleSelectAll}
            aria-label="すべて選択"
          />
          <span className="text-xs text-muted-foreground">
            {someSelected
              ? `${selectedIds.size}件を選択中`
              : "すべて選択"}
          </span>
        </div>

        {someSelected && (
          <div className="flex items-center gap-2">
            {publishedSelectedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmAction("unpublish")}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                )}
                非公開にする
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmAction("delete")}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              削除する
            </Button>
          </div>
        )}
      </div>

      {/* Problem set items */}
      <div className="space-y-3">
        {sets.map((ps) => (
          <Card
            key={ps.id}
            className={cn(
              "transition-all duration-150 hover:border-border/80 hover:shadow-sm",
              selectedIds.has(ps.id)
                ? "border-primary/30 bg-primary/5"
                : "hover:bg-muted/30"
            )}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <Checkbox
                checked={selectedIds.has(ps.id)}
                onCheckedChange={() => toggleSelect(ps.id)}
                aria-label={`${ps.title}を選択`}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/sell/${ps.id}/edit`}
                    className="truncate font-medium hover:underline"
                  >
                    {ps.title}
                  </Link>
                  <StatusBadge status={ps.status} />
                </div>
                <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                  <span>
                    {SUBJECT_LABELS[ps.subject as Subject]}
                  </span>
                  <span>
                    {DIFFICULTY_LABELS[ps.difficulty as Difficulty]}
                  </span>
                  <span>
                    {ps.price === 0
                      ? "無料"
                      : `¥${ps.price.toLocaleString()}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/sell/${ps.id}/rubric`}>ルーブリック</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/sell/${ps.id}/edit`}>編集</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Confirmation dialog */}
      <Dialog
        open={confirmAction !== null}
        onOpenChange={() => setConfirmAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "delete"
                ? `${selectedIds.size}件の問題セットを削除しますか？`
                : `${publishedSelectedCount}件の問題セットを非公開にしますか？`}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "delete"
                ? "削除された問題セットは復元できません。関連する購入データ・レビューも削除される場合があります。"
                : "非公開にすると、購入者からは表示されなくなります。再度公開することもできます。"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button
              variant={confirmAction === "delete" ? "destructive" : "default"}
              onClick={
                confirmAction === "delete"
                  ? handleBulkDelete
                  : handleBulkUnpublish
              }
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : confirmAction === "delete" ? (
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <EyeOff className="mr-1.5 h-3.5 w-3.5" />
              )}
              {confirmAction === "delete" ? "削除する" : "非公開にする"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──────────────────────────────────────────────
// Helper components
// ──────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "published") {
    return (
      <Badge className="border-transparent bg-primary/10 text-primary">
        公開中
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="border-transparent">
      下書き
    </Badge>
  );
}
