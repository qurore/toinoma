"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import {
  ChevronDown,
  Search,
  HelpCircle,
  ShoppingCart,
  Store,
  CreditCard,
  Brain,
  UserCog,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────
// FAQ data
// ──────────────────────────────────────────────

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqCategory {
  id: string;
  title: string;
  icon: typeof ShoppingCart;
  color: string;
  items: FaqItem[];
}

const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "buyer",
    title: "購入者向け",
    icon: ShoppingCart,
    color: "text-primary",
    items: [
      {
        id: "b1",
        question: "問題セットの購入方法を教えてください。",
        answer:
          "問題セットの詳細ページにある「購入する」ボタンをクリックし、Stripeの安全な決済画面で支払いを完了してください。クレジットカード・デビットカードに対応しています。無料の問題セットは決済なしですぐにご利用いただけます。",
      },
      {
        id: "b2",
        question: "購入した問題セットはどこから確認できますか？",
        answer:
          "ダッシュボードの「購入済み」セクションから、購入済みの問題セット一覧を確認できます。購入した問題は何度でも解答・再採点が可能です。",
      },
      {
        id: "b3",
        question: "返金はできますか？",
        answer:
          "デジタルコンテンツの特性上、購入後の返金は原則としてお受けしておりません。ただし、コンテンツに重大な不備がある場合は、サポートまでお問い合わせください。詳しくは返金ポリシーをご確認ください。",
      },
      {
        id: "b4",
        question: "問題セットの検索にフィルターは使えますか？",
        answer:
          "はい。「問題を探す」ページで、科目・難易度・大学名・価格帯・評価でフィルタリングできます。キーワード検索も可能です。",
      },
    ],
  },
  {
    id: "seller",
    title: "出品者向け",
    icon: Store,
    color: "text-primary",
    items: [
      {
        id: "s1",
        question: "出品者になるにはどうすればよいですか？",
        answer:
          "「出品者モード」から出品者オンボーディングを開始してください。出品者利用規約への同意、出品者プロフィールの作成、Stripe Connectアカウントの設定の3ステップで出品者として登録できます。",
      },
      {
        id: "s2",
        question: "出品手数料はいくらですか？",
        answer:
          "プラットフォーム手数料は販売価格の15%です。Stripe決済手数料（3.6% + ¥40）はプラットフォームが負担します。残りが出品者の収益となります。",
      },
      {
        id: "s3",
        question: "収益の振込はいつ行われますか？",
        answer:
          "Stripe Connectの標準スケジュールに従い、売上確定後に自動で指定口座に振り込まれます。詳細はStripeダッシュボードでご確認いただけます。",
      },
      {
        id: "s4",
        question: "既存の入試問題をそのまま出品できますか？",
        answer:
          "いいえ。著作権の関係上、実際の入試問題をそのまま掲載することは禁止しています。オリジナルの問題、または参考にしてリライトした問題のみ出品可能です。詳しくはコンテンツポリシーをご確認ください。",
      },
    ],
  },
  {
    id: "subscription",
    title: "サブスクリプション",
    icon: CreditCard,
    color: "text-primary",
    items: [
      {
        id: "sub1",
        question: "無料プランでも利用できますか？",
        answer:
          "はい。無料プランでは月3回までAI採点をご利用いただけます。問題セットの閲覧・購入・お気に入り登録は制限なく可能です。",
      },
      {
        id: "sub2",
        question: "プランの違いは何ですか？",
        answer:
          "フリープランは月3回のAI採点、ベーシックプラン（月額498円）は月30回、プロプラン（月額1,980円）は無制限のAI採点が利用可能です。プロプランではAI学習アシスタント機能もご利用いただけます。",
      },
      {
        id: "sub3",
        question: "プランの変更はいつでもできますか？",
        answer:
          "はい。設定画面からいつでもプランを変更できます。アップグレードは即時反映、ダウングレードは次の請求期間から適用されます。",
      },
      {
        id: "sub4",
        question: "解約方法を教えてください。",
        answer:
          "設定画面の「サブスクリプション」セクションから解約できます。解約後も現在の請求期間が終了するまではプランの機能をご利用いただけます。",
      },
    ],
  },
  {
    id: "grading",
    title: "AI採点",
    icon: Brain,
    color: "text-primary",
    items: [
      {
        id: "g1",
        question: "AI採点はどのように行われますか？",
        answer:
          "出品者が設定した採点基準（ルブリック）に基づき、AIが解答を評価します。記述式・マークシート・穴埋め式の各形式に対応しています。記述式では部分点も算出されます。",
      },
      {
        id: "g2",
        question: "AI採点の精度はどのくらいですか？",
        answer:
          "AI採点は参考スコアとして提供しています。マークシート・穴埋め式は高い精度で採点されますが、記述式は人間の採点と若干異なる場合があります。最終的な判断はご自身で行ってください。",
      },
      {
        id: "g3",
        question: "手書きの解答は採点できますか？",
        answer:
          "はい。カメラで撮影した手書き解答の画像をアップロードすることで、AIが画像を解析して採点します。できるだけ鮮明に撮影してください。",
      },
    ],
  },
  {
    id: "account",
    title: "アカウント",
    icon: UserCog,
    color: "text-primary",
    items: [
      {
        id: "a1",
        question: "アカウントの作成方法を教えてください。",
        answer:
          "Google アカウントまたは X（旧Twitter）アカウントでログインするだけで自動的にアカウントが作成されます。別途パスワードの設定は不要です。",
      },
      {
        id: "a2",
        question: "プロフィールの変更方法を教えてください。",
        answer:
          "設定画面から表示名やアバター画像を変更できます。出品者の場合は出品者プロフィールも別途編集できます。",
      },
      {
        id: "a3",
        question: "アカウントを削除するにはどうすればよいですか？",
        answer:
          "設定画面の一番下にある「アカウント削除」セクションから削除できます。削除するとすべてのデータが完全に削除され、復元できません。未精算の収益がある場合は先に精算を完了してください。",
      },
      {
        id: "a4",
        question: "データのプライバシーについて教えてください。",
        answer:
          "当サービスは日本の個人情報保護法（APPI）に準拠してデータを管理しています。詳しくはプライバシーポリシーをご確認ください。解答データは暗号化して保存され、出品者が閲覧できるのは匿名化された統計情報のみです。",
      },
    ],
  },
];

// ──────────────────────────────────────────────
// Accordion item component
// ──────────────────────────────────────────────

function FaqAccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50"
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${item.id}`}
      >
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
        <span className="text-sm font-medium leading-snug">
          {item.question}
        </span>
      </button>
      <div
        id={`faq-answer-${item.id}`}
        role="region"
        className={cn(
          "grid transition-all duration-200",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <p className="px-4 pb-4 pl-11 text-sm leading-relaxed text-muted-foreground">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Page component
// ──────────────────────────────────────────────

export default function FaqPage() {
  const [search, setSearch] = useState("");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter FAQ items based on search
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return FAQ_CATEGORIES;

    const query = search.toLowerCase();
    return FAQ_CATEGORIES.map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query)
      ),
    })).filter((category) => category.items.length > 0);
  }, [search]);

  const totalResults = filteredCategories.reduce(
    (sum, c) => sum + c.items.length,
    0
  );

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "ヘルプ", href: "/help" },
          { label: "FAQ" },
        ]}
        className="mb-6"
      />

      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <HelpCircle className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          よくある質問
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          カテゴリ別に整理されたFAQをご確認ください
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="キーワードで質問を検索..."
          className="pl-10"
          aria-label="FAQ検索"
        />
        {search.trim() && (
          <p className="mt-2 text-sm text-muted-foreground">
            {totalResults}件の結果が見つかりました
          </p>
        )}
      </div>

      {/* FAQ categories */}
      {filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-3 rounded-full bg-muted p-4">
            <HelpCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-medium">該当するFAQが見つかりませんでした</p>
          <p className="mt-1 text-sm text-muted-foreground">
            キーワードを変えるか、
            <Link href="mailto:support@toinoma.jp" className="text-primary hover:underline">
              お問い合わせ
            </Link>
            ください
          </p>
          <button
            type="button"
            onClick={() => setSearch("")}
            className="mt-3 text-sm text-primary hover:underline"
          >
            検索をクリア
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredCategories.map((category) => {
            const Icon = category.icon;
            return (
              <section key={category.id} id={category.id}>
                <div className="mb-3 flex items-center gap-2">
                  <Icon className={cn("h-5 w-5", category.color)} />
                  <h2 className="text-lg font-semibold">{category.title}</h2>
                  <span className="text-sm text-muted-foreground">
                    ({category.items.length})
                  </span>
                </div>
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  {category.items.map((item) => (
                    <FaqAccordionItem
                      key={item.id}
                      item={item}
                      isOpen={openItems.has(item.id)}
                      onToggle={() => toggleItem(item.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
