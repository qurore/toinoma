"use client";

import { useState, useCallback } from "react";
import { Loader2, Save, Camera } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
  const [avatarUrl] = useState<string | null>(initialAvatarUrl);
  const [isSaving, setIsSaving] = useState(false);

  const initials = (displayName || "?")
    .split(/[\s@]/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const hasChanges = displayName.trim() !== initialDisplayName;
  const isTooShort = displayName.trim().length > 0 && displayName.trim().length < 2;

  const handleSave = useCallback(async () => {
    if (!displayName.trim() || isTooShort) return;
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
      toast.error("保存に失敗しました。もう一度お試しください。");
    } finally {
      setIsSaving(false);
    }
  }, [displayName, isTooShort, userId, avatarUrl]);

  return (
    <div className="space-y-6">
      {/* Avatar preview */}
      <div className="flex items-center gap-5">
        <div className="group relative">
          <Avatar className="h-20 w-20 border-2 border-border">
            <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="h-5 w-5 text-white" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">プロフィール画像</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            OAuthプロバイダー（Google / X）から自動取得されます
          </p>
        </div>
      </div>

      {/* Display name */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="display-name">表示名</Label>
          <span
            className={cn(
              "text-xs",
              displayName.length >= 45
                ? "text-warning font-medium"
                : "text-muted-foreground"
            )}
          >
            {displayName.length}/50
          </span>
        </div>
        <Input
          id="display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hasChanges && !isTooShort) handleSave();
          }}
          placeholder="表示名を入力"
          maxLength={50}
          aria-describedby="display-name-hint"
          className={cn(
            isTooShort && "border-destructive focus-visible:ring-destructive/30"
          )}
        />
        {isTooShort ? (
          <p className="text-xs text-destructive" role="alert">
            表示名は2文字以上で入力してください
          </p>
        ) : (
          <p id="display-name-hint" className="text-xs text-muted-foreground">
            問題購入時や提出時に表示される名前です
          </p>
        )}
      </div>

      {/* Save action */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={isSaving || !displayName.trim() || isTooShort || !hasChanges}
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          保存する
        </Button>
        {hasChanges && !isTooShort && (
          <p className="text-xs text-muted-foreground">未保存の変更があります</p>
        )}
      </div>
    </div>
  );
}
