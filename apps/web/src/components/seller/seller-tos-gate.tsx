"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Store,
  BookOpen,
  BarChart3,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { acceptSellerTos } from "@/app/(seller)/sell/actions";

const VALUE_PROPS = [
  {
    icon: BookOpen,
    title: "問題セットを作成・販売",
    description: "オリジナルの大学受験問題を出品して収益を得られます",
  },
  {
    icon: Sparkles,
    title: "AI採点で差別化",
    description: "記述式の部分点採点で購入者に付加価値を提供",
  },
  {
    icon: BarChart3,
    title: "販売分析で改善",
    description: "売上推移や正答率データで問題の質を向上",
  },
] as const;

export function SellerTosGate() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setIsPending(true);
    setError(null);

    const result = await acceptSellerTos();

    if (result?.error) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    // Brief celebration before transition
    setAccepted(true);
    toast.success("出品者として登録されました！");

    // Allow celebration state to render before refresh
    setTimeout(() => {
      router.refresh();
    }, 1200);
  }

  // Success state — shown briefly after acceptance
  if (accepted) {
    return (
      <main className="container mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            ようこそ、出品者モードへ！
          </h2>
          <p className="text-sm text-muted-foreground">
            ダッシュボードを準備しています...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">
              出品者として始めましょう
            </CardTitle>
            <CardDescription>
              問題セットを作成・販売して、受験生の学習をサポートしましょう
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Value propositions */}
            <div className="grid gap-3">
              {VALUE_PROPS.map((prop) => (
                <div key={prop.title} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <prop.icon className="h-4 w-4 text-foreground/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{prop.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {prop.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* ToS content — scrollable with gradient fade */}
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                出品者利用規約
              </p>
              <div className="relative">
                <div
                  className="max-h-[200px] overflow-y-auto rounded-md border border-border bg-muted/30 p-4 text-xs leading-relaxed text-foreground/80"
                  tabIndex={0}
                  role="document"
                  aria-label="出品者利用規約の内容"
                >
                  <h4 className="mb-1.5 font-semibold text-foreground">
                    第1条（目的）
                  </h4>
                  <p className="mb-2.5">
                    本規約は、問の間（以下「本サービス」）における出品者としての活動に関する条件を定めるものです。出品者は、本規約に同意することで、問題セットの作成・販売が可能になります。
                  </p>

                  <h4 className="mb-1.5 font-semibold text-foreground">
                    第2条（出品者の責任）
                  </h4>
                  <p className="mb-1.5">
                    出品者は、以下の事項を遵守するものとします。
                  </p>
                  <ul className="mb-2.5 list-inside list-disc space-y-0.5">
                    <li>出品する問題セットの内容がオリジナルであること、または適切な権利を有していること</li>
                    <li>実際の入試問題をそのまま複製して出品しないこと</li>
                    <li>正確かつ適切な採点基準（ルーブリック）を設定すること</li>
                    <li>購入者からの質問に誠実に対応すること</li>
                  </ul>

                  <h4 className="mb-1.5 font-semibold text-foreground">
                    第3条（手数料）
                  </h4>
                  <p className="mb-2.5">
                    有料問題セットの販売において、プラットフォーム手数料として販売価格の15%が差し引かれます。決済手数料はプラットフォームが負担します。売上はStripe
                    Connectを通じて出品者の登録口座に振り込まれます。
                  </p>

                  <h4 className="mb-1.5 font-semibold text-foreground">
                    第4条（コンテンツポリシー）
                  </h4>
                  <p className="mb-2.5">
                    出品者は、法令に違反するコンテンツ、著作権を侵害するコンテンツ、不適切または差別的なコンテンツを出品してはなりません。違反が確認された場合、該当コンテンツの削除およびアカウントの停止措置を行う場合があります。
                  </p>

                  <h4 className="mb-1.5 font-semibold text-foreground">
                    第5条（知的財産権）
                  </h4>
                  <p className="mb-2.5">
                    出品者が作成した問題セットの知的財産権は出品者に帰属します。ただし、本サービス上での表示・配信に必要な範囲で、プラットフォームに対して非独占的なライセンスを付与するものとします。
                  </p>

                  <h4 className="mb-1.5 font-semibold text-foreground">
                    第6条（免責事項）
                  </h4>
                  <p>
                    AI採点機能による採点結果は参考スコアであり、実際の入試採点とは異なる場合があります。採点結果に関する責任はプラットフォームが負うものではありません。
                  </p>
                </div>
                {/* Bottom gradient fade indicating more content */}
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 rounded-b-md bg-gradient-to-t from-muted/30 to-transparent" />
              </div>
            </div>

            {/* Checkbox */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="seller-tos-agree"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
                disabled={isPending}
              />
              <label
                htmlFor="seller-tos-agree"
                className="cursor-pointer text-sm leading-tight"
              >
                上記の利用規約に同意します
              </label>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  マイページに戻る
                </Link>
              </Button>
              <Button onClick={handleAccept} disabled={!agreed || isPending}>
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                同意して始める
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
