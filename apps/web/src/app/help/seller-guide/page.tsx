import Link from "next/link";
import {
  Store,
  FileText,
  ClipboardCheck,
  Banknote,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { generatePageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = generatePageMetadata(
  "出品者ガイド",
  "問の間で問題セットを出品する方法を解説。出品者登録・問題作成・ルブリック設定・価格設定まで、ステップバイステップで紹介します。",
  { pathname: "/help/seller-guide" }
);

// ──────────────────────────────────────────────
// Onboarding steps data
// ──────────────────────────────────────────────

const ONBOARDING_STEPS = [
  {
    step: 1,
    title: "出品者利用規約に同意",
    description:
      "出品者としての責任や権利について記載された利用規約をご確認いただき、同意してください。コンテンツの著作権やプラットフォームルールについての重要な情報が含まれています。",
    icon: ClipboardCheck,
  },
  {
    step: 2,
    title: "出品者プロフィールを作成",
    description:
      "出品者名・自己紹介・所属大学・サークル名などを登録します。購入者に信頼性を伝えるため、できるだけ詳しく記入することをおすすめします。",
    icon: FileText,
  },
  {
    step: 3,
    title: "Stripe Connectで収益受取設定",
    description:
      "Stripeの安全な本人確認プロセスを完了し、収益の受取口座を登録します。本人確認書類（運転免許証またはマイナンバーカード）が必要です。",
    icon: Banknote,
  },
];

// ──────────────────────────────────────────────
// Best practices data
// ──────────────────────────────────────────────

const CREATION_TIPS = [
  {
    title: "問題の構成",
    items: [
      "大問ごとにセクションを分け、小問に番号をつける",
      "配点を明示し、合計点がわかるようにする",
      "問題文は簡潔かつ正確に記述する",
      "解答に必要な情報が過不足なく含まれているか確認する",
    ],
  },
  {
    title: "ルブリック（採点基準）の作成",
    items: [
      "各小問に対して具体的な採点要素を設定する",
      "部分点の基準を明確に記述する（「〜に言及していれば○点」）",
      "模範解答を必ず設定する",
      "記述式は3〜5つの採点要素に分割するのが効果的",
    ],
  },
  {
    title: "PDFの品質",
    items: [
      "高解像度でスキャン（300dpi以上推奨）",
      "文字がはっきり読める品質を確保",
      "A4サイズに統一すると見やすい",
      "図表がある場合は適切な大きさで配置",
    ],
  },
];

const PRICING_STRATEGIES = [
  {
    range: "無料",
    description: "サンプル問題や販促用。フォロワー獲得に効果的。",
    useCase: "最初の1〜2セットを無料公開して信頼を構築",
  },
  {
    range: "¥100〜300",
    description: "小規模な問題セット（1〜3問）向け。",
    useCase: "単元別の演習問題、基礎〜標準レベル",
  },
  {
    range: "¥300〜800",
    description: "標準的な問題セット（5〜10問）向け。",
    useCase: "分野別の実力テスト、模試形式",
  },
  {
    range: "¥800〜1,500",
    description: "大規模・高品質な問題セット向け。",
    useCase: "総合模試、予想問題集、詳細な解説付き",
  },
];

const SELLER_FAQ = [
  {
    question: "出品した問題セットの修正はできますか？",
    answer:
      "はい。出品者ダッシュボードから問題セットの内容・ルブリック・価格をいつでも編集できます。ただし、すでに購入者がいる場合は大幅な変更にご注意ください。",
  },
  {
    question: "売上はいつ受け取れますか？",
    answer:
      "Stripe Connectの標準スケジュールに従い、売上確定後に自動振込されます。日本では通常1〜2週間程度です。",
  },
  {
    question: "手数料の内訳を教えてください。",
    answer:
      "販売価格の15%がプラットフォーム手数料です。Stripe決済手数料（3.6% + ¥40）はプラットフォームが負担しますので、出品者の負担は15%のみです。",
  },
  {
    question: "著作権侵害の報告を受けた場合はどうなりますか？",
    answer:
      "報告内容を確認の上、該当コンテンツの非公開措置を行う場合があります。異議がある場合は申し立てが可能です。繰り返し違反があった場合はアカウント停止の対象となります。",
  },
  {
    question: "出品を取り下げることはできますか？",
    answer:
      "はい。出品者ダッシュボードから問題セットのステータスを「下書き」に変更することで、マーケットプレイスから非表示にできます。既存の購入者は引き続きアクセス可能です。",
  },
];

// ──────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────

export default function SellerGuidePage() {
  return (
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-4 sm:px-6">
        <Breadcrumbs
          items={[
            { label: "ホーム", href: "/" },
            { label: "ヘルプ", href: "/help" },
            { label: "出品者ガイド" },
          ]}
          className="mb-6"
        />

        {/* Hero */}
        <div className="mb-10">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Store className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">出品者ガイド</h1>
          <p className="mt-2 text-muted-foreground">
            問の間で問題セットを出品・販売する方法をステップバイステップで解説します
          </p>
        </div>

        {/* ──── Section 1: Getting started ──── */}
        <section className="mb-12">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
            <BookOpen className="h-5 w-5 text-primary" />
            出品者になるまでの3ステップ
          </h2>

          <div className="space-y-4">
            {ONBOARDING_STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <Card key={step.step}>
                  <CardContent className="flex gap-4 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          ステップ {step.step}
                        </Badge>
                        <h3 className="font-semibold">{step.title}</h3>
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                    {idx < ONBOARDING_STEPS.length - 1 && (
                      <ArrowRight className="mt-3 hidden h-4 w-4 shrink-0 rotate-90 text-muted-foreground sm:block" />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 text-center">
            <Button asChild>
              <Link href="/seller/onboarding">
                <Store className="h-4 w-4" />
                出品者登録を始める
              </Link>
            </Button>
          </div>
        </section>

        <Separator className="my-10" />

        {/* ──── Section 2: Problem creation best practices ──── */}
        <section className="mb-12">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
            <Lightbulb className="h-5 w-5 text-primary" />
            問題作成のベストプラクティス
          </h2>

          <div className="space-y-6">
            {CREATION_TIPS.map((tip) => (
              <Card key={tip.title}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{tip.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {tip.items.map((item, idx) => (
                      <li key={idx} className="flex gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="my-10" />

        {/* ──── Section 3: Pricing strategies ──── */}
        <section className="mb-12">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
            <Banknote className="h-5 w-5 text-primary" />
            価格設定のヒント
          </h2>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {PRICING_STRATEGIES.map((strategy) => (
                  <div key={strategy.range} className="flex gap-4 p-4">
                    <div className="w-28 shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {strategy.range}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {strategy.description}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        例: {strategy.useCase}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="mt-4 flex gap-2 rounded-lg border border-border bg-muted/50 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm text-foreground/80">
              価格は販売開始後も変更可能です。まずは低めの価格で始めて、レビューや実績に応じて調整するのがおすすめです。
            </p>
          </div>
        </section>

        <Separator className="my-10" />

        {/* ──── Section 4: Fee structure ──── */}
        <section className="mb-12">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
            <Banknote className="h-5 w-5 text-primary" />
            手数料について
          </h2>

          <Card>
            <CardContent className="p-5">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      プラットフォーム手数料
                    </p>
                    <p className="text-2xl font-bold">15%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Stripe決済手数料
                    </p>
                    <p className="text-2xl font-bold">
                      0%
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        （プラットフォーム負担）
                      </span>
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <p className="mb-2 text-sm font-medium">計算例</p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>販売価格</span>
                      <span className="font-medium text-foreground">
                        ¥1,000
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>プラットフォーム手数料（15%）</span>
                      <span>-¥150</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-medium text-foreground">
                      <span>出品者の受取額</span>
                      <span className="text-primary">¥850</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator className="my-10" />

        {/* ──── Section 5: Seller FAQ ──── */}
        <section className="mb-12">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
            <Store className="h-5 w-5 text-primary" />
            出品者よくある質問
          </h2>

          <div className="space-y-4">
            {SELLER_FAQ.map((faq, idx) => (
              <Card key={idx}>
                <CardContent className="p-5">
                  <h3 className="mb-2 text-sm font-semibold">{faq.question}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {faq.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold">
              あなたの問題を待っている学生がいます
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              問の間で問題セットを出品し、受験生の学習をサポートしましょう
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/seller/onboarding">
                  <Store className="h-4 w-4" />
                  出品者登録を始める
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/help/faq#seller">
                  出品者向けFAQを見る
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
