import Link from "next/link";
import type { Metadata } from "next";
import { FileText, Shield, Store, Scale, BookOpen, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";

export const metadata: Metadata = {
  title: "法的情報 - 問の間",
  description: "問の間の利用規約、プライバシーポリシー、特定商取引法に基づく表記をご確認ください。",
};

const LEGAL_PAGES = [
  {
    href: "/legal/terms",
    icon: FileText,
    title: "利用規約",
    description: "本サービスの利用に関する規約です",
  },
  {
    href: "/legal/privacy",
    icon: Shield,
    title: "プライバシーポリシー",
    description: "個人情報の取扱いについてご確認ください",
  },
  {
    href: "/legal/tokushoho",
    icon: Scale,
    title: "特定商取引法に基づく表記",
    description: "事業者情報および取引条件の表示です",
  },
  {
    href: "/legal/seller-tos",
    icon: Store,
    title: "出品者利用規約",
    description: "問題セットを出品される方向けの規約です",
  },
  {
    href: "/legal/content-policy",
    icon: BookOpen,
    title: "コンテンツポリシー",
    description: "出品および利用に関するルールです",
  },
  {
    href: "/legal/refund",
    icon: RefreshCw,
    title: "返金ポリシー",
    description: "返金条件と手続きについてご確認ください",
  },
] as const;

export default function LegalIndexPage() {
  return (
    <div>
      <Breadcrumbs items={[
        { label: "ホーム", href: "/" },
        { label: "法的情報" },
      ]} />
      <h1 className="mb-2 text-2xl font-bold tracking-tight">法的情報</h1>
      <p className="mb-8 text-muted-foreground">
        問の間の利用に関する法的情報をご確認ください。
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {LEGAL_PAGES.map((page) => (
          <Link key={page.href} href={page.href} className="group">
            <Card className="transition-colors group-hover:border-primary/30">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  <page.icon className="h-4 w-4 text-foreground/60" />
                </div>
                <div>
                  <p className="font-medium group-hover:text-primary">
                    {page.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {page.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
