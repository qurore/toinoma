import Link from "next/link";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { SellerSidebar, MobileSellerNav } from "@/components/seller/seller-sidebar";
import { MobileAppTabBar } from "@/components/navigation/mobile-app-tab-bar";

import { requireAuth } from "@/lib/auth/require-seller";

export default async function SellerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Only require authentication — ToS check is handled at page level
  await requireAuth();
  const navbarData = await getNavbarData();

  return (
    <>
      <AppNavbar {...navbarData} />
      {/* Desktop sidebar: fixed left, below navbar, hidden on mobile */}
      <SellerSidebar />
      {/* Mobile tab bar: fixed below navbar, only on mobile (md:hidden) */}
      <MobileSellerNav />
      {/*
        Content offset:
        - Mobile: pt-28 (7rem = 112px) = navbar (h-16=64px) + mobile seller nav (h-12=48px) = 112px
        - Desktop: pt-16 = navbar (h-16=64px) only, pl-60 = sidebar (w-60=240px)
      */}
      <main id="main-content" className="min-h-[calc(100vh-4rem)] pb-20 pt-28 md:pb-0 md:pl-60 md:pt-16">
        {children}
        {/* Compact footer for link discoverability in sidebar layouts */}
        <footer className="mt-12 border-t border-border px-4 py-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">利用規約</Link>
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">プライバシー</Link>
            <Link href="/legal/seller-tos" className="hover:text-foreground transition-colors">出品者規約</Link>
            <Link href="/help/seller-guide" className="hover:text-foreground transition-colors">出品ガイド</Link>
            <span className="ml-auto">&copy; {new Date().getFullYear()} Toinoma</span>
          </div>
        </footer>
      </main>
      <MobileAppTabBar />
    </>
  );
}
