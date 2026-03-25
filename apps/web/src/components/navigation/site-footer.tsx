import Link from "next/link";
import { BookOpen } from "lucide-react";

const footerLinks = {
  platform: {
    title: "プラットフォーム",
    links: [
      { label: "問題を探す", href: "/explore" },
      { label: "ランキング", href: "/rankings" },
      { label: "ヘルプ", href: "/help" },
      { label: "FAQ", href: "/help/faq" },
    ],
  },
  sellers: {
    title: "出品者向け",
    links: [
      { label: "出品者ガイド", href: "/help/seller-guide" },
      { label: "出品者になる", href: "/seller/onboarding" },
      { label: "出品者ダッシュボード", href: "/seller" },
    ],
  },
  legal: {
    title: "法的情報",
    links: [
      { label: "利用規約", href: "/legal/terms" },
      { label: "プライバシーポリシー", href: "/legal/privacy" },
      { label: "特定商取引法に基づく表記", href: "/legal/tokushoho" },
      { label: "出品者利用規約", href: "/legal/seller-tos" },
      { label: "コンテンツポリシー", href: "/legal/content-policy" },
      { label: "返金ポリシー", href: "/legal/refund" },
    ],
  },
  connect: {
    title: "つながる",
    links: [
      { label: "X (Twitter)", href: "https://x.com/toinoma", external: true },
      { label: "ヘルプセンター", href: "/help" },
    ],
  },
};

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2" aria-label="問の間 トップページ">
              <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
              <div className="flex flex-col leading-none">
                <span className="font-display text-base font-bold">問の間</span>
                <span className="text-[9px] font-medium tracking-wider text-muted-foreground">
                  TOINOMA
                </span>
              </div>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              問いと答えが出会う場所。
              <br />
              AI採点で学びが変わる。
            </p>
          </div>

          {/* Link columns */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Toinoma. 無断複写・転載を禁じます。
          </p>
          <p className="text-xs text-muted-foreground">
            AI採点は参考スコアです。最終判断は受験生ご自身で行ってください。
          </p>
        </div>
      </div>
    </footer>
  );
}
