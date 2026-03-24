"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { updateSellerProfile } from "./actions";

type SellerProfileData = {
  sellerDisplayName: string;
  sellerDescription: string | null;
  university: string | null;
  circleName: string | null;
};

export function SellerSettingsForm({
  profile,
}: {
  profile: SellerProfileData;
}) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      return updateSellerProfile(formData);
    },
    null
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="sellerDisplayName">出品者名</Label>
        <Input
          id="sellerDisplayName"
          name="sellerDisplayName"
          defaultValue={profile.sellerDisplayName}
          placeholder="表示名を入力"
          required
          maxLength={50}
        />
        <p className="text-xs text-muted-foreground">
          購入者に表示される名前です（最大50文字）
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sellerDescription">自己紹介</Label>
        <Textarea
          id="sellerDescription"
          name="sellerDescription"
          defaultValue={profile.sellerDescription ?? ""}
          placeholder="問題作成のバックグラウンドや得意分野を紹介しましょう"
          maxLength={500}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          プロフィールページに表示されます（最大500文字）
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="university">大学名</Label>
          <Input
            id="university"
            name="university"
            defaultValue={profile.university ?? ""}
            placeholder="例: 東京大学"
            maxLength={100}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="circleName">サークル名</Label>
          <Input
            id="circleName"
            name="circleName"
            defaultValue={profile.circleName ?? ""}
            placeholder="例: 数学研究会"
            maxLength={100}
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-success">プロフィールを更新しました</p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        保存
      </Button>
    </form>
  );
}
