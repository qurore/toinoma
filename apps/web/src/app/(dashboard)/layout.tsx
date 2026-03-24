import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { MobileDashboardNav } from "@/components/dashboard/mobile-nav";
import { MobileAppTabBar } from "@/components/navigation/mobile-app-tab-bar";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navbarData = await getNavbarData();
  if (!navbarData.user) {
    const headerList = await headers();
    // Attempt to extract the current path from x-url (set by middleware) or referer
    const xUrl = headerList.get("x-url");
    const referer = headerList.get("referer");
    let nextPath = "/dashboard";
    if (xUrl) {
      try {
        nextPath = new URL(xUrl).pathname;
      } catch {
        // Fallback to /dashboard
      }
    } else if (referer) {
      try {
        nextPath = new URL(referer).pathname;
      } catch {
        // Fallback to /dashboard
      }
    }
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return (
    <>
      <AppNavbar {...navbarData} />
      {/* Desktop sidebar: fixed left, below navbar, hidden on mobile */}
      <DashboardSidebar />
      {/* Mobile tab bar: fixed below navbar, only on mobile (md:hidden) */}
      <MobileDashboardNav />
      {/*
        Content offset:
        - Mobile: pt-24 = navbar (h-14=56px) + mobile tab bar (h-10=40px) = 96px
        - Desktop: pt-14 = navbar (h-14=56px) only, pl-60 = sidebar (w-60=240px)
      */}
      <div id="main-content" className="pb-16 pt-24 md:pb-0 md:pl-60 md:pt-14">
        {children}
      </div>
      {/* Mobile app-level bottom tab bar */}
      <MobileAppTabBar />
    </>
  );
}
