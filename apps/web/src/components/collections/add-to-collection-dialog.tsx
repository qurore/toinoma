"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Loader2, FolderPlus, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  addToCollection,
  removeFromCollection,
} from "@/app/(dashboard)/dashboard/collections/actions";

// ─── Types ────────────────────────────────────────────────────────────

interface Collection {
  id: string;
  name: string;
}

// ─── Component ────────────────────────────────────────────────────────

export function AddToCollectionDialog({
  problemSetId,
}: {
  problemSetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [containingIds, setContainingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Inline creation state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Fetch user's collections and which ones already contain this problem
  const fetchCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    // Fetch user collections
    const { data } = await supabase
      .from("collections")
      .select("id, name")
      .order("updated_at", { ascending: false });

    const allCollections = data ?? [];
    setCollections(allCollections);

    // Check which collections already contain this problem set
    if (allCollections.length > 0) {
      const { data: items } = await supabase
        .from("collection_items")
        .select("collection_id")
        .eq("problem_set_id", problemSetId)
        .in(
          "collection_id",
          allCollections.map((c) => c.id)
        );

      setContainingIds(
        new Set((items ?? []).map((i) => i.collection_id))
      );
    }

    setLoading(false);
  }, [problemSetId]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      fetchCollections();
      setShowCreateForm(false);
      setNewName("");
    }
  };

  // Toggle add/remove for a collection
  const handleToggle = async (collectionId: string) => {
    setTogglingId(collectionId);
    setError(null);

    const isCurrentlyAdded = containingIds.has(collectionId);

    if (isCurrentlyAdded) {
      // Remove from collection
      const result = await removeFromCollection(collectionId, problemSetId);
      if (result?.error) {
        setError(result.error);
      } else {
        setContainingIds((prev) => {
          const next = new Set(prev);
          next.delete(collectionId);
          return next;
        });
        toast.success("コレクションから削除しました");
      }
    } else {
      // Add to collection
      const result = await addToCollection(collectionId, problemSetId);
      if (result?.error) {
        setError(result.error);
      } else {
        setContainingIds((prev) => new Set([...prev, collectionId]));
        toast.success("コレクションに追加しました");
      }
    }

    setTogglingId(null);
  };

  // Inline create new collection and add problem to it
  const handleCreateAndAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setIsCreating(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("認証が必要です");
        setIsCreating(false);
        return;
      }

      // Create collection
      const { data: newCollection, error: createError } = await supabase
        .from("collections")
        .insert({ user_id: user.id, name: trimmed, description: null })
        .select("id, name")
        .single();

      if (createError || !newCollection) {
        setError("コレクションの作成に失敗しました");
        setIsCreating(false);
        return;
      }

      // Add problem to the new collection
      await addToCollection(newCollection.id, problemSetId);

      // Update local state
      setCollections((prev) => [newCollection, ...prev]);
      setContainingIds((prev) => new Set([...prev, newCollection.id]));
      setNewName("");
      setShowCreateForm(false);
      toast.success("新しいコレクションを作成して追加しました");
    } catch {
      setError("操作に失敗しました");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FolderPlus className="mr-1 h-3.5 w-3.5" />
          コレクションに追加
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>コレクションに追加</DialogTitle>
          <DialogDescription>
            この問題セットを追加するコレクションを選択してください。
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Collection list with add/remove toggle */}
            {collections.length > 0 ? (
              <div className="max-h-[280px] space-y-1.5 overflow-y-auto">
                {collections.map((collection) => {
                  const isAdded = containingIds.has(collection.id);
                  const isToggling = togglingId === collection.id;

                  return (
                    <button
                      key={collection.id}
                      type="button"
                      onClick={() => handleToggle(collection.id)}
                      disabled={isToggling}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors",
                        isAdded
                          ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                          : "border-border hover:bg-muted/50",
                        isToggling && "opacity-60"
                      )}
                    >
                      <span className="text-sm font-medium">
                        {collection.name}
                      </span>
                      {isToggling ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : isAdded ? (
                        <span className="flex items-center gap-1 text-xs text-primary">
                          <Check className="h-3.5 w-3.5" />
                          追加済み
                        </span>
                      ) : (
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                コレクションがありません
              </p>
            )}

            <Separator />

            {/* Inline collection creation */}
            {showCreateForm ? (
              <div className="space-y-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="新しいコレクション名"
                  maxLength={100}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateAndAdd();
                    }
                    if (e.key === "Escape") {
                      setShowCreateForm(false);
                      setNewName("");
                    }
                  }}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewName("");
                    }}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!newName.trim() || isCreating}
                    onClick={handleCreateAndAdd}
                  >
                    {isCreating ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="mr-1 h-3.5 w-3.5" />
                    )}
                    作成して追加
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowCreateForm(true)}
              >
                <FolderPlus className="mr-1.5 h-3.5 w-3.5" />
                新しいコレクションを作成
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
