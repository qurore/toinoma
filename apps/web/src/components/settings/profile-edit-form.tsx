"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileEditFormProps {
  userId: string;
  initialDisplayName: string;
  initialAvatarUrl: string | null;
}

export function ProfileEditForm({
  userId,
  initialDisplayName,
  initialAvatarUrl,
}: ProfileEditFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [isSaving, setIsSaving] = useState(false);

  const initials = (displayName || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSave() {
    if (!displayName.trim()) return;
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, display_name: displayName.trim(), avatar_url: avatarUrl })
        .eq("id", userId);

      if (error) throw error;
      toast.success("プロフィールを保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Avatar preview */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
          <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="text-sm text-muted-foreground">
          <User className="mb-1 inline h-4 w-4" />
          {" プロフィール画像はGravatar / OAuth プロバイダーから取得されます"}
        </div>
      </div>

      {/* Display name */}
      <div className="space-y-1.5">
        <Label htmlFor="display-name">表示名</Label>
        <Input
          id="display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="表示名を入力"
          maxLength={50}
        />
        <p className="text-xs text-muted-foreground">
          問題購入時や提出時に表示される名前です
        </p>
      </div>

      <Button onClick={handleSave} disabled={isSaving || !displayName.trim()}>
        {isSaving && (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        保存する
      </Button>
    </div>
  );
}
