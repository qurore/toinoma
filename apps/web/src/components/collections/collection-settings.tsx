"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Settings, Loader2 } from "lucide-react";
import {
  updateCollection,
  deleteCollection,
} from "@/app/(dashboard)/dashboard/collections/actions";

export function CollectionSettings({
  collectionId,
  name,
  description,
}: {
  collectionId: string;
  name: string;
  description: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (formData: FormData) => {
    setIsUpdating(true);
    setError(null);
    const result = await updateCollection(collectionId, formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setOpen(false);
    }
    setIsUpdating(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    const result = await deleteCollection(collectionId);
    if (result?.error) {
      setError(result.error);
      setIsDeleting(false);
    }
    // On success, deleteCollection redirects
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-1 h-3.5 w-3.5" />
          設定
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>コレクション設定</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form action={handleUpdate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-name">コレクション名</Label>
            <Input
              id="settings-name"
              name="name"
              defaultValue={name}
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-description">説明（任意）</Label>
            <Textarea
              id="settings-description"
              name="description"
              defaultValue={description ?? ""}
              rows={3}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : null}
              保存
            </Button>
          </div>
        </form>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium text-destructive">危険な操作</p>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full"
          >
            {isDeleting ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : null}
            コレクションを削除
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
