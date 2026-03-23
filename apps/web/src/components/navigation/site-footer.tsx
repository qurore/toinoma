import Link from "next/link";
import { BookOpen } from "lucide-react";

const FOOTER_LINKS = {
  サービス: [
    { href: "/explore", label: "問題を探す" },
    { href: "/rankings", label: "ランキング" },
    { href: "/sell", label: "出品者モード" },
  ],
  サポート: [
    { href: "/help/faq", label: "よくある質問" },
    { href: "/help/guide", label: "ご利用ガイド" },
    { href: "/legal/content-policy", label: "コンテンツポリシー" },
  ],
  法的情報: [
    { href: "/legal/terms", label: "利用規約" },
    { href: "/legal/privacy", label: "プライバシーポリシー" },
    { href: "/legal/tokushoho", label: "特定商取引法に基づく表記" },
    { href: "/legal/seller-tos", label: "出品者利用規約" },
    { href: "/legal/refund", label: "返金ポリシー" },
  ],
} as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <div className="flex flex-col leading-none">
                <span className="font-display text-base font-bold">問の間</span>
                <span className="text-[9px] font-medium tracking-wider text-foreground/50">
                  TOINOMA
                </span>
              </div>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              AIが採点する、新しい大学受験対策のかたち。
            </p>
          </div>

          {/* Link groups */}
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <h3 className="mb-3 text-sm font-semibold">{group}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} 問の間 (Toinoma). All rights reserved.
        </div>
      </div>
    </footer>
  );
}
