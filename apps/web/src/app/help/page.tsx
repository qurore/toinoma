import Link from "next/link";
import {
  ShoppingCart,
  Store,
  CreditCard,
  Brain,
  UserCog,
  HelpCircle,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { generatePageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = generatePageMetadata(
  "ヘルプセンター",
  "問の間のご利用ガイド・よくある質問。購入者・出品者向けのサポート情報をまとめています。",
  { pathname: "/help" }
);

// ──────────────────────────────────────────────
// Category data
// ──────────────────────────────────────────────

const HELP_CATEGORIES = [
  {
    id: "buyer",
    icon: ShoppingCart,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    title: "購入者向け",
    description: "問題セットの探し方・購入・解答方法について",
    href: "/help/faq#buyer",
    items: [
      "問題セットの探し方",
      "購入方法と支払い",
      "解答の提出とAI採点",
    ],
  },
  {
    id: "seller",
    icon: Store,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    title: "出品者向け",
    description: "出品方法・ルブリック作成・収益について",
    href: "/help/faq#seller",
    items: [
      "出品者になるには",
      "問題セットの作成",
      "収益の受け取り",
    ],
  },
  {
    id: "subscription",
    icon: CreditCard,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    title: "サブスクリプション",
    description: "プランの選び方・変更・解約について",
    href: "/help/faq#subscription",
    items: [
      "プランの比較",
      "プラン変更方法",
      "解約について",
    ],
  },
  {
    id: "grading",
    icon: Brain,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    title: "AI採点",
    description: "AI採点の仕組み・精度・対象科目について",
    href: "/help/faq#grading",
    items: [
      "AI採点の仕組み",
      "採点精度について",
      "部分点の算出",
    ],
  },
  {
    id: "account",
    icon: UserCog,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    title: "アカウント",
    description: "アカウント設定・プロフィール・退会について",
    href: "/help/faq#account",
    items: [
      "プロフィール編集",
      "パスワード変更",
      "アカウント削除",
    ],
  },
] as const;

// ──────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────

export default function HelpPage() {
  return (
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-4 sm:px-6">
        {/* Hero */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <HelpCircle className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            ヘルプセンター
          </h1>
          <p className="mt-2 text-muted-foreground">
            問の間の使い方やよくある質問をまとめています
          </p>
        </div>

        {/* Quick links */}
        <div className="mb-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/help/faq"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <BookOpen className="h-4 w-4" />
            よくある質問（FAQ）
          </Link>
          <Link
            href="/help/seller-guide"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Store className="h-4 w-4" />
            出品者ガイド
          </Link>
        </div>

        {/* Category cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HELP_CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <Link key={category.id} href={category.href} className="group">
                <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${category.bgColor}`}
                      >
                        <Icon className={`h-5 w-5 ${category.color}`} />
                      </div>
                      <div className="flex-1">
                        <h2 className="font-semibold group-hover:text-primary">
                          {category.title}
                        </h2>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="mb-3 text-sm text-muted-foreground">
                      {category.description}
                    </p>
                    <ul className="space-y-1">
                      {category.items.map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-2 text-xs text-muted-foreground"
                        >
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Contact section */}
        <div className="mt-12 rounded-xl border border-border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold">
            お探しの情報が見つかりませんか？
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            上記のヘルプで解決できない場合は、お気軽にお問い合わせください。
          </p>
          <Link
            href="mailto:support@toinoma.jp"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            お問い合わせ
          </Link>
        </div>
      </div>
  );
}
