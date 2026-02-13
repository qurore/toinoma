"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shuffle, Trash2, Loader2 } from "lucide-react";
import { SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import { shuffleArray } from "@toinoma/shared/utils";
import { removeFromCollection } from "@/app/(dashboard)/dashboard/collections/actions";
import type { Subject, Difficulty } from "@/types/database";

interface CollectionItem {
  id: string;
  problem_set_id: string;
  position: number;
  problem_sets: {
    title: string;
    subject: string;
    difficulty: string;
    price: number;
  } | null;
}

export function CollectionItemList({
  collectionId,
  items: initialItems,
}: {
  collectionId: string;
  items: CollectionItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleShuffle = () => {
    setItems(shuffleArray(items));
  };

  const handleRemove = async (problemSetId: string) => {
    setRemovingId(problemSetId);
    const result = await removeFromCollection(collectionId, problemSetId);
    if (!result?.error) {
      setItems((prev) => prev.filter((i) => i.problem_set_id !== problemSetId));
    }
    setRemovingId(null);
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            このコレクションにはまだ問題セットがありません
          </p>
          <Button className="mt-4" variant="outline" asChild>
            <Link href="/dashboard/favorites">お気に入りから追加</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length}問</p>
        <Button variant="outline" size="sm" onClick={handleShuffle}>
          <Shuffle className="mr-1 h-3.5 w-3.5" />
          シャッフル
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => {
          const ps = item.problem_sets;
          return (
            <Card key={item.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {index + 1}
                </span>
                <Link
                  href={`/problem/${item.problem_set_id}/solve`}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate font-medium hover:underline">
                    {ps?.title ?? "Unknown"}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {ps?.subject && (
                      <Badge variant="outline" className="text-xs">
                        {SUBJECT_LABELS[ps.subject as Subject]}
                      </Badge>
                    )}
                    {ps?.difficulty && (
                      <Badge variant="outline" className="text-xs">
                        {DIFFICULTY_LABELS[ps.difficulty as Difficulty]}
                      </Badge>
                    )}
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(item.problem_set_id)}
                  disabled={removingId === item.problem_set_id}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  {removingId === item.problem_set_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
