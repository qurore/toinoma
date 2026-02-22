import { redirect } from "next/navigation";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { MobileDashboardNav } from "@/components/dashboard/mobile-nav";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navbarData = await getNavbarData();
  if (!navbarData.user) redirect("/login?next=/dashboard");

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
      <div className="pt-24 md:pl-60 md:pt-14">
        {children}
      </div>
    </>
  );
}
