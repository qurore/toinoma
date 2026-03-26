import { requireAdmin } from "@/lib/auth/require-seller";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { AdminMobileSidebar } from "@/components/admin/admin-mobile-sidebar";
import { AdminDesktopNav } from "@/components/admin/admin-desktop-nav";

const ADMIN_NAV = [
  { href: "/admin", label: "ダッシュボード", exact: true },
  { href: "/admin/users", label: "ユーザー管理", exact: false },
  { href: "/admin/sellers", label: "出品者管理", exact: false },
  { href: "/admin/reports", label: "報告管理", exact: false },
  { href: "/admin/refunds", label: "返金管理", exact: false },
  { href: "/admin/revenue", label: "売上レポート", exact: false },
  { href: "/admin/announcements", label: "お知らせ管理", exact: false },
  { href: "/admin/audit", label: "監査ログ", exact: false },
] as const;

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdmin();
  const navbarData = await getNavbarData();

  return (
    <>
      <AppNavbar {...navbarData} />
      <div className="pt-16 lg:grid lg:grid-cols-[220px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden border-r border-border lg:block">
          <AdminDesktopNav navItems={[...ADMIN_NAV]} />
        </aside>

        {/* Mobile sidebar (Sheet-based) */}
        <AdminMobileSidebar navItems={[...ADMIN_NAV]} />

        <main className="min-h-[calc(100vh-4rem)] p-4 md:p-6">
          {children}
          <footer className="mt-12 border-t border-border py-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <a href="/legal/terms" className="hover:text-foreground transition-colors">利用規約</a>
              <a href="/legal/privacy" className="hover:text-foreground transition-colors">プライバシー</a>
              <span className="ml-auto">&copy; {new Date().getFullYear()} Toinoma</span>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}
