"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Heart, Loader2 } from "lucide-react";
import { ProblemSetCard } from "@/components/marketplace/problem-set-card";
import type { ProblemSetCardData } from "@/components/marketplace/problem-set-card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Subject } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────

interface FavoriteItem {
  favoriteId: string;
  problemSetId: string;
  createdAt: string;
  card: ProblemSetCardData | null;
}

interface SubjectOption {
  value: Subject;
  label: string;
}

type SortMode = "newest" | "oldest" | "price_low" | "price_high";

interface FavoritesClientProps {
  items: FavoriteItem[];
  userId: string;
  subjectOptions: SubjectOption[];
}

// ─── Component ────────────────────────────────────────────────────────

export function FavoritesClient({
  items: initialItems,
  userId,
  subjectOptions,
}: FavoritesClientProps) {
  const [items, setItems] = useState(initialItems);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    favoriteId: string;
    problemSetId: string;
    title: string;
  } | null>(null);

  const executeRemove = useCallback(
    async (favoriteId: string, problemSetId: string) => {
      setRemovingId(problemSetId);
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("problem_set_id", problemSetId);

        if (error) {
          toast.error("お気に入りの削除に失敗しました");
          return;
        }

        setItems((prev) =>
          prev.filter((i) => i.favoriteId !== favoriteId)
        );
        toast.success("お気に入りから削除しました");
      } catch {
        toast.error("お気に入りの削除に失敗しました");
      } finally {
        setRemovingId(null);
      }
    },
    [userId]
  );

  // Show confirmation before removing
  const handleRemove = useCallback(
    (favoriteId: string, problemSetId: string, title: string) => {
      setConfirmTarget({ favoriteId, problemSetId, title });
    },
    []
  );

  const filtered = useMemo(() => {
    let result = [...items];

    // Subject filter
    if (subjectFilter !== "all") {
      result = result.filter((i) => i.card?.subject === subjectFilter);
    }

    // Sort
    switch (sortMode) {
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "oldest":
        result.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case "price_low":
        result.sort(
          (a, b) => (a.card?.price ?? 0) - (b.card?.price ?? 0)
        );
        break;
      case "price_high":
        result.sort(
          (a, b) => (b.card?.price ?? 0) - (a.card?.price ?? 0)
        );
        break;
    }

    return result;
  }, [items, subjectFilter, sortMode]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">お気に入り</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length}件のお気に入り
        </p>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-[40vh] flex-col items-center justify-center py-16 text-center">
            <h2 className="mb-2 text-lg font-semibold">
              お気に入りの問題セットがまだありません
            </h2>
            <p className="mb-2 max-w-md text-sm text-muted-foreground">
              気になる問題セットを見つけたら、ハートアイコンをタップしてお気に入りに保存できます。
            </p>
            <p className="mb-8 max-w-md text-sm text-muted-foreground">
              後でまとめて確認・購入したいときに便利です。
            </p>
            <Button asChild>
              <Link href="/explore">
                問題を探す
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Select
                value={subjectFilter}
                onValueChange={setSubjectFilter}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="科目で絞り込み" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての科目</SelectItem>
                  {subjectOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={sortMode}
                onValueChange={(v) => setSortMode(v as SortMode)}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">追加日（新しい順）</SelectItem>
                  <SelectItem value="oldest">追加日（古い順）</SelectItem>
                  <SelectItem value="price_low">価格（安い順）</SelectItem>
                  <SelectItem value="price_high">価格（高い順）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filtered.length !== items.length && (
              <span className="text-xs text-muted-foreground">
                {filtered.length}件表示中
              </span>
            )}
          </div>

          {/* Filtered empty state */}
          {filtered.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <p className="mb-1 text-sm font-medium">
                  条件に一致するお気に入りがありません
                </p>
                <p className="mb-4 text-sm text-muted-foreground">
                  フィルター条件を変更してお探しください
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSubjectFilter("all")}
                >
                  フィルターをリセット
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((fav) => {
              if (!fav.card) return null;

              return (
                <div key={fav.favoriteId} className="group relative">
                  <ProblemSetCard
                    data={fav.card}
                    isFavorited
                    userId={userId}
                  />
                  {/* Remove overlay button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemove(
                        fav.favoriteId,
                        fav.problemSetId,
                        fav.card?.title ?? ""
                      );
                    }}
                    disabled={removingId === fav.problemSetId}
                    aria-label="お気に入りから削除"
                    className="absolute left-2 top-2 z-10 rounded-full bg-background/90 p-1.5 shadow-sm backdrop-blur-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    {removingId === fav.problemSetId ? (
                      <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                    ) : (
                      <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Unfavorite confirmation dialog */}
      <AlertDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>お気に入りから削除</AlertDialogTitle>
            <AlertDialogDescription>
              「{confirmTarget?.title}」をお気に入りから削除しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmTarget) {
                  executeRemove(
                    confirmTarget.favoriteId,
                    confirmTarget.problemSetId
                  );
                }
              }}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
