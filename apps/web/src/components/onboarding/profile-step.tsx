"use client";

import { useActionState } from "react";
import { saveSellerProfile } from "@/app/(seller)/sell/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function ProfileStep() {
  const [state, action, isPending] = useActionState(
    (_prev: { error?: string } | undefined, formData: FormData) =>
      saveSellerProfile(formData),
    undefined
  );

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>販売者プロフィール</CardTitle>
        <CardDescription>
          購入者に表示される販売者情報を入力してください。
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sellerDisplayName">
              表示名 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sellerDisplayName"
              name="sellerDisplayName"
              placeholder="例: 東大理系サークル"
              required
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sellerDescription">自己紹介</Label>
            <Textarea
              id="sellerDescription"
              name="sellerDescription"
              placeholder="例: 東京大学の理系学生が中心のサークルです。物理と数学の問題を作成しています。"
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="university">大学名</Label>
              <Input
                id="university"
                name="university"
                placeholder="例: 東京大学"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="circleName">サークル・団体名</Label>
              <Input
                id="circleName"
                name="circleName"
                placeholder="例: 問題研究会"
                maxLength={100}
              />
            </div>
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            保存して次へ
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
