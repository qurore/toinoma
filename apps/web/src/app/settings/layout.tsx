import { redirect } from "next/navigation";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";

const TIER_LABELS: Record<string, string> = {
  free: "フリー",
  basic: "ベーシック",
  pro: "プロ",
};

export default async function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navbarData = await getNavbarData();
  if (!navbarData.user) redirect("/login?next=/settings/profile");

  const tierLabel = TIER_LABELS[navbarData.subscriptionTier] ?? "フリー";

  return (
    <>
      <AppNavbar {...navbarData} />
      <div className="pt-14">
        {/* Mobile top nav — horizontal tab bar, visible only on small screens */}
        <div className="border-b border-border md:hidden">
          <div className="mx-auto max-w-5xl px-4 py-2">
            <SettingsSidebar isSeller={navbarData.isSeller} horizontal />
          </div>
        </div>

        {/* Desktop layout — sidebar + content */}
        <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-5xl px-4 sm:px-6">
          {/* Desktop sidebar — hidden on mobile */}
          <aside className="hidden w-56 shrink-0 border-r border-border py-8 pr-4 md:block">
            {/* User identity header */}
            <div className="mb-6 flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {(navbarData.displayName ?? navbarData.user.email ?? "?")
                  .split(/[\s@]/)
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {navbarData.displayName ?? navbarData.user.email}
                </p>
                <p className="text-xs text-muted-foreground">{tierLabel}プラン</p>
              </div>
            </div>

            <SettingsSidebar isSeller={navbarData.isSeller} />
          </aside>

          {/* Content */}
          <main className="flex-1 py-8 md:pl-8">{children}</main>
        </div>
      </div>
    </>
  );
}
