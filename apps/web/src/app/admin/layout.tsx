import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-seller";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { AdminMobileSidebar } from "@/components/admin/admin-mobile-sidebar";
import {
  LayoutDashboard,
  Users,
  Flag,
  DollarSign,
  Megaphone,
  ClipboardList,
  Undo2,
  Store,
} from "lucide-react";

const ADMIN_NAV = [
  { href: "/admin", label: "ダッシュボード", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "ユーザー管理", icon: Users, exact: false },
  { href: "/admin/sellers", label: "出品者管理", icon: Store, exact: false },
  { href: "/admin/reports", label: "報告管理", icon: Flag, exact: false },
  { href: "/admin/refunds", label: "返金管理", icon: Undo2, exact: false },
  { href: "/admin/revenue", label: "売上レポート", icon: DollarSign, exact: false },
  { href: "/admin/announcements", label: "お知らせ管理", icon: Megaphone, exact: false },
  { href: "/admin/audit", label: "監査ログ", icon: ClipboardList, exact: false },
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
          <nav className="sticky top-16 px-3 py-4">
            <h2 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              管理者メニュー
            </h2>
            <ul className="space-y-0.5">
              {ADMIN_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
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
