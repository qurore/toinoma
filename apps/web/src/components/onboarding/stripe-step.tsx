"use client";

import { useActionState } from "react";
import { initStripeConnect } from "@/app/(seller)/sell/onboarding/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreditCard, Loader2, CheckCircle2 } from "lucide-react";

export function StripeStep({
  stripeReturn,
  stripeAccountId,
}: {
  stripeReturn?: boolean;
  stripeAccountId?: string | null;
}) {
  const [, action, isPending] = useActionState(initStripeConnect, undefined);

  if (stripeReturn && stripeAccountId) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <CardTitle>Stripe連携完了</CardTitle>
          <CardDescription>
            決済の準備が整いました。問題セットの販売を始めましょう。
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button className="w-full" asChild>
            <a href="/sell">販売者ダッシュボードへ</a>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Stripe決済連携</CardTitle>
        <CardDescription>
          売上の受け取りにはStripeアカウントの連携が必要です。Stripeの画面で本人確認を完了してください。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border bg-muted/50 p-6 text-center">
          <CreditCard className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Stripeの安全な画面に移動して、本人確認と口座情報を登録します。
            <br />
            完了後、自動的にこのページに戻ります。
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <form action={action} className="w-full">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Stripe連携を開始
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
