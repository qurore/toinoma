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
        - Mobile: pt-24 = navbar (h-14=56px) + mobile tab bar (h-10=40px) = 96px
        - Desktop: pt-14 = navbar (h-14=56px) only, pl-60 = sidebar (w-60=240px)
      */}
      <div className="pt-24 md:pl-60 md:pt-14">
        {children}
      </div>
    </>
  );
}
