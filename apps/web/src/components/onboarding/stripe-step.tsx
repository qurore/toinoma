"use client";

import { useActionState } from "react";
import { initStripeConnect } from "@/app/(seller)/seller/onboarding/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export function StripeStep({
  stripeReturn,
  stripeAccountId,
}: {
  stripeReturn?: boolean;
  stripeAccountId?: string | null;
}) {
  const [, action, isPending] = useActionState(initStripeConnect, undefined);

  // Handle Stripe return with error (user abandoned or Stripe failed)
  if (stripeReturn && !stripeAccountId) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Stripe連携が完了していません</CardTitle>
          <CardDescription className="text-base">
            Stripeのセットアップが中断されました。もう一度お試しください。
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-col gap-2 pt-4">
          <form action={action} className="w-full">
            <Button type="submit" className="w-full" size="lg" disabled={isPending}>
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              もう一度試す
            </Button>
          </form>
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link href="/seller">後で設定する</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (stripeReturn && stripeAccountId) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">セットアップ完了</CardTitle>
          <CardDescription className="text-base">
            すべての準備が整いました。問題セットの販売を始めましょう。
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <ul className="space-y-1.5 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <li>利用規約に同意済み</li>
            <li>販売者プロフィールを設定済み</li>
            <li>Stripe決済を連携済み</li>
          </ul>
        </CardContent>
        <CardFooter className="flex-col gap-2 pt-4">
          <Button className="w-full" size="lg" asChild>
            <Link href="/seller">ダッシュボードへ進む</Link>
          </Button>
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link href="/seller/pool/new">最初の問題を作成する</Link>
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
          売上の受け取りにはStripeアカウントの連携が必要です。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-lg border border-border bg-muted/50 p-4 text-center text-sm text-muted-foreground">
          Stripeの安全な画面で本人確認を行います。完了後、自動的にこのページに戻ります。
        </p>

        {/* Key information bullets */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>プラットフォーム手数料: 販売価格の<strong className="text-foreground">15%</strong></span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>Stripe決済手数料はプラットフォームが負担します</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>無料問題セットの出品にはStripe連携は不要です</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <form action={action} className="w-full">
          <Button type="submit" className="w-full" size="lg" disabled={isPending}>
            {isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Stripe連携を開始
          </Button>
        </form>
        <p className="text-center text-[11px] text-muted-foreground">
          無料問題のみ出品する場合は、
          <Link href="/seller" className="text-primary hover:underline">スキップ</Link>
          して後から設定できます
        </p>
      </CardFooter>
    </Card>
  );
}
