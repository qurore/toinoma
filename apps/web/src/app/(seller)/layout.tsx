import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { SellerSidebar, MobileSellerNav } from "@/components/seller/seller-sidebar";

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
        - Mobile: pt-28 = navbar (h-16=64px) + mobile seller nav (h-10=40px) + gap = 112px
        - Desktop: pt-16 = navbar (h-16=64px) only, pl-60 = sidebar (w-60=240px)
      */}
      <div id="main-content" className="pt-28 md:pl-60 md:pt-16">
        {children}
      </div>
    </>
  );
}
