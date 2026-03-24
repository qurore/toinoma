import Link from "next/link";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { SiteFooter } from "@/components/navigation/site-footer";

const LEGAL_NAV = [
  { href: "/legal/terms", label: "利用規約" },
  { href: "/legal/privacy", label: "プライバシーポリシー" },
  { href: "/legal/tokushoho", label: "特定商取引法に基づく表記" },
  { href: "/legal/seller-tos", label: "出品者利用規約" },
  { href: "/legal/content-policy", label: "コンテンツポリシー" },
  { href: "/legal/refund", label: "返金ポリシー" },
] as const;

export default async function LegalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navbarData = await getNavbarData();

  return (
    <>
      <AppNavbar {...navbarData} />
      <div className="pt-14">
        <div className="container mx-auto px-4 py-8 lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
          {/* Sidebar — desktop only */}
          <aside className="hidden lg:block">
            <nav className="sticky top-20">
              <h2 className="mb-3 text-sm font-semibold text-foreground/60">
                法的情報
              </h2>
              <ul className="space-y-1">
                {LEGAL_NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
          {/* Content */}
          <main className="prose prose-sm prose-gray max-w-none">
            {children}
          </main>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
