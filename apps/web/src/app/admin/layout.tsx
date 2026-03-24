import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import {
  LayoutDashboard,
  Users,
  Flag,
  DollarSign,
  Megaphone,
  ClipboardList,
  Undo2,
} from "lucide-react";

const ADMIN_NAV = [
  { href: "/admin", label: "ダッシュボード", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "ユーザー管理", icon: Users, exact: false },
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check admin flag
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  // is_admin may not exist yet in types — gracefully handle
  const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin;
  if (!isAdmin) redirect("/dashboard");

  const navbarData = await getNavbarData();

  return (
    <>
      <AppNavbar {...navbarData} />
      <div className="pt-14 lg:grid lg:grid-cols-[220px_1fr]">
        <aside className="hidden border-r border-border lg:block">
          <nav className="sticky top-14 px-3 py-4">
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
        <main className="min-h-[calc(100vh-3.5rem)] p-6">{children}</main>
      </div>
    </>
  );
}
