"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUp,
  ArrowDown,
  Shuffle,
  RotateCcw,
  Trash2,
  Loader2,
  Play,
} from "lucide-react";
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
  const [isShuffled, setIsShuffled] = useState(false);

  const handleShuffle = () => {
    setItems(shuffleArray(items));
    setIsShuffled(true);
  };

  const handleResetOrder = () => {
    setItems(initialItems);
    setIsShuffled(false);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= items.length - 1) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const handleRemove = async (problemSetId: string) => {
    setRemovingId(problemSetId);
    const result = await removeFromCollection(collectionId, problemSetId);
    if (!result?.error) {
      setItems((prev) =>
        prev.filter((i) => i.problem_set_id !== problemSetId)
      );
    }
    setRemovingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length}問</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShuffle}
          >
            <Shuffle className="mr-1.5 h-3.5 w-3.5" />
            シャッフル
          </Button>
          {isShuffled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetOrder}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              元に戻す
            </Button>
          )}
          <Button size="sm" asChild>
            <Link
              href={`/dashboard/collections/${collectionId}/solve${isShuffled ? "?shuffle=true" : ""}`}
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              解き始める
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => {
          const ps = item.problem_sets;
          return (
            <Card key={item.id} className="transition-colors hover:bg-muted/30">
              <CardContent className="flex items-center gap-3 p-4">
                {/* Reorder controls */}
                <div className="flex shrink-0 flex-col gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    aria-label="上に移動"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === items.length - 1}
                    aria-label="下に移動"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {index + 1}
                </span>
                <Link
                  href={`/problem/${item.problem_set_id}`}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate font-medium hover:underline">
                    {ps?.title ?? "（不明な問題セット）"}
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
                  size="icon"
                  onClick={() => handleRemove(item.problem_set_id)}
                  disabled={removingId === item.problem_set_id}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="コレクションから削除"
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
