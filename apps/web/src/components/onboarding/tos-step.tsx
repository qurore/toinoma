"use client";

import { useActionState } from "react";
import { acceptTos } from "@/app/(seller)/sell/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function TosStep() {
  const [accepted, setAccepted] = useState(false);
  const [, action, isPending] = useActionState(acceptTos, undefined);

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>販売者利用規約</CardTitle>
        <CardDescription>
          販売者として活動するには、以下の利用規約に同意してください。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 overflow-y-auto rounded-md border border-border bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground">
          <h3 className="mb-2 font-semibold text-foreground">
            Toinoma 販売者利用規約
          </h3>
          <p className="mb-4">
            本規約は、Toinoma（以下「本サービス」）において、問題セットを作成・販売する販売者に適用されます。
          </p>
          <h4 className="mb-1 font-medium text-foreground">
            第1条（販売者の資格）
          </h4>
          <p className="mb-3">
            販売者は、本規約に同意し、所定の登録手続きを完了した者とします。
          </p>
          <h4 className="mb-1 font-medium text-foreground">
            第2条（問題セットの作成）
          </h4>
          <p className="mb-3">
            販売者は、自ら創作したオリジナルの問題のみを出品できます。実際の入試問題の転載・複製は禁止します。
          </p>
          <h4 className="mb-1 font-medium text-foreground">
            第3条（手数料）
          </h4>
          <p className="mb-3">
            販売代金のうち、プラットフォーム手数料15%を差し引いた金額が販売者に支払われます。Stripe決済手数料は別途差し引かれます。
          </p>
          <h4 className="mb-1 font-medium text-foreground">
            第4条（AI採点の免責）
          </h4>
          <p className="mb-3">
            AI採点の結果は参考スコアであり、最終的な判断は学習者自身が行うものとします。
          </p>
          <h4 className="mb-1 font-medium text-foreground">
            第5条（禁止事項）
          </h4>
          <p className="mb-3">
            著作権侵害、虚偽の記載、不適切なコンテンツの投稿を禁止します。違反が確認された場合、アカウントを停止する場合があります。
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="tos-accept"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
          />
          <Label htmlFor="tos-accept" className="cursor-pointer">
            上記の利用規約に同意します
          </Label>
        </div>
        <form action={action} className="w-full">
          <Button
            type="submit"
            className="w-full"
            disabled={!accepted || isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            同意して次へ
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
