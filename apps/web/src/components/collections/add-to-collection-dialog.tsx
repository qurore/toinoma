"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, FolderPlus, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addToCollection } from "@/app/(dashboard)/dashboard/collections/actions";

interface Collection {
  id: string;
  name: string;
}

export function AddToCollectionDialog({
  problemSetId,
}: {
  problemSetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data } = await supabase
      .from("collections")
      .select("id, name")
      .order("updated_at", { ascending: false });
    setCollections(data ?? []);
    setLoading(false);
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      fetchCollections();
    }
  };

  const handleAdd = async (collectionId: string) => {
    setAddingId(collectionId);
    setError(null);
    const result = await addToCollection(collectionId, problemSetId);
    if (result?.error) {
      setError(result.error);
    } else {
      setAddedIds((prev) => new Set([...prev, collectionId]));
    }
    setAddingId(null);
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
        ) : collections.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            コレクションがありません。先にコレクションを作成してください。
          </p>
        ) : (
          <div className="space-y-2">
            {collections.map((collection) => {
              const isAdded = addedIds.has(collection.id);
              return (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => handleAdd(collection.id)}
                  disabled={addingId === collection.id || isAdded}
                  className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
                >
                  <span className="text-sm font-medium">
                    {collection.name}
                  </span>
                  {isAdded ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : addingId === collection.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
